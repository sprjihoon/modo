import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../services/address_service.dart';
import '../widgets/daum_postcode_widget.dart';

/// 배송지 추가/수정 페이지
class AddAddressPage extends ConsumerStatefulWidget {
  final Map<String, dynamic>? existingAddress; // null이면 추가, 있으면 수정
  
  const AddAddressPage({
    super.key,
    this.existingAddress,
  });

  @override
  ConsumerState<AddAddressPage> createState() => _AddAddressPageState();
}

class _AddAddressPageState extends ConsumerState<AddAddressPage> {
  final _formKey = GlobalKey<FormState>();
  final _labelController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _zipcodeController = TextEditingController();
  final _addressController = TextEditingController();
  final _detailController = TextEditingController();
  
  // 상세주소 입력란 포커스
  final _detailFocusNode = FocusNode();
  
  bool _isDefault = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    
    // 수정 모드일 경우 기존 데이터 로드
    if (widget.existingAddress != null) {
      final addr = widget.existingAddress!;
      _labelController.text = addr['label'] as String? ?? '';
      _nameController.text = addr['recipient_name'] as String? ?? '';
      _phoneController.text = addr['recipient_phone'] as String? ?? '';
      _zipcodeController.text = addr['zipcode'] as String? ?? '';
      _addressController.text = addr['address'] as String? ?? '';
      _detailController.text = addr['address_detail'] as String? ?? '';
      _isDefault = addr['is_default'] as bool? ?? false;
    }
  }

  @override
  void dispose() {
    _labelController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _zipcodeController.dispose();
    _addressController.dispose();
    _detailController.dispose();
    _detailFocusNode.dispose();
    super.dispose();
  }

  Future<void> _saveAddress() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final addressService = AddressService();
      
      if (widget.existingAddress == null) {
        // 배송지 추가
        await addressService.addAddress(
          label: _labelController.text,
          recipientName: _nameController.text,
          recipientPhone: _phoneController.text,
          zipcode: _zipcodeController.text,
          address: _addressController.text,
          addressDetail: _detailController.text.isEmpty ? null : _detailController.text,
          isDefault: _isDefault,
        );
      } else {
        // 배송지 수정
        await addressService.updateAddress(
          addressId: widget.existingAddress!['id'] as String,
          label: _labelController.text,
          recipientName: _nameController.text,
          recipientPhone: _phoneController.text,
          zipcode: _zipcodeController.text,
          address: _addressController.text,
          addressDetail: _detailController.text.isEmpty ? null : _detailController.text,
          isDefault: _isDefault,
        );
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.existingAddress == null 
                  ? '배송지가 추가되었습니다' 
                  : '배송지가 수정되었습니다'
            ),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
        context.pop(true); // 성공 결과 반환
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('저장 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditMode = widget.existingAddress != null;
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(isEditMode ? '배송지 수정' : '배송지 추가'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 배송지 별칭
              _buildSection(
                '배송지 별칭',
                Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildLabelChip('집', '🏠'),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildLabelChip('회사', '🏢'),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildLabelChip('기타', '📍'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _labelController,
                      decoration: InputDecoration(
                        labelText: '별칭 (선택)',
                        hintText: '예: 우리집, 본가 등',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // 수령인 정보
              _buildSection(
                '수령인 정보',
                Column(
                  children: [
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: '이름 *',
                        prefixIcon: const Icon(Icons.person_outline),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return '이름을 입력해주세요';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: '전화번호 *',
                        hintText: '010-1234-5678',
                        prefixIcon: const Icon(Icons.phone_outlined),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return '전화번호를 입력해주세요';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // 주소
              _buildSection(
                '배송 주소',
                Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _zipcodeController,
                            enabled: false,
                            decoration: InputDecoration(
                              labelText: '우편번호',
                              filled: true,
                              fillColor: Colors.grey.shade100,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _searchAddress,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00C896),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('주소 검색'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressController,
                      enabled: false,
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: '주소 *',
                        prefixIcon: const Icon(Icons.location_on_outlined),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return '주소를 검색해주세요';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _detailController,
                      focusNode: _detailFocusNode,
                      decoration: InputDecoration(
                        labelText: '상세주소',
                        hintText: '동, 호수 등',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // 기본 배송지 설정
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    '기본 배송지로 설정',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  subtitle: Text(
                    '다음 주문 시 자동으로 선택됩니다',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  value: _isDefault,
                  onChanged: (value) {
                    setState(() => _isDefault = value);
                  },
                  activeColor: const Color(0xFF00C896),
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: SafeArea(
          child: ElevatedButton(
            onPressed: _isLoading ? null : _saveAddress,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00C896),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text(
                    isEditMode ? '수정 완료' : '배송지 추가',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, Widget child) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: child,
        ),
      ],
    );
  }

  Widget _buildLabelChip(String label, String emoji) {
    final isSelected = _labelController.text == label;
    
    return InkWell(
      onTap: () {
        setState(() {
          _labelController.text = label;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isSelected 
              ? const Color(0xFF00C896).withOpacity(0.1)
              : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected 
                ? const Color(0xFF00C896)
                : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(
              emoji,
              style: const TextStyle(fontSize: 24),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected 
                    ? const Color(0xFF00C896)
                    : Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _searchAddress() async {
    // 주소 검색 다이얼로그 표시
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        child: const DaumPostcodeWidget(),
      ),
    );
    
    if (result != null) {
      setState(() {
        _zipcodeController.text = result['zonecode'] ?? '';
        _addressController.text = result['address'] ?? '';
      });
      
      // 주소가 입력되면 상세주소 입력란으로 포커스 이동
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) {
          _detailFocusNode.requestFocus();
        }
      });
      
      // 스낵바로 안내 메시지 표시
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('주소가 입력되었습니다. 상세주소를 입력해주세요.'),
            backgroundColor: Color(0xFF00C896),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }
}

