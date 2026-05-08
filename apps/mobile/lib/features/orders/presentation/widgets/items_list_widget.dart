import 'package:flutter/material.dart';

import '../../domain/models/order_draft.dart';
import 'clothing_item_card_widget.dart';

const _brandColor = Color(0xFF00C896);

class ItemsListWidget extends StatelessWidget {
  final List<ClothingItem> items;
  final VoidCallback onAddItem;
  final void Function(int index) onRemoveItem;
  final VoidCallback onProceedToPickup;
  final VoidCallback onSaveToCart;

  const ItemsListWidget({
    required this.items,
    required this.onAddItem,
    required this.onRemoveItem,
    required this.onProceedToPickup,
    required this.onSaveToCart,
    super.key,
  });

  String _formatPrice(int n) {
    return '${n.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}원';
  }

  @override
  Widget build(BuildContext context) {
    final totalRepairItems = items.fold<int>(
      0,
      (sum, it) => sum + it.repairItems.length,
    );
    final totalRepairPrice = items.fold<int>(
      0,
      (sum, it) =>
          sum +
          it.repairItems.fold<int>(
            0,
            (s, r) => s + r.price * r.quantity,
          ),
    );

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '수선할 의류를 담아주세요',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '여러 벌을 한 번에 신청할 수 있습니다.',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Items or empty state
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: items.isEmpty
                    ? Container(
                        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: Colors.grey.shade200,
                            width: 2,
                            strokeAlign: BorderSide.strokeAlignInside,
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            Text(
                              '아직 의류가 추가되지 않았어요.',
                              style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                            ),
                            const SizedBox(height: 4),
                            RichText(
                              text: TextSpan(
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                                children: const [
                                  TextSpan(text: '아래 '),
                                  TextSpan(
                                    text: '+ 의류 추가',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: _brandColor,
                                    ),
                                  ),
                                  TextSpan(text: ' 버튼으로 시작하세요.'),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                    : Column(
                        children: [
                          ...List.generate(items.length, (idx) {
                            return Padding(
                              padding: EdgeInsets.only(bottom: idx < items.length - 1 ? 12 : 0),
                              child: ClothingItemCardWidget(
                                index: idx,
                                item: items[idx],
                                onRemove: () => onRemoveItem(idx),
                              ),
                            );
                          }),
                        ],
                      ),
              ),
              const SizedBox(height: 12),

              // Add button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: InkWell(
                  onTap: onAddItem,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      border: Border.all(color: _brandColor, width: 2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.add, size: 16, color: _brandColor),
                        const SizedBox(width: 8),
                        Text(
                          items.isEmpty ? '의류 추가하기' : '의류 추가',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: _brandColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Summary
              if (items.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _brandColor.withOpacity(0.05),
                    border: Border.all(color: _brandColor.withOpacity(0.2)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '총 수선 항목',
                            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                          ),
                          Text(
                            '${totalRepairItems}개',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                        ],
                      ),
                      Divider(height: 16, color: _brandColor.withOpacity(0.2)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            '예상 수선비',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          Text(
                            '${_formatPrice(totalRepairPrice)}~',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: _brandColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '배송비는 다음 단계에서 추가됩니다.',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 100),
            ],
          ),
        ),

        // Bottom action buttons
        if (items.isNotEmpty)
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade100)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  InkWell(
                    onTap: onSaveToCart,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      decoration: BoxDecoration(
                        border: Border.all(color: _brandColor),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.shopping_cart_outlined, size: 16, color: _brandColor),
                          SizedBox(width: 4),
                          Text(
                            '담기',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: _brandColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: onProceedToPickup,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _brandColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '수거 정보 입력',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(Icons.chevron_right, size: 18),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
