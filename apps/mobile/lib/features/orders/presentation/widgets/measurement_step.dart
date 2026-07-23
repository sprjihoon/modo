import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/measure_guide.dart';
import '../../../../core/widgets/category_icon_widget.dart';
import 'measure_guide_accordion.dart';

/// 웹 MeasurementStep과 동일한 직접가격 카테고리용 치수 입력 UI.
class MeasurementStepConfig {
  final String itemName;
  final String? subType;
  final List<String> labels;
  final int? price;
  final String? iconName;
  final String? notes;
  final String? measureGuideKey;
  final String? clothingHint;

  const MeasurementStepConfig({
    required this.itemName,
    required this.labels,
    this.subType,
    this.price,
    this.iconName,
    this.notes,
    this.measureGuideKey,
    this.clothingHint,
  });
}

class MeasurementStep extends StatefulWidget {
  final MeasurementStepConfig config;
  final void Function(List<String> values) onConfirm;
  final VoidCallback onBack;

  const MeasurementStep({
    required this.config,
    required this.onConfirm,
    required this.onBack,
    super.key,
  });

  @override
  State<MeasurementStep> createState() => _MeasurementStepState();
}

class _MeasurementStepState extends State<MeasurementStep> {
  static const _brandColor = Color(0xFF00C896);

  late List<TextEditingController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      widget.config.labels.length,
      (_) => TextEditingController(),
    );
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _hasAnyValue =>
      _controllers.any((c) => c.text.trim().isNotEmpty);

  List<String> get _values =>
      _controllers.map((c) => c.text.trim()).toList();

  String get _displayName {
    final sub = widget.config.subType;
    if (sub != null && sub.isNotEmpty) {
      return '${widget.config.itemName} ($sub)';
    }
    return widget.config.itemName;
  }

  List<String> get _noteLines {
    final notes = widget.config.notes?.trim();
    if (notes == null || notes.isEmpty) return const [];
    return notes
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();
  }

  String? get _guideTypeId => resolveMeasureGuideId(
        widget.config.itemName,
        measureGuideKey: widget.config.measureGuideKey,
        clothingHint: widget.config.clothingHint,
      );

  String _formatPrice(int price) {
    final s = price.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return '${buf.toString()}원';
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: widget.onBack,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.grey.shade500,
              side: BorderSide(color: Colors.grey.shade200),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              '이전',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: ElevatedButton(
            onPressed: _hasAnyValue ? () => widget.onConfirm(_values) : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: _brandColor,
              foregroundColor: Colors.white,
              disabledBackgroundColor: _brandColor.withValues(alpha: 0.4),
              disabledForegroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: const Text(
              '확인',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final config = widget.config;
    final price = config.price;

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
          ),
          child: const Text(
            '치수를 입력해주세요',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _brandColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: CategoryIconWidget(
                          iconName: config.iconName,
                          size: 28,
                          color: _brandColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _displayName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (price != null && price > 0)
                            Text(
                              _formatPrice(price),
                              style: const TextStyle(
                                fontSize: 12,
                                color: _brandColor,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              ...config.labels.asMap().entries.map((entry) {
                final index = entry.key;
                final label = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF374151),
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _controllers[index],
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                            RegExp(r'[0-9.]'),
                          ),
                        ],
                        decoration: InputDecoration(
                          hintText: '예: 30',
                          hintStyle: TextStyle(color: Colors.grey.shade400),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: Colors.grey.shade100,
                              width: 2,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: Colors.grey.shade100,
                              width: 2,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: _brandColor,
                              width: 2,
                            ),
                          ),
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                    ],
                  ),
                );
              }),
              if (_noteLines.isNotEmpty) ...[
                const SizedBox(height: 8),
                ..._noteLines.map(
                  (line) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '•',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            line,
                            style: TextStyle(
                              fontSize: 12,
                              height: 1.4,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 8),
              // 확인/이전: 치수 재는 방법보다 위
              _buildActionButtons(),
              const SizedBox(height: 16),
              MeasureGuideAccordion(initialTypeId: _guideTypeId),
              SizedBox(height: MediaQuery.paddingOf(context).bottom + 8),
            ],
          ),
        ),
      ],
    );
  }
}
