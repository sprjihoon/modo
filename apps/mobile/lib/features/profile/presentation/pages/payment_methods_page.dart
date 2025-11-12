import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 결제수단 관리 페이지
class PaymentMethodsPage extends ConsumerWidget {
  const PaymentMethodsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Mock 결제수단
    final mockPaymentMethods = [
      {
        'type': 'card',
        'brand': 'KB국민카드',
        'number': '**** **** **** 1234',
        'isDefault': true,
      },
      {
        'type': 'card',
        'brand': '신한카드',
        'number': '**** **** **** 5678',
        'isDefault': false,
      },
    ];

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('결제수단 관리'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: mockPaymentMethods.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final method = mockPaymentMethods[index];
          final isDefault = method['isDefault'] as bool;
          
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
                            method['brand'] as String,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            method['number'] as String,
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
                        onPressed: () {
                          // TODO: 기본 결제수단 설정
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
                        // TODO: 삭제
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
        onPressed: () {
          // TODO: 결제수단 추가
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('결제수단 추가 기능은 준비 중입니다'),
              backgroundColor: Color(0xFF00C896),
            ),
          );
        },
        backgroundColor: const Color(0xFF00C896),
        icon: const Icon(Icons.add),
        label: const Text('카드 추가'),
      ),
    );
  }
}

