import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../../core/enums/user_role.dart';
import '../../../../features/auth/data/providers/auth_provider.dart';
import '../../providers/extra_charge_provider.dart';
import '../../domain/models/extra_charge_data.dart';

/// 관리자 승인 대기 화면
/// 
/// PENDING_MANAGER 상태인 주문들을 표시하고
/// 관리자가 금액과 안내문구를 입력하여 승인
class PendingExtraChargesPage extends StatefulWidget {
  const PendingExtraChargesPage({Key? key}) : super(key: key);

  @override
  State<PendingExtraChargesPage> createState() => _PendingExtraChargesPageState();
}

class _PendingExtraChargesPageState extends State<PendingExtraChargesPage> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final extraChargeProvider = context.read<ExtraChargeProvider>();
    await extraChargeProvider.loadPendingManagerOrders();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final extraChargeProvider = context.watch<ExtraChargeProvider>();
    final userRole = authProvider.user?.role ?? UserRole.WORKER;

    // 관리자 권한 확인
    if (!userRole.isManagerOrAbove) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('권한 없음'),
        ),
        body: const Center(
          child: Text('관리자 권한이 필요합니다'),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('추가 작업 승인 대기'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: extraChargeProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : extraChargeProvider.pendingManagerOrders.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: extraChargeProvider.pendingManagerOrders.length,
                    itemBuilder: (context, index) {
                      final order = extraChargeProvider.pendingManagerOrders[index];
                      return _PendingOrderCard(
                        order: order,
                        onApproved: _loadData,
                      );
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.check_circle_outline,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            '승인 대기 중인 요청이 없습니다',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}

/// 승인 대기 주문 카드
class _PendingOrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final VoidCallback? onApproved;

  const _PendingOrderCard({
    Key? key,
    required this.order,
    this.onApproved,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final extraChargeProvider = context.read<ExtraChargeProvider>();
    final extraChargeData = extraChargeProvider.parseExtraChargeData(order);

    final orderNumber = order['order_number'] as String? ?? 'N/A';
    final itemName = order['item_name'] as String? ?? '상품명 없음';
    final customerName = order['customer_name'] as String? ?? '고객명 없음';
    final workerMemo = extraChargeData.workerMemo ?? '메모 없음';

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 헤더
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    '승인 대기',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    orderNumber,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 주문 정보
            _buildInfoRow('상품명', itemName),
            _buildInfoRow('고객명', customerName),
            const SizedBox(height: 8),

            // 작업자 메모
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '작업자 메모',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    workerMemo,
                    style: const TextStyle(fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // 액션 버튼
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _showRejectDialog(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                    ),
                    child: const Text('반려'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () => _showApproveDialog(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('승인 (금액입력)'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: Colors.black54,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('요청 반려'),
        content: const Text('이 요청을 반려하시겠습니까?\n(현재 버전에서는 반려 기능이 제한됩니다)'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('반려 기능은 추후 구현 예정입니다'),
                  backgroundColor: Colors.orange,
                ),
              );
            },
            child: const Text('확인'),
          ),
        ],
      ),
    );
  }

  void _showApproveDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ApproveDialog(
        orderId: order['id'] as String,
        onApproved: onApproved,
      ),
    );
  }
}

/// 승인 다이얼로그
class _ApproveDialog extends StatefulWidget {
  final String orderId;
  final VoidCallback? onApproved;

  const _ApproveDialog({
    Key? key,
    required this.orderId,
    this.onApproved,
  }) : super(key: key);

  @override
  State<_ApproveDialog> createState() => _ApproveDialogState();
}

class _ApproveDialogState extends State<_ApproveDialog> {
  final _formKey = GlobalKey<FormState>();
  final _priceController = TextEditingController();
  final _noteController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _priceController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final extraChargeProvider = context.read<ExtraChargeProvider>();
    final price = int.parse(_priceController.text.replaceAll(',', ''));
    final note = _noteController.text.trim();

    final success = await extraChargeProvider.approveWorkerRequest(
      orderId: widget.orderId,
      price: price,
      note: note,
    );

    setState(() {
      _isSubmitting = false;
    });

    if (success) {
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('승인 완료! 고객에게 결제 요청이 전송되었습니다'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onApproved?.call();
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? '승인 실패'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('추가 작업 승인'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
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
              const SizedBox(height: 16),
              TextFormField(
                controller: _noteController,
                decoration: const InputDecoration(
                  labelText: '고객 안내 문구 *',
                  hintText: '예: 단추 교체 작업이 필요합니다',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.message),
                ),
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '안내 문구를 입력해주세요';
                  }
                  return null;
                },
              ),
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
          onPressed: _isSubmitting ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
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
              : const Text('승인'),
        ),
      ],
    );
  }
}

