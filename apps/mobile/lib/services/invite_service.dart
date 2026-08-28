import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/profile/domain/invite_stash.dart';

class InviteInfo {
  const InviteInfo({
    required this.inviteCode,
    required this.inviteCount,
    required this.earnedPoints,
    required this.rewardAmount,
    required this.inviteeRewardAmount,
    required this.canApplyInvite,
  });

  final String inviteCode;
  final int inviteCount;
  final int earnedPoints;
  final int rewardAmount;
  final int inviteeRewardAmount;
  final bool canApplyInvite;
}

class InviteApplyResult {
  const InviteApplyResult({
    required this.ok,
    this.reason,
    this.inviteeAmount = 0,
  });

  final bool ok;
  final String? reason;
  final int inviteeAmount;
}

/// 친구 초대 코드 조회·적용 (웹 `/api/invite` 와 동일 RPC)
class InviteService {
  InviteService({SupabaseClient? client})
      : _supabase = client ?? Supabase.instance.client;

  final SupabaseClient _supabase;

  Future<String?> _currentUserRowId() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;
    final row = await _supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();
    return row?['id'] as String?;
  }

  Future<InviteInfo> getInviteInfo() async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      throw Exception('로그인이 필요합니다');
    }

    final row = await _supabase
        .from('users')
        .select(
          'id, invite_code, invite_count, invite_points_earned, invited_by, invite_rewarded_at',
        )
        .eq('auth_id', user.id)
        .maybeSingle();

    if (row == null) {
      throw Exception('사용자 정보를 찾을 수 없습니다');
    }

    var inviteCode = (row['invite_code'] as String?)?.trim() ?? '';
    if (inviteCode.isEmpty) {
      final code = await _supabase.rpc(
        'ensure_user_invite_code',
        params: {'p_user_id': row['id']},
      );
      inviteCode = (code as String?)?.trim() ?? '';
    }

    final settings = await _supabase
        .from('invite_settings')
        .select('invite_reward_amount, invitee_reward_amount')
        .eq('id', 1)
        .maybeSingle();

    return InviteInfo(
      inviteCode: inviteCode.toUpperCase(),
      inviteCount: (row['invite_count'] as num?)?.toInt() ?? 0,
      earnedPoints: (row['invite_points_earned'] as num?)?.toInt() ?? 0,
      rewardAmount: (settings?['invite_reward_amount'] as num?)?.toInt() ?? 1000,
      inviteeRewardAmount:
          (settings?['invitee_reward_amount'] as num?)?.toInt() ?? 1000,
      canApplyInvite: row['invited_by'] == null && row['invite_rewarded_at'] == null,
    );
  }

  Future<InviteApplyResult> applyInviteCode(String code) async {
    final userId = await _currentUserRowId();
    if (userId == null) {
      throw Exception('로그인이 필요합니다');
    }

    try {
      final response = await _supabase.rpc(
        'apply_invite_on_signup',
        params: {
          'p_invitee_user_id': userId,
          'p_invite_code': code,
        },
      );

      if (response is! Map) {
        return const InviteApplyResult(ok: false, reason: 'server_error');
      }

      final data = Map<String, dynamic>.from(response);
      return InviteApplyResult(
        ok: data['ok'] == true,
        reason: data['reason'] as String?,
        inviteeAmount: (data['invitee_amount'] as num?)?.toInt() ?? 0,
      );
    } catch (e) {
      debugPrint('초대 코드 적용 실패: $e');
      return const InviteApplyResult(ok: false, reason: 'server_error');
    }
  }

  /// 가입·OAuth 후 스태시된 초대 코드를 적용한다. 웹 `applyStashedInviteCode`와 동일.
  Future<InviteApplyResult?> applyStashedInviteCode() async {
    final code = await readStashedInviteCode();
    if (code.isEmpty) return null;

    final result = await applyInviteCode(code);
    if (shouldClearInviteStash(ok: result.ok, reason: result.reason)) {
      await clearStashedInviteCode();
    }
    return result;
  }
}
