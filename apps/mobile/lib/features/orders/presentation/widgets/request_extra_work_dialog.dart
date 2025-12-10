import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/enums/user_role.dart';
import '../../../../features/auth/data/providers/auth_provider.dart';
import '../../providers/extra_charge_provider.dart';

/// 추가 작업 요청 다이얼로그
/// 
/// 작업자(WORKER): 사유만 입력
/// 관리자(MANAGER/ADMIN): 사유 + 금액 + 안내문구 입력
class RequestExtraWorkDialog extends StatefulWidget {
  final String orderId;
  final VoidCallback? onSuccess;

  const RequestExtraWorkDialog({
    Key? key,
    required this.orderId,
    this.onSuccess,
  }) : super(key: key);

  @override
  State<RequestExtraWorkDialog> createState() => _RequestExtraWorkDialogState();
}

class _RequestExtraWorkDialogState extends State<RequestExtraWorkDialog> {
  final _formKey = GlobalKey<FormState>();
  final _memoController = TextEditingController();
  final _priceController = TextEditingController();
  final _noteController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void dispose() {
    _memoController.dispose();
    _priceController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit(BuildContext context) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final authProvider = context.read<AuthProvider>();
    final extraChargeProvider = context.read<ExtraChargeProvider>();
    final userRole = authProvider.user?.role ?? UserRole.WORKER;

    final memo = _memoController.text.trim();
    int? price;
    String? note;

    // 관리자인 경우 금액과 안내문구 포함
    if (userRole.isManagerOrAbove) {
      price = int.tryParse(_priceController.text.replaceAll(',', ''));
      note = _noteController.text.trim();
    }

    final success = await extraChargeProvider.requestExtraWork(
      orderId: widget.orderId,
      memo: memo,
      price: price,
      note: note,
    );

    setState(() {
      _isSubmitting = false;
    });

    if (success) {
      if (mounted) {
        Navigator.of(context).pop();
        
        // 성공 메시지 표시
        final message = userRole.isWorker
            ? '관리자 승인 대기 중입니다'
            : '고객에게 추가 결제 요청이 전송되었습니다';
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.green,
          ),
        );

        widget.onSuccess?.call();
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? '요청 실패'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final userRole = authProvider.user?.role ?? UserRole.WORKER;
    final isManager = userRole.isManagerOrAbove;

    return AlertDialog(
      title: Row(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: Colors.orange,
            size: 28,
          ),
          const SizedBox(width: 8),
          Text(
            isManager ? '추가 작업 요청 (Direct Pass)' : '추가 작업 요청',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 안내 문구
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isManager ? Colors.blue[50] : Colors.orange[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isManager
                      ? '관리자는 즉시 고객에게 추가 결제 요청을 보낼 수 있습니다.'
                      : '관리자가 확인 후 고객에게 전달됩니다.',
                  style: TextStyle(
                    fontSize: 13,
                    color: isManager ? Colors.blue[900] : Colors.orange[900],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 사유 입력 (공통)
              TextFormField(
                controller: _memoController,
                decoration: const InputDecoration(
                  labelText: '현장 상황 메모 *',
                  hintText: '예: 단추 파손 발견, 추가 수선 필요',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.edit_note),
                ),
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '사유를 입력해주세요';
                  }
                  return null;
                },
              ),

              // 관리자 전용: 금액 입력
              if (isManager) ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _priceController,
                  decoration: const InputDecoration(
                    labelText: '추가 청구 금액 *',
                    hintText: '예: 10000',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.attach_money),
                    suffixText: '원',
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '금액을 입력해주세요';
                    }
                    final price = int.tryParse(value);
                    if (price == null || price <= 0) {
                      return '올바른 금액을 입력해주세요';
                    }
                    return null;
                  },
                ),
              ],

              // 관리자 전용: 고객 안내 문구
              if (isManager) ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _noteController,
                  decoration: const InputDecoration(
                    labelText: '고객 안내 문구 *',
                    hintText: '예: 단추 교체 작업이 필요합니다',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.message),
                  ),
                  maxLines: 2,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '안내 문구를 입력해주세요';
                    }
                    return null;
                  },
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: const Text('취소'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : () => _submit(context),
          style: ElevatedButton.styleFrom(
            backgroundColor: isManager ? Colors.blue : Colors.orange,
            foregroundColor: Colors.white,
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Text(isManager ? '즉시 요청' : '관리자에게 요청'),
        ),
      ],
    );
  }
}

/// 추가 작업 요청 다이얼로그 표시 헬퍼 함수
Future<void> showRequestExtraWorkDialog({
  required BuildContext context,
  required String orderId,
  VoidCallback? onSuccess,
}) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => RequestExtraWorkDialog(
      orderId: orderId,
      onSuccess: onSuccess,
    ),
  );
}

