import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/repair_service.dart';

const Color _kBrand = Color(0xFF00C896);
const String _kOtherTabId = '__other__';

/// 가격 안내 페이지
/// 웹 `/guide/price`와 동일한 데이터 구조 / UI 구성:
/// - 안내 배너
/// - 대카테고리 탭 (계층 구조 시) / 카테고리 탭 (flat) + 미분류는 "기타" 탭
/// - 선택 카테고리명 아래 그룹 카드 안에 항목 행
/// - CTA 버튼 (수선 신청 바로가기)
class PriceGuidePage extends StatefulWidget {
  const PriceGuidePage({super.key});

  @override
  State<PriceGuidePage> createState() => _PriceGuidePageState();
}

class _PriceGuidePageState extends State<PriceGuidePage> {
  final RepairService _repairService = RepairService();

  RepairCategoriesResult? _data;
  bool _isLoading = true;
  String? _error;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _repairService.getRepairCategoriesForGuide();
      if (!mounted) return;

      String? initialId;
      if (data.hierarchical && data.mainCategories.isNotEmpty) {
        initialId = data.mainCategories.first.id;
      } else if (data.flatCategories.isNotEmpty) {
        initialId = data.flatCategories.first.id;
      } else if (data.uncategorized.isNotEmpty) {
        initialId = _kOtherTabId;
      }

