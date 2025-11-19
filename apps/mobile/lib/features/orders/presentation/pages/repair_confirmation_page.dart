import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../domain/models/image_pin.dart';

/// 수선 확인 페이지 (선택한 항목 및 가격 표시)
class RepairConfirmationPage extends ConsumerStatefulWidget {
  final List<Map<String, dynamic>> repairItems; // 선택한 수선 항목들
  final List<String> imageUrls;
  final List<Map<String, dynamic>>? imagesWithPins; // 핀 정보 포함
  
  const RepairConfirmationPage({
    required this.repairItems, required this.imageUrls, super.key,
    this.imagesWithPins,
  });

  @override
  ConsumerState<RepairConfirmationPage> createState() => _RepairConfirmationPageState();
}

class _RepairConfirmationPageState extends ConsumerState<RepairConfirmationPage> {
  bool _agreeToTerms = false;
  
  // 총 예상 가격 계산 (최소 가격 기준)
  int _calculateTotalPrice() {
    int total = 0;
    for (var item in widget.repairItems) {
      final priceRange = item['priceRange'] as String;
      // "8,000원 ~ 18,000원" 형식에서 최소 가격 추출
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
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final totalPrice = _calculateTotalPrice();
    
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
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // 사진 with 핀 표시
                  if (widget.imageUrls.isNotEmpty)
                    _buildImageWithPins(context),
                  
                  const SizedBox(height: 20),
                  
                  // 총 정찰가격
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '총 정찰가격',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              totalPrice.toString().replaceAllMapped(
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
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // 가격표 보기 버튼
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {
                          // TODO: 가격표 보기
                        },
                        style: TextButton.styleFrom(
                          backgroundColor: const Color(0xFF00C896).withOpacity(0.1),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        child: const Text(
                          '가격표 보기',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF00C896),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // 수선 항목 리스트 (각 항목의 사진과 핀 포함)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: widget.repairItems.asMap().entries.map((entry) {
                        final index = entry.key;
                        final item = entry.value;
                        final itemImages = item['imagesWithPins'] as List<Map<String, dynamic>>?;
                        
                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFF00C896).withOpacity(0.3),
                              width: 2,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // 항목 헤더
                              Row(
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
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      item['repairPart'] as String,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.black87,
                                      ),
                                    ),
                                  ),
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
                              const SizedBox(height: 8),
                              Text(
                                '${item['scope']} · ${item['measurement']}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              
                              // 이 항목의 사진과 핀 표시
                              if (itemImages != null && itemImages.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                const Divider(),
                                const SizedBox(height: 8),
                                _buildRepairItemImages(itemImages),
                              ],
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // 의류 추가 버튼
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        // 현재 선택한 항목들을 유지하면서 의류 추가
                        final result = await context.push('/select-clothing-type', extra: widget.imageUrls);
                        
                        // 새로운 의류가 추가되면 기존 항목에 합쳐서 다시 표시
                        // TODO: 여러 의류 항목을 누적하는 로직 필요
                      },
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
                  
                  const SizedBox(height: 24),
                  
                  // 안내 메시지
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_outline,
                            color: Colors.red,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Colors.black87,
                                  height: 1.5,
                                ),
                                children: [
                                  const TextSpan(
                                    text: '수선 신청 시, ',
                                  ),
                                  TextSpan(
                                    text: '정확한 견적은 입고 후 확정',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red.shade700,
                                    ),
                                  ),
                                  const TextSpan(text: '됩니다.'),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
          
          // 하단 확인 영역
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
                  // 동의 체크박스
                  InkWell(
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
                                  text: '정확한 견적은 입고 후 확정',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.red.shade700,
                                  ),
                                ),
                                const TextSpan(text: '됩니다.'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // 등록하기 버튼
                  ElevatedButton(
                    onPressed: _agreeToTerms
                        ? () {
                            // 수거신청 페이지로 이동
                            context.push('/pickup-request', extra: {
                              'repairItems': widget.repairItems,
                              'imageUrls': widget.imageUrls,
                            },);
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _agreeToTerms
                          ? const Color(0xFF00C896)
                          : Colors.grey.shade300,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                      minimumSize: const Size(double.infinity, 50),
                    ),
                    child: const Text(
                      '등록하기',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
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

  /// 핀이 표시된 이미지 빌드
  Widget _buildImageWithPins(BuildContext context) {
    // 첫 번째 이미지와 핀 정보 가져오기
    final firstImageUrl = widget.imageUrls.first;
    final firstImageData = widget.imagesWithPins?.firstWhere(
      (img) => img['imagePath'] == firstImageUrl,
      orElse: () => {},
    );
    final pins = firstImageData?['pins'] as List? ?? [];

    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.5,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 사진
          Image.network(
            firstImageUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                color: Colors.grey.shade200,
                child: const Center(
                  child: Icon(Icons.image_outlined, size: 60, color: Colors.grey),
                ),
              );
            },
          ),
          
          // 핀들 표시
          LayoutBuilder(
            builder: (context, constraints) {
              return Stack(
                children: pins.map<Widget>((pinData) {
                  // pinData는 ImagePin 객체를 Map으로 변환한 것
                  final x = (pinData['relativePosition']?['dx'] ?? 0.5) as double;
                  final y = (pinData['relativePosition']?['dy'] ?? 0.5) as double;
                  
                  return Positioned(
                    left: x * constraints.maxWidth - 10,
                    top: y * constraints.maxHeight - 10,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: const Color(0xFF00C896),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white,
                          width: 3,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.3),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
          
          // 그라데이션 오버레이
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withOpacity(0.4),
                ],
              ),
            ),
          ),
          
          // 하단 정보
          Positioned(
            bottom: 20,
            left: 20,
            right: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 핀 개수 표시
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.push_pin,
                        size: 14,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '수선 부위 ${pins.length}개 표시',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                // 수선 항목 표시
                if (widget.repairItems.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.content_cut_rounded,
                          color: Color(0xFF00C896),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.repairItems.first['repairPart'] as String,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
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
                  }).toList(),
                ],
              ],
            ),
          );
        }).toList(),
      ],
    );
  }
}

