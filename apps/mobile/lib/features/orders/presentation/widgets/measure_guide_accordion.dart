import 'package:flutter/material.dart';

import '../../../../core/measure_guide.dart';

/// 웹 MeasureGuideClient(비교 방법)와 동일한 치수 재는 방법 아코디언.
class MeasureGuideAccordion extends StatefulWidget {
  final String? initialTypeId;
  final bool defaultOpen;

  const MeasureGuideAccordion({
    this.initialTypeId,
    this.defaultOpen = true,
    super.key,
  });

  @override
  State<MeasureGuideAccordion> createState() => _MeasureGuideAccordionState();
}

class _MeasureGuideAccordionState extends State<MeasureGuideAccordion> {
  static const _brand = Color(0xFF00C896);

  late bool _open;
  late String _selectedId;
  String _tab = 'compare';
  bool _dropdownOpen = false;

  bool get _inTest {
    final name = WidgetsBinding.instance.runtimeType.toString();
    return name.contains('TestWidgetsFlutterBinding') ||
        name.contains('AutomatedTest');
  }

  List<MeasureGuideType> get _allowed =>
      allowedMeasureGuideTypes(widget.initialTypeId);

  bool get _lockType =>
      widget.initialTypeId != null && widget.initialTypeId!.trim().isNotEmpty;

  bool get _strictlyLocked => _lockType && _allowed.length == 1;

  MeasureGuideType get _current {
    return _allowed.firstWhere(
      (t) => t.id == _selectedId,
      orElse: () => _allowed.first,
    );
  }

  @override
  void initState() {
    super.initState();
    _open = widget.defaultOpen;
    _selectedId = _initialSelectedId();
  }

  @override
  void didUpdateWidget(covariant MeasureGuideAccordion oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTypeId != widget.initialTypeId) {
      _selectedId = _initialSelectedId();
      _dropdownOpen = false;
      _tab = 'compare';
    }
  }

  String _initialSelectedId() {
    final ids = expandMeasureGuideTypeIds(widget.initialTypeId);
    final match = _allowed.where((t) => ids.isNotEmpty && t.id == ids.first);
    if (match.isNotEmpty) return match.first.id;
    return _allowed.first.id;
  }

  void _toggle() => setState(() => _open = !_open);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: _toggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '치수 재는 방법',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                        if (!_open)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              '눌러서 가이드 보기',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      color: _brand,
                      size: 22,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_open) ...[
            Divider(height: 1, color: Colors.grey.shade100),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 20, 16, 16),
              child: Text(
                '정확한 수선을 위해 수선 부위의\n단면 치수 입력이 필요 합니다.',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  height: 1.35,
                  color: Color(0xFF111827),
                ),
              ),
            ),
            _MethodTabs(
              tab: _tab,
              onChange: (next) => setState(() {
                _tab = next;
                _dropdownOpen = false;
              }),
            ),
            _GuideBody(
              type: _current,
              allowed: _allowed,
              tab: _tab,
              strictlyLocked: _strictlyLocked,
              lockType: _lockType,
              dropdownOpen: _dropdownOpen,
              inTest: _inTest,
              onToggleDropdown: () =>
                  setState(() => _dropdownOpen = !_dropdownOpen),
              onSelectType: (id) => setState(() {
                _selectedId = id;
                _dropdownOpen = false;
              }),
            ),
          ],
        ],
      ),
    );
  }
}

class _GuideBody extends StatelessWidget {
  static const _brand = Color(0xFF00C896);
  static const _highlight = Color(0xFFEF4444);

  final MeasureGuideType type;
  final List<MeasureGuideType> allowed;
  final String tab;
  final bool strictlyLocked;
  final bool lockType;
  final bool dropdownOpen;
  final bool inTest;
  final VoidCallback onToggleDropdown;
  final ValueChanged<String> onSelectType;

  const _GuideBody({
    required this.type,
    required this.allowed,
    required this.tab,
    required this.strictlyLocked,
    required this.lockType,
    required this.dropdownOpen,
    required this.inTest,
    required this.onToggleDropdown,
    required this.onSelectType,
  });

  bool get _isCompare => tab == 'compare';

  List<MeasureGuideDailyItem> get _dailyItems => [
        for (final t in (lockType ? allowed : measureGuideTypes)) ...t.daily,
      ];

