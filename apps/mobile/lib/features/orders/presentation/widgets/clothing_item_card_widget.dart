import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../domain/models/order_draft.dart';
import '../../../../core/widgets/category_icon_widget.dart';

const _brandColor = Color(0xFF00C896);

class ClothingItemCardWidget extends StatelessWidget {
  final int index;
  final ClothingItem item;
  final VoidCallback onRemove;

  const ClothingItemCardWidget({
    required this.index,
    required this.item,
    required this.onRemove,
    super.key,
  });

  String _formatPrice(int n) {
    return '${n.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}원';
  }

  @override
  Widget build(BuildContext context) {
    final thumb = item.imagesWithPins.isNotEmpty
        ? item.imagesWithPins.first.imageUrl
        : null;
    final repairTotal = item.repairItems.fold<int>(
      0,
      (sum, r) => sum + r.price * r.quantity,
    );

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade100),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              clipBehavior: Clip.antiAlias,
              child: thumb != null
                  ? CachedNetworkImage(
                      imageUrl: thumb,
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                      errorWidget: (_, __, ___) =>
                          const Icon(Icons.broken_image, color: Colors.grey),
                    )
                  : item.iconName != null
                      ? Center(
                          child: CategoryIconWidget(
                            iconName: item.iconName,
                            size: 32,
                            color: Colors.grey.shade400,
                          ),
                        )
                      : Icon(Icons.content_cut, size: 24, color: Colors.grey.shade300),
            ),
            const SizedBox(width: 12),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _brandColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '의류 ${index + 1}',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: _brandColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          item.clothingType.isNotEmpty ? item.clothingType : '의류',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '수선 ${item.repairItems.length}개',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      if (repairTotal > 0) ...[
                        const SizedBox(width: 8),
                        Text(
                          '${_formatPrice(repairTotal)}~',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _brandColor,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      ...item.repairItems.take(4).map((r) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _brandColor.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: _brandColor.withOpacity(0.2)),
                            ),
                            child: Text(
                              r.name,
                              style: const TextStyle(fontSize: 10, color: _brandColor),
                            ),
                          )),
                      if (item.repairItems.length > 4)
                        Text(
                          '+${item.repairItems.length - 4}개',
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade400),
                        ),
                    ],
                  ),
                  if (item.repairItems.any((r) => r.detail != null && r.detail!.isNotEmpty)) ...[
                    const SizedBox(height: 4),
                    ...item.repairItems
                        .where((r) => r.detail != null && r.detail!.isNotEmpty)
                        .map((r) => Text(
                              r.detail!,
                              style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                            )),
                  ],
                ],
              ),
            ),

            // Delete button
            GestureDetector(
              onTap: onRemove,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(Icons.delete_outline, size: 18, color: Colors.grey.shade300),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
