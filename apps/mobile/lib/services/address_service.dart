import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logger/logger.dart';

/// 배송지 관리 서비스
class AddressService {
  final _supabase = Supabase.instance.client;
  final _logger = Logger();

  /// 배송지 목록 조회
  Future<List<Map<String, dynamic>>> getAddresses() async {
    try {
      final response = await _supabase
          .from('addresses')
          .select()
          .order('is_default', ascending: false)
          .order('created_at', ascending: false);

      _logger.i('✅ 배송지 목록 조회 성공: ${response.length}개');
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      _logger.e('❌ 배송지 목록 조회 실패: $e');
      rethrow;
    }
  }

  /// 배송지 추가
  Future<Map<String, dynamic>> addAddress({
    required String label,
    required String recipientName,
    required String recipientPhone,
    required String zipcode,
    required String address,
    String? addressDetail,
    required bool isDefault,
  }) async {
    try {
      final data = {
        'label': label.isEmpty ? null : label,
        'recipient_name': recipientName,
        'recipient_phone': recipientPhone,
        'zipcode': zipcode,
        'address': address,
        'address_detail': addressDetail,
        'is_default': isDefault,
      };

      final response = await _supabase
          .from('addresses')
          .insert(data)
          .select()
          .single();

      _logger.i('✅ 배송지 추가 성공: ${response['id']}');
      return response;
    } catch (e) {
      _logger.e('❌ 배송지 추가 실패: $e');
      rethrow;
    }
  }

  /// 배송지 수정
  Future<Map<String, dynamic>> updateAddress({
    required String addressId,
    String? label,
    String? recipientName,
    String? recipientPhone,
    String? zipcode,
    String? address,
    String? addressDetail,
    bool? isDefault,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (label != null) data['label'] = label.isEmpty ? null : label;
      if (recipientName != null) data['recipient_name'] = recipientName;
      if (recipientPhone != null) data['recipient_phone'] = recipientPhone;
      if (zipcode != null) data['zipcode'] = zipcode;
      if (address != null) data['address'] = address;
      if (addressDetail != null) data['address_detail'] = addressDetail;
      if (isDefault != null) data['is_default'] = isDefault;

      final response = await _supabase
          .from('addresses')
          .update(data)
          .eq('id', addressId)
          .select()
          .single();

      _logger.i('✅ 배송지 수정 성공: $addressId');
      return response;
    } catch (e) {
      _logger.e('❌ 배송지 수정 실패: $e');
      rethrow;
    }
  }

  /// 배송지 삭제
  Future<void> deleteAddress(String addressId) async {
    try {
      await _supabase
          .from('addresses')
          .delete()
          .eq('id', addressId);

      _logger.i('✅ 배송지 삭제 성공: $addressId');
    } catch (e) {
      _logger.e('❌ 배송지 삭제 실패: $e');
      rethrow;
    }
  }

  /// 기본 배송지 설정
  Future<void> setDefaultAddress(String addressId) async {
    try {
      await updateAddress(
        addressId: addressId,
        isDefault: true,
      );
      _logger.i('✅ 기본 배송지 설정 성공: $addressId');
    } catch (e) {
      _logger.e('❌ 기본 배송지 설정 실패: $e');
      rethrow;
    }
  }

  /// 기본 배송지 조회
  Future<Map<String, dynamic>?> getDefaultAddress() async {
    try {
      final response = await _supabase
          .from('addresses')
          .select()
          .eq('is_default', true)
          .maybeSingle();

      if (response != null) {
        _logger.i('✅ 기본 배송지 조회 성공');
      }
      return response;
    } catch (e) {
      _logger.e('❌ 기본 배송지 조회 실패: $e');
      return null;
    }
  }

  /// 현재 사용자의 user_id 가져오기
  Future<String?> _getCurrentUserId() async {
    try {
      final authId = _supabase.auth.currentUser?.id;
      if (authId == null) {
        _logger.w('⚠️ 로그인된 사용자가 없습니다');
        return null;
      }

      // RLS 정책 우회: auth_id를 직접 사용하여 user_id 조회
      final response = await _supabase
          .rpc('get_user_id_by_auth_id', params: {'auth_user_id': authId});

      if (response == null) {
        _logger.w('⚠️ user_id를 찾을 수 없습니다. auth_id: $authId');
        return null;
      }

      return response as String;
    } catch (e) {
      _logger.e('❌ user_id 조회 실패: $e');
      // RPC 함수가 없는 경우 대체 방법
      try {
        final authId = _supabase.auth.currentUser?.id;
        if (authId == null) return null;
        
        final response = await _supabase
            .from('users')
            .select('id')
            .eq('auth_id', authId as Object)
            .maybeSingle();
        
        return response?['id'] as String?;
      } catch (e2) {
        _logger.e('❌ 대체 방법도 실패: $e2');
        return null;
      }
    }
  }
}

