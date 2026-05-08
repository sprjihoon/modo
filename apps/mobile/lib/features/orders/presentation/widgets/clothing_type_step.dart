import 'package:flutter/material.dart';

import '../../../../services/repair_service.dart';
import '../../../../core/widgets/category_icon_widget.dart';

const _brandColor = Color(0xFF00C896);

class ClothingTypeStep extends StatefulWidget {
  final void Function(String typeName, String categoryId, String? iconName) onSelect;

  const ClothingTypeStep({required this.onSelect, super.key});

  @override
  State<ClothingTypeStep> createState() => _ClothingTypeStepState();
}

class _ClothingTypeStepState extends State<ClothingTypeStep> {
  final _repairService = RepairService();
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = true;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await _repairService.getCategories();
      if (mounted) {
        setState(() {
          _categories = categories;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('카테고리 로드 실패: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(_brandColor),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, 4),
          child: Text(
            '어떤 의류를 수선하시나요?',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Text(
            '의류 종류를 선택해주세요',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            itemCount: _categories.length,
            separatorBuilder: (_, __) => const SizedBox(height: 0),
            itemBuilder: (context, index) {
              final cat = _categories[index];
              final name = cat['name'] as String;
              final iconName = cat['icon_name'] as String?;
              final id = cat['id'] as String;
              final isSelected = _selectedId == id;

              return ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? _brandColor.withOpacity(0.15)
                        : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: CategoryIconWidget(
                      iconName: iconName,
                      size: 28,
                      color: isSelected ? _brandColor : Colors.grey.shade600,
                    ),
                  ),
                ),
                title: Text(
                  name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? _brandColor : Colors.black87,
                  ),
                ),
                trailing: Icon(
                  Icons.arrow_forward_ios,
                  size: 16,
                  color: isSelected ? _brandColor : Colors.grey.shade400,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                tileColor: isSelected ? _brandColor.withOpacity(0.05) : null,
                onTap: () {
                  setState(() => _selectedId = id);
                  widget.onSelect(name, id, iconName);
                },
              );
            },
          ),
        ),

        // Price guide link
        Container(
          margin: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.grey.shade600, size: 18),
              const SizedBox(width: 10),
              const Text(
                '수선 가격표 확인하기',
                style: TextStyle(
                  fontSize: 13,
                  color: _brandColor,
                  decoration: TextDecoration.underline,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
