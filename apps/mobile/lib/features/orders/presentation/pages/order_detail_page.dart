import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 주문 상세 화면
class OrderDetailPage extends ConsumerWidget {
  final String orderId;

  const OrderDetailPage({
    super.key,
    required this.orderId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('주문 상세'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              // TODO: 공유 기능
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 타임라인
            _buildTimeline(context),
            const Divider(height: 32),
            
            // 주문 정보
            _buildOrderInfo(context),
            const Divider(height: 32),
            
            // 영상 섹션
            _buildVideoSection(context),
            const Divider(height: 32),
            
            // 배송 정보
            _buildShippingInfo(context),
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  Widget _buildTimeline(BuildContext context) {
    final steps = [
      {'status': 'BOOKED', 'label': '수거예약', 'completed': true},
      {'status': 'INBOUND', 'label': '입고완료', 'completed': true},
      {'status': 'PROCESSING', 'label': '수선중', 'completed': true},
      {'status': 'READY_TO_SHIP', 'label': '출고완료', 'completed': false},
      {'status': 'DELIVERED', 'label': '배송완료', 'completed': false},
    ];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '진행 상황',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: List.generate(steps.length * 2 - 1, (index) {
              if (index.isEven) {
                // Step circle
                final stepIndex = index ~/ 2;
                final step = steps[stepIndex];
                return Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: step['completed'] as bool
                            ? Theme.of(context).colorScheme.primary
                            : Colors.grey[300],
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        step['completed'] as bool ? Icons.check : Icons.circle,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: 60,
                      child: Text(
                        step['label'] as String,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: step['completed'] as bool
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  ],
                );
              } else {
                // Connector line
                final prevCompleted = steps[(index - 1) ~/ 2]['completed'] as bool;
                return Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.only(bottom: 32),
                    color: prevCompleted
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey[300],
                  ),
                );
              }
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderInfo(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '주문 정보',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildInfoRow('주문번호', 'ORDER-2024-$orderId'),
          _buildInfoRow('수선 항목', '청바지 기장 수선'),
          _buildInfoRow('주문일시', '2024.01.15 14:30'),
          _buildInfoRow('결제금액', '₩15,000'),
          _buildInfoRow('결제방법', '신용카드'),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '입출고 영상',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildVideoCard(context, '입고 영상', true),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildVideoCard(context, '출고 영상', false),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVideoCard(BuildContext context, String title, bool available) {
    return Card(
      child: InkWell(
        onTap: available ? () {
          // TODO: 영상 재생
        } : null,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 120,
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                available ? Icons.play_circle_outline : Icons.schedule,
                size: 40,
                color: available
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey,
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: available ? null : Colors.grey,
                ),
              ),
              if (!available) ...[
                const SizedBox(height: 4),
                Text(
                  '준비 중',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildShippingInfo(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '배송 정보',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildInfoRow('송장번호', '1234567890'),
          _buildInfoRow('택배사', '우체국 택배'),
          _buildInfoRow('수거지', '서울시 강남구 테헤란로 123'),
          _buildInfoRow('배송지', '서울시 강남구 테헤란로 123'),
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
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
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () {
                // TODO: 고객센터 연결
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('문의하기'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: () {
                // TODO: 배송 추적
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('배송 추적'),
            ),
          ),
        ],
      ),
    );
  }
}

