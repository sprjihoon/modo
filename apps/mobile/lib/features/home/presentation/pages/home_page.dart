import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 홈 화면
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('모두의수선'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // TODO: 알림 페이지로 이동
            },
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () {
              // TODO: 프로필 페이지로 이동
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 배너 섹션
            _buildBannerSection(context),
            const SizedBox(height: 24),
            
            // 빠른 메뉴
            _buildQuickMenuSection(context),
            const SizedBox(height: 24),
            
            // 진행 중인 주문
            _buildOrdersSection(context),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // TODO: 수선 접수 페이지로 이동
        },
        icon: const Icon(Icons.add),
        label: const Text('수선 접수'),
      ),
    );
  }

  Widget _buildBannerSection(BuildContext context) {
    return Card(
      child: Container(
        height: 160,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '옷 수선,\n이제 집에서 간편하게',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '수거부터 배송까지 한 번에',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickMenuSection(BuildContext context) {
    final menus = [
      {'icon': Icons.content_cut, 'label': '수선접수'},
      {'icon': Icons.list_alt, 'label': '주문내역'},
      {'icon': Icons.local_shipping_outlined, 'label': '배송추적'},
      {'icon': Icons.help_outline, 'label': '고객센터'},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: menus.map((menu) {
        return InkWell(
          onTap: () {
            if (menu['label'] == '주문내역') {
              context.push('/orders');
            }
          },
          child: Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  menu['icon'] as IconData,
                  color: Theme.of(context).colorScheme.primary,
                  size: 32,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                menu['label'] as String,
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildOrdersSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '진행 중인 주문',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                context.push('/orders');
              },
              child: const Text('전체보기'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // TODO: 실제 주문 데이터로 교체
        Card(
          child: ListTile(
            leading: const Icon(Icons.checkroom, size: 40),
            title: const Text('청바지 기장 수선'),
            subtitle: const Text('수선 중 • 송장번호: 1234567890'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              context.push('/orders/1');
            },
          ),
        ),
      ],
    );
  }
}

