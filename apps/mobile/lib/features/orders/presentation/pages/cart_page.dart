import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../providers/cart_provider.dart';

/// 장바구니 페이지
class CartPage extends ConsumerStatefulWidget {
  const CartPage({super.key});

  @override
  ConsumerState<CartPage> createState() => _CartPageState();
}

class _CartPageState extends ConsumerState<CartPage> {
  final Set<String> _selectedItemIds = {};

  @override
  Widget build(BuildContext context) {
    final cartItems = ref.watch(cartProvider);
    final totalPrice = ref.watch(cartTotalPriceProvider);
    final totalItemCount = ref.watch(cartItemCountProvider);
    
    // 선택된 항목들의 총 가격 및 개수
    final selectedItems = cartItems.where((item) => _selectedItemIds.contains(item.id)).toList();
    final selectedTotalPrice = selectedItems.fold(0, (sum, item) => sum + item.price);
    final selectedItemCount = selectedItems.length;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '장바구니',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          if (cartItems.isNotEmpty)
            TextButton(
              onPressed: () {
                if (_selectedItemIds.length == cartItems.length) {
                  // 전체 선택 해제
                  setState(() {
                    _selectedItemIds.clear();
                  });
                } else {
                  // 전체 선택
                  setState(() {
                    _selectedItemIds.addAll(cartItems.map((item) => item.id));
                  });
                }
              },
              child: Text(
                _selectedItemIds.length == cartItems.length ? '전체 해제' : '전체 선택',
                style: const TextStyle(
                  color: Color(0xFF00C896),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
      body: cartItems.isEmpty
          ? _buildEmptyState(context)
          : Column(
              children: [
                // 선택 안내
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  color: const Color(0xFF00C896).withOpacity(0.1),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.touch_app,
                        size: 18,
                        color: Color(0xFF00C896),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '항목을 터치하여 선택하세요 (${_selectedItemIds.length}/${cartItems.length}개 선택)',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF00C896),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // 장바구니 항목 리스트
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(20),
                    itemCount: cartItems.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final cartItem = cartItems[index];
                      final isSelected = _selectedItemIds.contains(cartItem.id);
                      return _buildCartItemCard(context, ref, cartItem, index, isSelected);
                    },
                  ),
                ),
                
                // 하단 결제 영역
                Container(
                  padding: const EdgeInsets.all(20),
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
                  child: SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // 총 금액 표시
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '선택 ${_selectedItemIds.length}개 / 전체 ${cartItems.length}개',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                                Text(
                                  '총 ${_selectedItemIds.isEmpty ? totalItemCount : selectedItemCount}개 항목',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey.shade800,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  (_selectedItemIds.isEmpty ? totalPrice : selectedTotalPrice).toString().replaceAllMapped(
                                    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                    (Match m) => '${m[1]},',
                                  ),
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black87,
                                  ),
                                ),
                                const Text(
                                  ' 원',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black87,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // 수거신청 버튼
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: (_selectedItemIds.isEmpty || selectedItems.isEmpty)
                                ? null
                                : () => _proceedToCheckout(context, selectedItems),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: (_selectedItemIds.isEmpty || selectedItems.isEmpty)
                                  ? Colors.grey.shade300
                                  : const Color(0xFF00C896),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                              minimumSize: const Size(double.infinity, 54),
                            ),
                            child: Text(
                              _selectedItemIds.isEmpty
                                  ? '항목을 선택해주세요'
                                  : '선택 항목 수거신청 (${_selectedItemIds.length}개)',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  /// 장바구니 항목 카드
  Widget _buildCartItemCard(BuildContext context, WidgetRef ref, CartItem cartItem, int index, bool isSelected) {
    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            _selectedItemIds.remove(cartItem.id);
          } else {
            _selectedItemIds.add(cartItem.id);
          }
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF00C896)
                : Colors.grey.shade200,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
          // 헤더
          Row(
            children: [
              // 선택 체크박스
              Checkbox(
                value: isSelected,
                onChanged: (value) {
                  setState(() {
                    if (value == true) {
                      _selectedItemIds.add(cartItem.id);
                    } else {
                      _selectedItemIds.remove(cartItem.id);
                    }
                  });
                },
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
                activeColor: const Color(0xFF00C896),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF00C896) : Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '항목 ${index + 1}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                onPressed: () {
                  _selectedItemIds.remove(cartItem.id);
                  ref.read(cartProvider.notifier).removeFromCart(cartItem.id);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('장바구니에서 제거되었습니다'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // 썸네일과 항목 요약
          Row(
            children: [
              // 썸네일
              if (cartItem.imageUrls.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(
                    imageUrl: cartItem.imageUrls.first,
                    width: 60,
                    height: 60,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      width: 60,
                      height: 60,
                      color: Colors.grey.shade200,
                      child: const Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      width: 60,
                      height: 60,
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.image_outlined, size: 25),
                    ),
                  ),
                ),
              
              const SizedBox(width: 12),
              
              // 항목 정보
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cartItem.repairItem['repairPart'] as String,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${cartItem.repairItem['scope']} · ${cartItem.repairItem['measurement']}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 8),
          
          // 가격
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '예상 가격',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                ),
              ),
              Text(
                '${cartItem.price.toString().replaceAllMapped(
                  RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                  (Match m) => '${m[1]},',
                )}원',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF00C896),
                ),
              ),
            ],
          ),
          ],
        ),
      ),
    );
  }

  /// 빈 장바구니 UI
  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            '장바구니가 비어있습니다',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '수선 항목을 담아보세요',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              // 홈으로 이동 후 의류 선택 페이지로
              context.go('/home');
              // 잠시 후 의류 선택 페이지 열기
              Future.delayed(const Duration(milliseconds: 300), () {
                context.push('/select-clothing-type', extra: <String>[]);
              });
            },
            icon: const Icon(Icons.add),
            label: const Text('수선 신청하기'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00C896),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 결제 진행
  void _proceedToCheckout(BuildContext context, List<CartItem> selectedItems) {
    // 선택되지 않은 항목 확인
    final cartItems = ref.read(cartProvider);
    final unselectedCount = cartItems.length - selectedItems.length;
    
    if (unselectedCount > 0) {
      // 확인 다이얼로그 표시
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('수거신청 확인'),
          content: Text(
            '선택된 ${selectedItems.length}개 세트만 수거신청하고,\n선택되지 않은 $unselectedCount개 세트는 장바구니에 남겨둡니다.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _confirmCheckout(context, selectedItems);
              },
              child: const Text('확인', style: TextStyle(color: Color(0xFF00C896), fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      _confirmCheckout(context, selectedItems);
    }
  }
  
  /// 결제 확정
  void _confirmCheckout(BuildContext context, List<CartItem> selectedItems) {
    // 선택된 항목들을 하나로 합침
    final allRepairItems = <Map<String, dynamic>>[];
    final allImageUrls = <String>[];
    final allImagesWithPins = <Map<String, dynamic>>[];
    
    for (var item in selectedItems) {
      allRepairItems.add(item.repairItem); // 각 카드에 1개 항목만 있음
      allImageUrls.addAll(item.imageUrls);
      if (item.imagesWithPins != null) {
        allImagesWithPins.addAll(item.imagesWithPins!);
      }
    }
    
    // 중복 제거
    final uniqueImageUrls = allImageUrls.toSet().toList();
    
    // 수거신청 페이지로 이동
    context.push('/pickup-request', extra: {
      'repairItems': allRepairItems,
      'imageUrls': uniqueImageUrls,
      'imagesWithPins': allImagesWithPins.isEmpty ? null : allImagesWithPins,
      'cartItemIds': selectedItems.map((item) => item.id).toList(), // 결제 완료 후 제거용
    });
  }
}

