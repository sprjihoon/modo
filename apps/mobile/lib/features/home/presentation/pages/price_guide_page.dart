import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../services/repair_service.dart';

class PriceGuidePage extends StatefulWidget {
  const PriceGuidePage({super.key});

  @override
  State<PriceGuidePage> createState() => _PriceGuidePageState();
}

class _PriceGuidePageState extends State<PriceGuidePage> {
  final RepairService _repairService = RepairService();

  /// [{name, display_order, items: [repair_type, ...]}]
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = true;
  String? _error;
  int _selectedTabIndex = 0; // 0 = 전체

  @override
  void initState() {
    super.initState();
    _loadRepairTypes();
  }

  Future<void> _loadRepairTypes() async {
    try {
      final types = await _repairService.getAllRepairTypesWithCategories();

      final grouped = <String, Map<String, dynamic>>{};
      for (final r in types) {
        final cat = r['category'] as Map<String, dynamic>?;
        final catId = cat?['id'] as String? ?? '__none__';
        if (!grouped.containsKey(catId)) {
          grouped[catId] = {
            'name': cat?['name'] as String? ?? '기타',
            'display_order': cat?['display_order'] as num? ?? 999,
            'items': <Map<String, dynamic>>[],
          };
        }
        (grouped[catId]!['items'] as List<Map<String, dynamic>>).add(r);
      }

      final sorted = grouped.values.toList()
        ..sort((a, b) =>
            (a['display_order'] as num).compareTo(b['display_order'] as num));

      if (mounted) {
        setState(() {
          _categories = sorted;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = '데이터를 불러오지 못했어요';
          _isLoading = false;
        });
      }
    }
  }

  String _priceLabel(Map<String, dynamic> r) {
    final price = r['price'];
    if (price != null && price is num && price > 0) {
      return '₩${price.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
    }
    return '가격 문의';
  }

  List<Map<String, dynamic>> get _visibleCategories {
    if (_selectedTabIndex == 0) return _categories;
    return [_categories[_selectedTabIndex - 1]];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
        title: const Text(
          '가격표',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        centerTitle: true,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildNoticeBanner(),
          const SizedBox(height: 16),
          ...List.generate(
            8,
            (_) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              height: 60,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _error = null;
                });
                _loadRepairTypes();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00C896),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('다시 시도'),
            ),
          ],
        ),
      );
    }

    if (_categories.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.content_cut, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text('등록된 수선 항목이 없어요', style: TextStyle(color: Colors.grey.shade500)),
            const SizedBox(height: 4),
            Text('잠시 후 다시 확인해 주세요', style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
          ],
        ),
      );
    }

    return Column(
      children: [
        // 안내 배너
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: _buildNoticeBanner(),
        ),
        // 카테고리 탭 필터
        if (_categories.length > 1) ...[
          const SizedBox(height: 12),
          _buildCategoryTabs(),
        ],
        const SizedBox(height: 4),
        // 수선 목록
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            children: [
              for (final cat in _visibleCategories) ...[
                _buildCategoryHeader(cat['name'] as String),
                const SizedBox(height: 8),
                ...(cat['items'] as List<Map<String, dynamic>>).map((r) => _buildRepairItem(r)),
                const SizedBox(height: 16),
              ],
            ],
          ),
        ),
        _buildCTAButton(),
      ],
    );
  }

  Widget _buildCategoryTabs() {
    final tabs = ['전체', ..._categories.map((c) => c['name'] as String)];
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final isSelected = _selectedTabIndex == index;
          return GestureDetector(
            onTap: () => setState(() => _selectedTabIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF00C896) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(20),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF00C896).withOpacity(0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        )
                      ]
                    : [],
              ),
              child: Text(
                tabs[index],
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : Colors.grey.shade600,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildNoticeBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF00C896).withOpacity(0.07),
        border: Border.all(color: const Color(0xFF00C896).withOpacity(0.2)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 16, color: Color(0xFF00C896)),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '참고 안내',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF00C896),
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  '실제 수선 가격은 상태에 따라 달라질 수 있습니다.',
                  style: TextStyle(fontSize: 12, color: Colors.black54, height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryHeader(String name) {
    return Padding(
      padding: const EdgeInsets.only(left: 2, bottom: 4),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              color: const Color(0xFF00C896),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            name,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRepairItem(Map<String, dynamic> r) {
    final name = r['name'] as String? ?? '';
    final description = r['description'] as String?;
    final priceLabel = _priceLabel(r);
    final isPriceInquiry = priceLabel == '가격 문의';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade100),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(top: 2, right: 10),
            decoration: const BoxDecoration(
              color: Color(0xFF00C896),
              shape: BoxShape.circle,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                ),
                if (description != null && description.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            priceLabel,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: isPriceInquiry ? Colors.grey.shade500 : const Color(0xFF00C896),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCTAButton() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      child: SafeArea(
        top: false,
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => context.push('/select-clothing-type', extra: <String>[]),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00C896),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: const Text(
              '수선 신청 바로가기',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );
  }
}
