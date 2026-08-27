import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/invite_service.dart';
import '../../domain/invite_share.dart';

/// 친구초대 페이지
class InviteFriendsPage extends ConsumerStatefulWidget {
  const InviteFriendsPage({super.key});

  @override
  ConsumerState<InviteFriendsPage> createState() => _InviteFriendsPageState();
}

class _InviteFriendsPageState extends ConsumerState<InviteFriendsPage> {
  final _inviteService = InviteService();
  final _enterCodeController = TextEditingController();

  bool _isLoading = true;
  bool _applyLoading = false;
  String _inviteCode = '';
  int _inviteCount = 0;
  int _earnedPoints = 0;
  int _rewardAmount = 1000;
  int _inviteeRewardAmount = 1000;
  bool _canApplyInvite = false;
  String? _applyError;
  String? _applyMsg;

  @override
  void initState() {
    super.initState();
    _loadInviteInfo();
  }

  @override
  void dispose() {
    _enterCodeController.dispose();
    super.dispose();
  }

  Future<void> _loadInviteInfo() async {
    setState(() => _isLoading = true);
    try {
      final info = await _inviteService.getInviteInfo();
      if (!mounted) return;
      setState(() {
        _inviteCode = info.inviteCode;
        _inviteCount = info.inviteCount;
        _earnedPoints = info.earnedPoints;
        _rewardAmount = info.rewardAmount;
        _inviteeRewardAmount = info.inviteeRewardAmount;
        _canApplyInvite = info.canApplyInvite;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red.shade400,
        ),
      );
    }
  }

  String get _shareText => buildInviteShareText(
        inviteCode: _inviteCode,
        rewardAmount: _rewardAmount,
        inviteeRewardAmount: _inviteeRewardAmount,
      );

  Future<void> _copyCode() async {
    if (_inviteCode.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: _inviteCode));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('초대 코드가 복사되었습니다'),
        backgroundColor: Color(0xFF00C896),
      ),
    );
  }

  Future<void> _shareInvite() async {
    if (_inviteCode.isEmpty) return;

    final box = context.findRenderObject() as RenderBox?;
    try {
      await Share.share(
        _shareText,
        subject: '모두의수선 초대',
        sharePositionOrigin: box != null
            ? box.localToGlobal(Offset.zero) & box.size
            : null,
      );
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: _shareText));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('초대 메시지가 복사되었습니다. 카카오톡에 붙여넣어 보내주세요.'),
          backgroundColor: Color(0xFF00C896),
        ),
      );
    }
  }

  Future<void> _applyCode() async {
    final code = normalizeInviteCode(_enterCodeController.text);
    if (code.isEmpty) {
      setState(() => _applyError = '초대 코드를 입력해주세요.');
      return;
    }

    setState(() {
      _applyLoading = true;
      _applyError = null;
      _applyMsg = null;
    });

    try {
      final result = await _inviteService.applyInviteCode(code);
      if (!mounted) return;
      if (result.ok) {
        setState(() {
          _applyMsg = result.inviteeAmount > 0
              ? '초대 코드가 적용되었습니다. ${_formatPoints(result.inviteeAmount)}P가 적립됐어요.'
              : '초대 코드가 적용되었습니다.';
          _canApplyInvite = false;
          _enterCodeController.clear();
        });
        await _loadInviteInfo();
        return;
      }

      setState(() {
        _applyError = switch (result.reason) {
          'invalid_code' => '유효하지 않은 초대 코드입니다.',
          'self_invite' => '본인 초대 코드는 사용할 수 없습니다.',
          'already_applied' => '이미 초대 코드가 적용된 계정입니다.',
          _ => '초대 코드 적용에 실패했습니다.',
        };
        if (result.reason == 'already_applied') {
          _canApplyInvite = false;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _applyError = '네트워크 오류가 발생했습니다.');
    } finally {
      if (mounted) setState(() => _applyLoading = false);
    }
  }

  String _formatPoints(int amount) {
    return amount.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (match) => '${match[1]},',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: const ModoAppBar(
        title: Text('친구초대'),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF00C896), Color(0xFF00A67C)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.card_giftcard,
                        size: 50,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      '친구 초대하고\n함께 혜택 받기',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '친구가 가입하면 서로 적립! (나 ${_formatPoints(_rewardAmount)}P · 친구 ${_formatPoints(_inviteeRewardAmount)}P)',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),

              if (_canApplyInvite)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '초대 코드 입력',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '코드를 입력하면 ${_formatPoints(_inviteeRewardAmount)}P가 적립됩니다',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _enterCodeController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: '초대 코드',
                          prefixIcon: Icon(
                            Icons.confirmation_number_outlined,
                            color: Colors.grey.shade400,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF00C896)),
                          ),
                        ),
                        onChanged: (_) {
                          if (_applyError != null || _applyMsg != null) {
                            setState(() {
                              _applyError = null;
                              _applyMsg = null;
                            });
                          }
                        },
                      ),
                      if (_applyError != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _applyError!,
                          style: const TextStyle(fontSize: 12, color: Colors.red),
                        ),
                      ],
                      if (_applyMsg != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _applyMsg!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF00C896),
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _applyLoading ? null : _applyCode,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00C896),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(_applyLoading ? '적용 중...' : '코드 적용하기'),
                        ),
                      ),
                    ],
                  ),
                ),

              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Text(
                      '내 초대 코드',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF00C896),
                          width: 2,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_isLoading)
                            const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          else
                            Text(
                              _inviteCode.isEmpty ? '---' : _inviteCode,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'monospace',
                                letterSpacing: 2,
                                color: Colors.black87,
                              ),
                            ),
                          const SizedBox(width: 16),
                          InkWell(
                            onTap: _inviteCode.isEmpty ? null : _copyCode,
                            child: Icon(
                              Icons.copy_rounded,
                              color: _inviteCode.isEmpty
                                  ? Colors.grey.shade400
                                  : const Color(0xFF00C896),
                              size: 24,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _inviteCode.isEmpty ? null : _shareInvite,
                        icon: const Icon(Icons.share),
                        label: const Text('친구에게 공유하기'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00C896),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor:
                              const Color(0xFF00C896).withOpacity(0.4),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '초대 현황',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade800,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            '초대한 친구',
                            '$_inviteCount명',
                            Icons.people_outline,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildStatCard(
                            '받은 적립금',
                            '${_formatPoints(_earnedPoints)}P',
                            Icons.payments_outlined,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                margin: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '이용 안내',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '• 친구가 내 초대 코드로 가입하면 ${_formatPoints(_rewardAmount)}P가 적립됩니다\n'
                      '• 가입 시 또는 마이페이지 → 친구 초대에서 코드를 입력할 수 있습니다\n'
                      '• 적립금은 마이페이지 포인트에서 확인할 수 있습니다\n'
                      '• 부정 이용 시 적립금이 회수될 수 있습니다',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.5,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF00C896).withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFF00C896), size: 28),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