      setState(() {
        _data = data;
        _selectedId = initialId;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '데이터를 불러오지 못했어요';
        _isLoading = false;
      });
    }
  }

  String _priceLabel(RepairTypeItem r) {
    final price = r.price;
    if (price != null && price > 0) {
      final n = price.toInt();
      final str = n.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]},',
      );
      return '₩$str';
    }
    return '가격 문의';
  }

  List<_TabSpec> _buildTabs() {
    final data = _data;
    if (data == null) return const [];

    final tabs = <_TabSpec>[];
    if (data.hierarchical) {
      for (final m in data.mainCategories) {
        tabs.add(_TabSpec(id: m.id, name: m.name));
      }
    } else {
      for (final c in data.flatCategories) {
        tabs.add(_TabSpec(id: c.id, name: c.name));
      }
    }
    if (data.uncategorized.isNotEmpty) {
      tabs.add(const _TabSpec(id: _kOtherTabId, name: '기타'));
    }
    return tabs;
  }

  bool get _hasContent {
    final data = _data;
    if (data == null) return false;
    return data.mainCategories.isNotEmpty ||
        data.flatCategories.isNotEmpty ||
        data.uncategorized.isNotEmpty;
  }

  String? get _selectedName {
    final data = _data;
    if (data == null) return null;
    if (_selectedId == _kOtherTabId) return '기타';
    if (data.hierarchical) {
      for (final m in data.mainCategories) {
        if (m.id == _selectedId) return m.name;
      }
      return null;
    }
    for (final c in data.flatCategories) {
      if (c.id == _selectedId) return c.name;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: const ModoAppBar(
        title: Text(
          '가격 안내',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        centerTitle: false,
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
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
                _load();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: _kBrand,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text('다시 시도'),
            ),
          ],
        ),
      );
    }

    final tabs = _buildTabs();

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              const SizedBox(height: 16),
              _buildNoticeBanner(),
              if (!_isLoading && _hasContent && tabs.length > 1) ...[
                const SizedBox(height: 16),
                _buildCategoryTabs(tabs),
              ],
              if (!_isLoading && _selectedName != null) ...[
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    _selectedName!,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF111111),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              if (_isLoading)
                _buildLoadingSkeleton()
              else if (!_hasContent)
                _buildEmptyAll()
              else
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: _buildSelectedContent(),
                ),
            ],
          ),
        ),
        _buildCTAButton(),
      ],
    );
  }

  Widget _buildNoticeBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _kBrand.withValues(alpha: 0.05),
          border: Border.all(color: _kBrand.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '삸고 안내',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _kBrand,
              ),
            ),
            SizedBox(height: 4),
            Text(
              '실제 수선 가격은 상태에 따라 달라질 수 있습니다.',
              style: TextStyle(
                fontSize: 12,
                color: Color(0xFF666666),
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryTabs(List<_TabSpec> tabs) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final tab = tabs[index];
          final isSelected = _selectedId == tab.id;
          return GestureDetector(
            onTap: () => setState(() => _selectedId = tab.id),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? _kBrand : const Color(0xFFF3F3F3),
                borderRadius: BorderRadius.circular(999),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: _kBrand.withValues(alpha: 0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : [],
              ),
              alignment: Alignment.center,
              child: Text(
                tab.name,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : const Color(0xFF6B6B6B),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSelectedContent() {
    final data = _data!;
    if (_selectedId == _kOtherTabId) {
      return _ItemListCard(
        items: data.uncategorized,
        priceLabel: _priceLabel,
      );
    }

    if (data.hierarchical) {
      RepairMainCategory? main;
      for (final m in data.mainCategories) {
        if (m.id == _selectedId) {
          main = m;
          break;
        }
      }
      if (main == null) return const SizedBox.shrink();

      final blocks = <Widget>[];
      if (main.repairTypes.isNotEmpty) {
        blocks.add(
          _ItemListCard(
            items: main.repairTypes,
            priceLabel: _priceLabel,
          ),
        );
      }
      for (final sub in main.subCategories) {
        if (blocks.isNotEmpty) blocks.add(const SizedBox(height: 20));
        blocks.add(_buildSubCategoryHeader(sub.name));
        blocks.add(const SizedBox(height: 8));
        blocks.add(
          _ItemListCard(
            items: sub.repairTypes,
            priceLabel: _priceLabel,
          ),
        );
      }
      if (main.subCategories.isEmpty && main.repairTypes.isEmpty) {
        blocks.add(_buildEmptyState());
      }

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: blocks,
      );
    }

    RepairSubCategory? cat;
    for (final c in data.flatCategories) {
      if (c.id == _selectedId) {
        cat = c;
        break;
      }
    }
    if (cat == null) return const SizedBox.shrink();
    return cat.repairTypes.isNotEmpty
        ? _ItemListCard(items: cat.repairTypes, priceLabel: _priceLabel)
        : _buildEmptyState();
  }

  Widget _buildSubCategoryHeader(String name) {
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(
              color: _kBrand.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            name,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B6B6B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Text(
          '등록된 항목이 없어요',
          style: TextStyle(fontSize: 13, color: Color(0xFF999999)),
        ),
      ),
    );
  }

  Widget _buildEmptyAll() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 80),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.content_cut, size: 48, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          const Text(
            '등록된 수선 항목이 없어요',
            style: TextStyle(fontSize: 13, color: Color(0xFF999999)),
          ),
          const SizedBox(height: 4),
          const Text(
            '잠시 후 다시 확인해 주세요',
            style: TextStyle(fontSize: 11, color: Color(0xFFCCCCCC)),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingSkeleton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        children: List.generate(
          5,
          (_) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            height: 56,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F1F1),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCTAButton() {
    return Container(
      color: const Color(0xFFFAFAFA),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: () =>
              context.push('/select-clothing-type', extra: <String>[]),
          style: ElevatedButton.styleFrom(
            backgroundColor: _kBrand,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 0,
          ),
          child: const Text(
            '수선 신청 바로가기',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}

class _TabSpec {
  final String id;
  final String name;
  const _TabSpec({required this.id, required this.name});
}

/// 항목 리스트 카드 (웹의 ItemList 컴포넌트와 동일한 시각 구조)
class _ItemListCard extends StatelessWidget {
  final List<RepairTypeItem> items;
  final String Function(RepairTypeItem) priceLabel;

  const _ItemListCard({required this.items, required this.priceLabel});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: Center(
          child: Text(
            '등록된 항목이 없어요',
            style: TextStyle(fontSize: 13, color: Color(0xFF999999)),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFF1F1F1)),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0)
                const Divider(
                  height: 1,
                  thickness: 1,
                  color: Color(0xFFFAFAFA),
                  indent: 16,
                  endIndent: 16,
                ),
              _RepairItemRow(item: items[i], label: priceLabel(items[i])),
            ],
          ],
        ),
      ),
    );
  }
}

class _RepairItemRow extends StatelessWidget {
  final RepairTypeItem item;
  final String label;

  const _RepairItemRow({required this.item, required this.label});

  @override
  Widget build(BuildContext context) {
    final isInquiry = label == '가격 문의';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF333333),
                  ),
                ),
                if (item.description != null &&
                    item.description!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.description!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFFAAAAAA),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: isInquiry ? const Color(0xFFAAAAAA) : _kBrand,
            ),
          ),
        ],
      ),
    );
  }
}
