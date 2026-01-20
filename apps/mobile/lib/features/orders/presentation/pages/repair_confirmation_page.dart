import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../domain/models/image_pin.dart';
import '../../providers/repair_items_provider.dart';
import '../../providers/cart_provider.dart';

/// 수선 확인 페이지 (선택한 항목 및 가격 표시)
class RepairConfirmationPage extends ConsumerStatefulWidget {
  final List<Map<String, dynamic>> repairItems; // 선택한 수선 항목들 (itemImages 포함)
  final List<String> imageUrls;
  
  const RepairConfirmationPage({
    required this.repairItems, required this.imageUrls, super.key,
  });

  @override
  ConsumerState<RepairConfirmationPage> createState() => _RepairConfirmationPageState();
}

class _RepairConfirmationPageState extends ConsumerState<RepairConfirmationPage> {
  bool _agreeToTerms = false;
  final Set<int> _selectedItemIndices = {}; // 선택된 항목 인덱스
  
  @override
  void initState() {
    super.initState();
    // 페이지 로드 시 Provider를 현재 페이지의 항목으로 정확히 설정 (중복 방지)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      debugPrint('📝 RepairConfirmation 초기화: ${widget.repairItems.length}개 항목');
      
      // Provider를 완전히 교체 (setItems에서 자동으로 깊은 복사됨)
      ref.read(repairItemsProvider.notifier).setItems(widget.repairItems);
      
      // 처음에는 모든 항목 선택
      setState(() {
        for (int i = 0; i < widget.repairItems.length; i++) {
          _selectedItemIndices.add(i);
        }
      });
    });
  }
  
  @override
  void dispose() {
    // 페이지 종료 시 Provider 초기화하지 않음 (다른 의류 추가 시 유지 필요)
    super.dispose();
  }
  
  /// 핀 개수 계산
  int _countPins(List<Map<String, dynamic>> imagesWithPins) {
    int totalPins = 0;
    for (var imageData in imagesWithPins) {
      final pinsData = imageData['pins'] as List?;
      if (pinsData != null) {
        totalPins += pinsData.length;
      }
    }
    return totalPins;
  }
  
  /// 수선 항목 수정
  void _editRepairItem(int index, Map<String, dynamic> item) async {
    // 수치 수정 다이얼로그
    final measurement = item['measurement'] as String;
    final controller = TextEditingController(text: measurement.replaceAll('cm', '').trim());
    
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('수치 수정 - ${item['repairPart']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '현재: $measurement',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: '새로운 치수 (cm)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                suffixText: 'cm',
              ),
              autofocus: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context, controller.text);
            },
            child: const Text('수정', style: TextStyle(color: Color(0xFF00C896), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    
    if (result != null && result.isNotEmpty && mounted) {
      // 항목 업데이트
      final updatedItems = List<Map<String, dynamic>>.from(widget.repairItems);
      updatedItems[index] = {
        ...item,
        'measurement': '${result}cm',
      };
      
      ref.read(repairItemsProvider.notifier).setItems(updatedItems);
      
      // 페이지 새로고침
      context.pushReplacement('/repair-confirmation', extra: {
        'repairItems': updatedItems,
        'imageUrls': widget.imageUrls,
      },);
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('수치가 수정되었습니다'),
          backgroundColor: Color(0xFF00C896),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }
  
  /// 의류 상세 페이지 표시
  void _showRepairItemDetail(BuildContext context, Map<String, dynamic> item, int index) {
    // 항목에 저장된 이미지 데이터 사용
    final itemImages = item['itemImages'] as List<Map<String, dynamic>>?;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) {
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              children: [
                // 핸들
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                
                // 헤더
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00C896),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '의류 ${index + 1}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          item['repairPart'] as String,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, color: Color(0xFF00C896)),
                        onPressed: () {
                          Navigator.pop(context);
                          _editRepairItem(index, item);
                        },
                        tooltip: '수정',
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () {
                          Navigator.pop(context);
                          _deleteRepairItem(index);
                        },
                        tooltip: '삭제',
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                
                const Divider(height: 1),
                
                // 내용
                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 가격
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00C896).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '예상 가격',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.black87,
                                ),
                              ),
                              Text(
                                item['priceRange'] as String,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF00C896),
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        const SizedBox(height: 20),
                        
                        // 수선 정보
                        Text(
                          '수선 정보',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildInfoRow('범위', item['scope'] as String),
                        _buildInfoRow('치수', item['measurement'] as String),
                        
                        // 이미지와 핀
                        if (itemImages != null && itemImages.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            '첨부 사진 및 수선 부위',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey.shade700,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildRepairItemImages(itemImages),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
  
  /// 정보 행 빌더
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  /// 수선 항목 삭제
  void _deleteRepairItem(int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('항목 삭제'),
        content: const Text('이 수선 항목을 삭제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              
              // Provider에서 항목 제거
              ref.read(repairItemsProvider.notifier).removeItem(index);
              final updatedItems = ref.read(repairItemsProvider);
              
              if (updatedItems.isEmpty) {
                // 모든 항목이 삭제되면 홈으로 이동
                context.go('/home');
              } else {
                // 페이지 새로고침
                context.pushReplacement('/repair-confirmation', extra: {
                  'repairItems': updatedItems,
                  'imageUrls': widget.imageUrls,
                },);
              }
            },
            child: const Text('삭제', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
  
  /// 수거신청 진행
  void _proceedToPickup() {
    final selectedItems = _selectedItemIndices
        .map((index) => widget.repairItems[index])
        .toList();
    final unselectedCount = widget.repairItems.length - _selectedItemIndices.length;
    
    if (unselectedCount > 0) {
      // 선택되지 않은 항목이 있으면 확인
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('수거신청 확인'),
          content: Text(
            '선택된 ${_selectedItemIndices.length}개 항목만 수거신청하고,\n선택되지 않은 $unselectedCount개 항목은 삭제됩니다.\n\n계속하시겠습니까?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _confirmPickup(selectedItems);
              },
              child: const Text('수거신청', style: TextStyle(color: Color(0xFF00C896), fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      _confirmPickup(selectedItems);
    }
  }
  
  /// 수거신청 확정
  void _confirmPickup(List<Map<String, dynamic>> selectedItems) {
    // Provider 초기화
    ref.read(repairItemsProvider.notifier).clear();
    
    // 수거신청 페이지로 이동
    context.push('/pickup-request', extra: {
      'repairItems': selectedItems,
      'imageUrls': widget.imageUrls,
    },);
  }
  
  /// 장바구니에 담기
  Future<void> _addToCart() async {
    final selectedItems = _selectedItemIndices
        .map((index) => widget.repairItems[index])
        .toList();
    final unselectedCount = widget.repairItems.length - _selectedItemIndices.length;
    
    if (unselectedCount > 0) {
      // 선택되지 않은 항목이 있으면 확인
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('장바구니 담기 확인'),
          content: Text(
            '선택된 ${_selectedItemIndices.length}개 항목만 장바구니에 담고,\n선택되지 않은 $unselectedCount개 항목은 삭제됩니다.\n\n계속하시겠습니까?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                await _confirmAddToCart(selectedItems);
              },
              child: const Text('장바구니에 담기', style: TextStyle(color: Color(0xFF00C896), fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      await _confirmAddToCart(selectedItems);
    }
  }
  
  /// 장바구니 담기 확정
  Future<void> _confirmAddToCart(List<Map<String, dynamic>> selectedItems) async {
    // 장바구니에 추가
    await ref.read(cartProvider.notifier).addToCart(
      repairItems: selectedItems,
      imageUrls: widget.imageUrls,
    );
    
    // Provider 초기화
    ref.read(repairItemsProvider.notifier).clear();
    
    // 장바구니 아이콘 배지로 추가된 것을 확인할 수 있으므로 SnackBar 없이 홈으로 이동
    // (SnackBar는 페이지 이동 시 사라지지 않는 문제가 있음)
    context.go('/home');
  }
  
  /// 다른 의류 추가하기
  void _addAnotherClothing() {
    debugPrint('🔄 다른 의류 추가: 현재 ${widget.repairItems.length}개 항목 유지');
    
    // Provider에 저장 (setItems에서 자동으로 깊은 복사됨)
    ref.read(repairItemsProvider.notifier).setItems(widget.repairItems);
    
    // 현재 페이지를 닫고 의류 선택 페이지로 이동
    // 새로운 의류는 빈 이미지 리스트로 시작 (독립적인 세션)
    context.pop();
    context.push('/select-clothing-type', extra: <String>[]);
  }
  
  // 선택된 항목의 총 가격 계산
  int _calculateSelectedTotalPrice() {
    int total = 0;
    for (int index in _selectedItemIndices) {
      if (index < widget.repairItems.length) {
        final item = widget.repairItems[index];
      final priceRange = item['priceRange'] as String;
      final prices = priceRange.split('~');
      if (prices.isNotEmpty) {
        final minPrice = prices[0]
            .replaceAll('원', '')
            .replaceAll(',', '')
            .replaceAll('부위당', '')
            .trim();
        total += int.tryParse(minPrice) ?? 0;
        }
      }
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final selectedTotalPrice = _calculateSelectedTotalPrice();
    
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '수선',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: () {
              context.go('/home');
            },
            child: const Text(
              '나가기',
              style: TextStyle(
                color: Colors.black54,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  
                  // 총 정찰가격
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF00C896).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '선택된 항목',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        Text(
                          '${_selectedItemIndices.length}개',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF00C896),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '선택 항목 예상 가격',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              selectedTotalPrice.toString().replaceAllMapped(
                                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                (Match m) => '${m[1]},',
                              ),
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                            const Text(
                              ' 원',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // 선택 안내
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF00C896).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
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
                      '신청할 항목을 선택해주세요 (${_selectedItemIndices.length}/${widget.repairItems.length}개)',
                      style: const TextStyle(
                        fontSize: 12,
                            color: Color(0xFF00C896),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        if (_selectedItemIndices.length == widget.repairItems.length) {
                          _selectedItemIndices.clear();
                        } else {
                          _selectedItemIndices.clear();
                          for (int i = 0; i < widget.repairItems.length; i++) {
                            _selectedItemIndices.add(i);
                          }
                        }
                      });
                    },
                    child: Text(
                      _selectedItemIndices.length == widget.repairItems.length ? '전체해제' : '전체선택',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF00C896),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
                  
                  // 수선 항목 리스트 (각 항목의 사진과 핀 포함)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: widget.repairItems.asMap().entries.map((entry) {
                        final index = entry.key;
                        final item = entry.value;
                        
                        // 항목에 저장된 이미지 데이터 사용 (올바른 타입 캐스팅)
                        final itemImages = item['itemImages'] != null
                            ? (item['itemImages'] as List<dynamic>)
                                .map((e) => e as Map<String, dynamic>)
                                .toList()
                            : null;
                        
                  final isSelected = _selectedItemIndices.contains(index);
                  
                  return InkWell(
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedItemIndices.remove(index);
                        } else {
                          _selectedItemIndices.add(index);
                        }
                      });
                    },
                    onLongPress: () {
                      // 길게 누르면 상세 페이지
                      _showRepairItemDetail(context, item, index);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                          color: isSelected
                              ? const Color(0xFF00C896)
                              : Colors.grey.shade300,
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
                          Row(
                            children: [
                              // 선택 체크박스
                              Checkbox(
                                value: isSelected,
                                onChanged: (value) {
                                  setState(() {
                                    if (value == true) {
                                      _selectedItemIndices.add(index);
                                    } else {
                                      _selectedItemIndices.remove(index);
                                    }
                                  });
                                },
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                activeColor: const Color(0xFF00C896),
                              ),
                              // 썸네일 이미지
                              if (itemImages != null && itemImages.isNotEmpty)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: CachedNetworkImage(
                                    imageUrl: itemImages.first['imagePath'] as String,
                                    width: 80,
                                    height: 80,
                                    fit: BoxFit.cover,
                                    placeholder: (context, url) => Container(
                                      width: 80,
                                      height: 80,
                                      color: Colors.grey.shade200,
                                      child: const Center(
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                    ),
                                    errorWidget: (context, url, error) => Container(
                                      width: 80,
                                      height: 80,
                                      color: Colors.grey.shade200,
                                      child: const Icon(Icons.image_outlined, size: 30),
                                    ),
                                  ),
                                ),
                              const SizedBox(width: 12),
                              
                              // 항목 정보
                              Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // 항목 헤더
                              Row(
                                children: [
                                  Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF00C896),
                                            borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '의류 ${index + 1}',
                                      style: const TextStyle(
                                              fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                        const Spacer(),
                                        // 수정 버튼
                                        InkWell(
                                          onTap: () => _editRepairItem(index, item),
                                          child: const Padding(
                                            padding: EdgeInsets.all(4),
                                            child: Icon(
                                              Icons.edit_outlined,
                                              color: Color(0xFF00C896),
                                              size: 18,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        // 삭제 버튼
                                        InkWell(
                                          onTap: () => _deleteRepairItem(index),
                                          child: const Padding(
                                            padding: EdgeInsets.all(4),
                                            child: Icon(
                                              Icons.delete_outline,
                                              color: Colors.red,
                                              size: 18,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      item['repairPart'] as String,
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
                                      '${item['scope']} · ${item['measurement']}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey.shade600,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                  Text(
                                    item['priceRange'] as String,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF00C896),
                                    ),
                                  ),
                                ],
                              ),
                              ),
                            ],
                          ),
                          
                          // 핀 개수 표시
                              if (itemImages != null && itemImages.isNotEmpty) ...[
                                const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF00C896).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.push_pin,
                                    size: 14,
                                    color: Color(0xFF00C896),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '수선 부위 ${_countPins(itemImages)}개 표시됨',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF00C896),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // 의류 추가 버튼
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SizedBox(
                width: double.infinity,
                    child: OutlinedButton.icon(
                  onPressed: _addAnotherClothing,
                      icon: const Icon(Icons.add_circle_outline, size: 20),
                      label: const Text('다른 의류 추가하기'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF00C896),
                        side: const BorderSide(color: Color(0xFF00C896), width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                    ),
                        ),
                      ),
                    ),
                  ),
                  
            const SizedBox(height: 24),
            
            // 동의 체크박스 (페이지 내)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: InkWell(
                    onTap: () {
                      setState(() {
                        _agreeToTerms = !_agreeToTerms;
                      });
                    },
                    child: Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: Checkbox(
                            value: _agreeToTerms,
                            onChanged: (value) {
                              setState(() {
                                _agreeToTerms = value ?? false;
                              });
                            },
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            activeColor: const Color(0xFF00C896),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              style: const TextStyle(
                                fontSize: 13,
                                color: Colors.black87,
                              ),
                              children: [
                                const TextSpan(
                                  text: '수선 신청 시, ',
                                ),
                                TextSpan(
                                  text: '입고 후 추가 결제 요청이 있을 수 있습니다',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.red.shade700,
                                  ),
                                ),
                                const TextSpan(text: '.'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
            ),
            
                  const SizedBox(height: 16),
                  
            // 등록하기 버튼 (페이지 내, 가로 꽉 찬 형태)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (_agreeToTerms && _selectedItemIndices.isNotEmpty)
                      ? () => _proceedToPickup()
                        : null,
                    style: ElevatedButton.styleFrom(
                    backgroundColor: (_agreeToTerms && _selectedItemIndices.isNotEmpty)
                          ? const Color(0xFF00C896)
                          : Colors.grey.shade300,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    minimumSize: const Size(double.infinity, 54),
                  ),
                  child: Text(
                    _selectedItemIndices.isEmpty
                        ? '항목을 선택해주세요'
                        : '선택 항목 수거신청 (${_selectedItemIndices.length}개)',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ),
            ),
            
            const SizedBox(height: 12),
            
            // 장바구니에 담기 버튼
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SizedBox(
      width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: (_agreeToTerms && _selectedItemIndices.isNotEmpty)
                      ? () async => await _addToCart()
                      : null,
                  icon: const Icon(Icons.shopping_cart_outlined, size: 20),
                  label: Text(
                    _selectedItemIndices.isEmpty
                        ? '항목을 선택해주세요'
                        : '선택 항목 장바구니에 담기 (${_selectedItemIndices.length}개)',
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: (_agreeToTerms && _selectedItemIndices.isNotEmpty)
                        ? const Color(0xFF00C896)
                        : Colors.grey.shade400,
                    side: BorderSide(
                      color: (_agreeToTerms && _selectedItemIndices.isNotEmpty)
                          ? const Color(0xFF00C896)
                          : Colors.grey.shade300,
                      width: 1.5,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    minimumSize: const Size(double.infinity, 54),
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }


  /// 각 수선 항목의 사진과 핀 표시
  Widget _buildRepairItemImages(List<Map<String, dynamic>> imagesWithPins) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '📸 첨부 사진 (${imagesWithPins.length}장)',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        ...imagesWithPins.map((imageData) {
          final imagePath = imageData['imagePath'] as String;
          final pinsData = imageData['pins'] as List?;
          final pins = pinsData?.map((p) {
            if (p is Map<String, dynamic>) {
              return ImagePin.fromJson(p);
            }
            return null;
          }).whereType<ImagePin>().toList() ?? [];

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 사진
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(
                    imageUrl: imagePath,
                    height: 120,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      height: 120,
                      color: Colors.grey.shade200,
                      child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    ),
                    errorWidget: (context, url, error) => Container(
                      height: 120,
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.error, size: 30),
                    ),
                  ),
                ),
                
                // 핀과 메모
                if (pins.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ...pins.asMap().entries.map((pinEntry) {
                    final pinIndex = pinEntry.key;
                    final pin = pinEntry.value;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 18,
                            height: 18,
                            decoration: const BoxDecoration(
                              color: Color(0xFF00C896),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                '${pinIndex + 1}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              pin.memo.isEmpty ? '(메모 없음)' : pin.memo,
                              style: TextStyle(
                                fontSize: 12,
                                color: pin.memo.isEmpty ? Colors.grey.shade400 : Colors.grey.shade700,
                                fontStyle: pin.memo.isEmpty ? FontStyle.italic : FontStyle.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ],
            ),
          );
        }),
      ],
    );
  }
}

