import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../services/payment_service.dart';

/// 결제수단 관리 페이지
class PaymentMethodsPage extends ConsumerStatefulWidget {
  const PaymentMethodsPage({super.key});

  @override
  ConsumerState<PaymentMethodsPage> createState() => _PaymentMethodsPageState();
}

class _PaymentMethodsPageState extends ConsumerState<PaymentMethodsPage> {
  final _paymentService = PaymentService();
  List<Map<String, dynamic>> _paymentMethods = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPaymentMethods();
  }

  Future<void> _loadPaymentMethods() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        setState(() => _isLoading = false);
        return;
      }

      final methods = await _paymentService.getPaymentMethods();
      
      // 개발용: 카드가 하나도 없으면 목업 카드 자동 생성
      if (methods.isEmpty) {
        try {
          await _createMockCard();
          final updatedMethods = await _paymentService.getPaymentMethods();
          setState(() {
            _paymentMethods = updatedMethods;
            _isLoading = false;
          });
          return;
        } catch (e) {
          debugPrint('목업 카드 생성 실패: $e');
        }
      }
      
      setState(() {
        _paymentMethods = methods;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('결제수단 조회 실패: $e')),
        );
      }
    }
  }
  
  /// 개발용 목업 카드 생성
  Future<void> _createMockCard() async {
    await _paymentService.registerPaymentMethod(
      billingKey: 'mock_billing_default_${DateTime.now().millisecondsSinceEpoch}',
      cardCompany: 'KB국민카드',
      cardNumber: '**** **** **** 1234',
      cardType: '신용',
      isDefault: true,
    );
  }

  @override
  Widget build(BuildContext context) {

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('결제수단 관리'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _paymentMethods.isEmpty
              ? _buildEmptyState()
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _paymentMethods.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final method = _paymentMethods[index];
                    final isDefault = method['is_default'] as bool? ?? false;
          
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: (isDefault == true)
                    ? const Color(0xFF00C896)
                    : Colors.grey.shade200,
                width: (isDefault == true) ? 2 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 50,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.credit_card,
                          size: 24,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (method['card_company'] ?? method['brand'] ?? '카드').toString(),
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            (method['card_number'] ?? method['number'] ?? '**** **** **** ****').toString(),
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isDefault)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00C896),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          '기본',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: (isDefault == true) ? null : () async {
                          try {
                            await _paymentService.setDefaultPaymentMethod(
                              paymentMethodId: method['id'],
                            );
                            _loadPaymentMethods();
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('기본 결제수단으로 설정되었습니다'),
                                  backgroundColor: Color(0xFF00C896),
                                ),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('설정 실패: $e')),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.check_circle_outline, size: 18),
                        label: const Text('기본 설정'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF00C896),
                          side: const BorderSide(color: Color(0xFF00C896)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () {
                        _showEditCardDialog(method);
                      },
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      label: const Text('수정'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF00C896),
                        side: const BorderSide(color: Color(0xFF00C896)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('결제수단 삭제'),
                            content: const Text('이 결제수단을 삭제하시겠습니까?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('취소'),
                              ),
                              TextButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('삭제', style: TextStyle(color: Colors.red)),
                              ),
                            ],
                          ),
                        );
                        
                        if (confirmed == true) {
                          try {
                            await _paymentService.deletePaymentMethod(method['id']);
                            _loadPaymentMethods();
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('결제수단이 삭제되었습니다'),
                                  backgroundColor: Color(0xFF00C896),
                                ),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('삭제 실패: $e')),
                              );
                            }
                          }
                        }
                      },
                      icon: const Icon(Icons.delete_outline, size: 18),
                      label: const Text('삭제'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push<bool>('/profile/payment-methods/add');
          if (result == true && mounted) {
            _loadPaymentMethods();
          }
        },
        backgroundColor: const Color(0xFF00C896),
        icon: const Icon(Icons.add),
        label: const Text('카드 등록'),
      ),
    );
  }

  /// 카드 정보 수정 다이얼로그
  void _showEditCardDialog(Map<String, dynamic> method) {
    final cardCompanyController = TextEditingController(text: method['card_company'].toString());
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('카드 정보 수정'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '카드사 이름',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: cardCompanyController,
              decoration: InputDecoration(
                hintText: 'KB국민카드',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '카드 번호: ${method['card_number']}',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '* 카드 번호는 보안상 수정할 수 없습니다',
              style: TextStyle(
                fontSize: 12,
                color: Colors.red.shade600,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              
              try {
                // DB 업데이트
                await Supabase.instance.client
                    .from('payment_methods')
                    .update({'card_company': cardCompanyController.text})
                    .eq('id', method['id']);
                
                _loadPaymentMethods();
                
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('카드 정보가 수정되었습니다'),
                      backgroundColor: Color(0xFF00C896),
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('수정 실패: $e')),
                  );
                }
              }
            },
            child: const Text('저장', style: TextStyle(color: Color(0xFF00C896), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
  
  /// 빈 상태 UI
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.credit_card_off_outlined,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            '등록된 결제수단이 없습니다',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '카드를 등록하고 간편하게 결제하세요',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }
}