  List<String> get _dailyNotes => {
        for (final t in (lockType ? allowed : measureGuideTypes)) ...t.notes,
      }.toList();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '준비물',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 8),
          Text.rich(
            TextSpan(
              style: const TextStyle(
                fontSize: 14,
                height: 1.5,
                color: Color(0xFF4B5563),
              ),
              children: [
                TextSpan(
                  text: _isCompare
                      ? '단면 측정을 위해 수선할 의류와 같은 종류의 의류 중 '
                      : '수선할 의류와 같은 종류의 의류 중 ',
                ),
                const TextSpan(
                  text: '평소 잘 맞는 의류',
                  style: TextStyle(
                    color: _highlight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const TextSpan(text: '와 측정을 위한 '),
                const TextSpan(
                  text: '자',
                  style: TextStyle(
                    color: _highlight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const TextSpan(text: '를 준비해주세요.'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isCompare)
                  _SupplyItem(
                    url: measureGuideAssetUrl(
                      '/images/measure/sweater-tilted.png',
                    ),
                    label: '수선할 의류',
                    inTest: inTest,
                  ),
                _SupplyItem(
                  url: measureGuideAssetUrl(
                    '/images/measure/sweater-front.png',
                  ),
                  label: '평소 잘 맞는 의류',
                  inTest: inTest,
                ),
                _SupplyItem(
                  url: measureGuideAssetUrl('/images/measure/ruler.png'),
                  label: '자',
                  inTest: inTest,
                ),
              ],
            ),
          ),
          if (_isCompare) ...[
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ⓘ',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '수선 맡길 의류와 같은 종류의 의류로 치수를 측정해야 정확한 cm를 재실 수 있습니다.',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.45,
                      color: Colors.grey.shade400,
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 24),
          Text(
            _isCompare ? '잘 맞는 옷과 비교하는 방법' : '치수 재는 방법',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '아래 수선 부위별 치수 재는 안내를 차근차근 따라서 단면 치수를 측정해주세요.',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade400,
            ),
          ),
          const SizedBox(height: 12),
          if (!_isCompare) ...[
            for (final item in _dailyItems) ...[
              _DailyCard(item: item, inTest: inTest),
              const SizedBox(height: 20),
            ],
            if (_dailyNotes.isNotEmpty)
              ..._dailyNotes.map(
                (note) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '·',
                        style: TextStyle(fontSize: 14, color: Color(0xFF4B5563)),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          note,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.45,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
          if (_isCompare && strictlyLocked)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0x0D00C896),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0x4D00C896)),
              ),
              child: Text(
                type.name,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _brand,
                ),
              ),
            ),
          if (_isCompare && !strictlyLocked) ...[
            if (lockType && allowed.length > 1)
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: Text(
                  '이 수선은 아래 가이드를 모두 확인해 주세요',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _brand,
                  ),
                ),
              ),
            _TypeDropdown(
              current: type,
              options: lockType ? allowed : measureGuideTypes,
              open: dropdownOpen,
              onToggle: onToggleDropdown,
              onSelect: onSelectType,
            ),
            const SizedBox(height: 16),
          ],
          if (_isCompare) ...[
            Text.rich(
              TextSpan(
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: Color(0xFF374151),
                ),
                children: [
                  const TextSpan(text: '수선할 의류를 잘 펴서 바닥에 내려놓아준 뒤, 그림과 같이 '),
                  TextSpan(
                    text: '${type.foldBaseline} 기준',
                    style: const TextStyle(
                      color: _highlight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const TextSpan(text: '에 맞춰서 '),
                  const TextSpan(
                    text: '평소 잘 맞는 의류',
                    style: TextStyle(
                      color: _highlight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const TextSpan(text: '를 포개어 주세요.'),
                ],
              ),
            ),
            const SizedBox(height: 8),
            _GuidePicture(
              url: measureGuideAssetUrl(type.foldImage),
              caption: '수선할 의류가 밑에 평소 잘맞는 의류가 위에 오도록\n포개주셔야합니다. (${type.foldNote})',
              inTest: inTest,
            ),
            const SizedBox(height: 20),
            Text.rich(
              TextSpan(
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: Color(0xFF374151),
                ),
                children: [
                  const TextSpan(text: '수선할 의류와 평소 잘 맞는 의류의 '),
                  TextSpan(
                    text: '${type.measurePart} 차이',
                    style: const TextStyle(
                      color: _highlight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const TextSpan(text: '를 '),
                  const TextSpan(
                    text: '자',
                    style: TextStyle(
                      color: _highlight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const TextSpan(
                    text: '를 이용하여 측정한 후, 수선 서비스 신청 단계에서 cm를 입력해주세요.',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            _GuidePicture(
              url: measureGuideAssetUrl(type.compareImage),
              inTest: inTest,
            ),
            if (type.notes.isNotEmpty) ...[
              const SizedBox(height: 16),
              ...type.notes.map(
                (note) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '·',
                        style: TextStyle(fontSize: 14, color: Color(0xFF4B5563)),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          note,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.45,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _MethodTabs extends StatelessWidget {
  static const _brand = Color(0xFF00C896);

  final String tab;
  final ValueChanged<String> onChange;

  const _MethodTabs({required this.tab, required this.onChange});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      child: Row(
        children: [
          _tabButton('daily', '일상적인 방법'),
          _tabButton('compare', '잘맞는 옷과 비교 방법'),
        ],
      ),
    );
  }

  Widget _tabButton(String id, String label) {
    final selected = tab == id;
    return Expanded(
      child: InkWell(
        onTap: () => onChange(id),
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: selected ? _brand : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: selected ? _brand : const Color(0xFF9CA3AF),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DailyCard extends StatelessWidget {
  final MeasureGuideDailyItem item;
  final bool inTest;

  const _DailyCard({required this.item, required this.inTest});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: _GuideImage(
              url: measureGuideAssetUrl(item.image),
              inTest: inTest,
              minHeight: 160,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
            child: Text(
              item.label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF374151),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              item.desc,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                height: 1.45,
                color: Colors.grey.shade500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypeDropdown extends StatelessWidget {
  static const _brand = Color(0xFF00C896);

  final MeasureGuideType current;
  final List<MeasureGuideType> options;
  final bool open;
  final VoidCallback onToggle;
  final ValueChanged<String> onSelect;

  const _TypeDropdown({
    required this.current,
    required this.options,
    required this.open,
    required this.onToggle,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Material(
          color: Colors.white,
          child: InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE5E7EB)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      current.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                  ),
                  AnimatedRotation(
                    turns: open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: Icon(
                      Icons.keyboard_arrow_down,
                      size: 20,
                      color: Colors.grey.shade400,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (open)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFE5E7EB)),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                for (final option in options)
                  InkWell(
                    onTap: () => onSelect(option.id),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: option.id == current.id
                            ? const Color(0x0D00C896)
                            : Colors.white,
                        border: Border(
                          bottom: BorderSide(color: Colors.grey.shade50),
                        ),
                      ),
                      child: Text(
                        option.name,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: option.id == current.id
                              ? FontWeight.w600
                              : FontWeight.w400,
                          color: option.id == current.id
                              ? _brand
                              : const Color(0xFF374151),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _SupplyItem extends StatelessWidget {
  final String url;
  final String label;
  final bool inTest;

  const _SupplyItem({
    required this.url,
    required this.label,
    required this.inTest,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          children: [
            Container(
              height: 110,
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF3F4F6)),
              ),
              child: _GuideImage(url: url, inTest: inTest),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                height: 1.25,
                color: Color(0xFF4B5563),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GuidePicture extends StatelessWidget {
  final String url;
  final String? caption;
  final bool inTest;

  const _GuidePicture({
    required this.url,
    required this.inTest,
    this.caption,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: _GuideImage(url: url, inTest: inTest, minHeight: 160),
          ),
          if (caption != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Text(
                caption!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  height: 1.45,
                  color: Colors.grey.shade500,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GuideImage extends StatelessWidget {
  final String url;
  final bool inTest;
  final double minHeight;

  const _GuideImage({
    required this.url,
    required this.inTest,
    this.minHeight = 80,
  });

  @override
  Widget build(BuildContext context) {
    if (inTest) {
      return SizedBox(height: minHeight);
    }
    return Image.network(
      url,
      fit: BoxFit.contain,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return SizedBox(
          height: minHeight,
          child: const Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Color(0xFF00C896),
              ),
            ),
          ),
        );
      },
      errorBuilder: (_, __, ___) => SizedBox(height: minHeight),
    );
  }
}
