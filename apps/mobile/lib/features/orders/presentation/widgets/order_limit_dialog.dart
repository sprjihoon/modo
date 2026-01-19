import 'package:flutter/material.dart';
import '../../../../services/order_limit_service.dart';

/// 주문 제한 초과 시 표시되는 다이얼로그
/// 
/// - 제한 메시지 표시
/// - "알림 받기" 버튼으로 대기자 등록
class OrderLimitDialog extends StatefulWidget {
  final String message;
  final VoidCallback? onClose;

  const OrderLimitDialog({
    super.key,
    required this.message,
    this.onClose,
  });

  /// 다이얼로그 표시
  static Future<bool?> show(BuildContext context, {required String message}) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => OrderLimitDialog(message: message),
    );
  }

  @override
  State<OrderLimitDialog> createState() => _OrderLimitDialogState();
}

class _OrderLimitDialogState extends State<OrderLimitDialog> {
  final _orderLimitService = OrderLimitService();
  bool _isLoading = false;
  bool _isRegistered = false;

  Future<void> _registerWaitlist() async {
    setState(() => _isLoading = true);

    try {
      final result = await _orderLimitService.registerWaitlist();
      
      if (mounted) {
        if (result.success) {
          setState(() => _isRegistered = true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: const Color(0xFF00C896),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 아이콘
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(36),
              ),
              child: const Icon(
                Icons.access_time_rounded,
                size: 40,
                color: Color(0xFFFF9800),
              ),
            ),
            const SizedBox(height: 20),

            // 제목
            const Text(
              '잠시만요!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),

            // 메시지
            Text(
              widget.message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey.shade700,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),

            // 버튼들
            if (_isRegistered) ...[
              // 등록 완료 상태
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: Color(0xFF4CAF50),
                      size: 20,
                    ),
                    SizedBox(width: 8),
                    Text(
                      '알림 신청 완료!',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4CAF50),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '접수 가능해지면 알려드릴게요',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 16),
              // 닫기 버튼
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text(
                    '확인',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ] else ...[
              // 알림 받기 버튼
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _registerWaitlist,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00C896),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
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
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.notifications_active, size: 20),
                            SizedBox(width: 8),
                            Text(
                              '접수 가능할 때 알림 받기',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),

              // 나중에 버튼
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text(
                    '나중에 할게요',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

