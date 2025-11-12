import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 배송지 설정 페이지
class AddressesPage extends ConsumerStatefulWidget {
  const AddressesPage({super.key});

  @override
  ConsumerState<AddressesPage> createState() => _AddressesPageState();
}

class _AddressesPageState extends ConsumerState<AddressesPage> {
  // Mock 배송지 데이터 (State로 관리)
  List<Map<String, dynamic>> _addresses = [
      {
        'id': '1',
        'label': '집',
        'name': '홍길동',
        'phone': '010-1234-5678',
        'address': '서울시 강남구 테헤란로 123',
        'detail': '101동 1001호',
        'zipcode': '06234',
        'isDefault': true,
      },
      {
        'id': '2',
        'label': '회사',
        'name': '홍길동',
        'phone': '010-1234-5678',
        'address': '서울시 송파구 올림픽로 300',
        'detail': '5층',
        'zipcode': '05551',
        'isDefault': false,
      },
    ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('배송지 설정'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // 안내 메시지
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.blue.shade50,
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '수거지와 배송지를 미리 등록해두면 더 편리합니다',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.blue.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // 배송지 목록
          Expanded(
            child: _addresses.isEmpty
                ? _buildEmptyState(context)
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _addresses.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final address = _addresses[index];
                      return _buildAddressCard(context, address, index);
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push<bool>('/profile/addresses/add');
          if (result == true && mounted) {
            _refreshAddresses();
          }
        },
        backgroundColor: const Color(0xFF00C896),
        icon: const Icon(Icons.add),
        label: const Text('배송지 추가'),
      ),
    );
  }

  /// 배송지 목록 새로고침
  void _refreshAddresses() {
    // TODO: Supabase에서 다시 가져오기
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('배송지 목록이 업데이트되었습니다'),
        backgroundColor: Color(0xFF00C896),
        duration: Duration(seconds: 1),
      ),
    );
  }

  /// 빈 상태 UI
  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.location_off_outlined,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            '등록된 배송지가 없습니다',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '배송지를 추가해주세요',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressCard(BuildContext context, Map<String, dynamic> address, int index) {
    final isDefault = address['isDefault'] as bool;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDefault 
              ? const Color(0xFF00C896)
              : Colors.grey.shade200,
          width: isDefault ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 헤더
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDefault 
                      ? const Color(0xFF00C896)
                      : Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  address['label'] as String,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isDefault ? Colors.white : Colors.grey.shade700,
                  ),
                ),
              ),
              if (isDefault) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    '기본 배송지',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF00C896),
                    ),
                  ),
                ),
              ],
              const Spacer(),
              IconButton(
                icon: Icon(Icons.edit_outlined, size: 20, color: Colors.grey.shade600),
                onPressed: () => _editAddress(context, address, index),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                onPressed: () => _deleteAddress(context, address, index),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // 수령인 정보
          _buildInfoRow(Icons.person_outline, address['name'] as String),
          const SizedBox(height: 8),
          _buildInfoRow(Icons.phone_outlined, address['phone'] as String),
          const SizedBox(height: 8),
          _buildInfoRow(
            Icons.location_on_outlined,
            '${address['address']}\n${address['detail']}',
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade800,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }

  /// 배송지 수정
  Future<void> _editAddress(
    BuildContext context,
    Map<String, dynamic> address,
    int index,
  ) async {
    final result = await context.push<bool>(
      '/profile/addresses/add',
      extra: address,
    );
    
    if (result == true && mounted) {
      setState(() {
        // Mock: 기존 주소를 업데이트
        _addresses[index] = {
          ..._addresses[index],
          'name': '김철수', // Mock 수정 데이터
        };
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('배송지가 수정되었습니다'),
          backgroundColor: Color(0xFF00C896),
        ),
      );
    }
  }

  /// 배송지 삭제
  Future<void> _deleteAddress(
    BuildContext context,
    Map<String, dynamic> address,
    int index,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          '배송지 삭제',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Text(
          '${address['label']} 배송지를 삭제하시겠습니까?',
          style: const TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              '취소',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('삭제'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      // TODO: Supabase에서 삭제
      // await supabase.from('addresses').delete().eq('id', address['id']);
      
      setState(() {
        _addresses.removeAt(index);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('배송지가 삭제되었습니다'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }
}

