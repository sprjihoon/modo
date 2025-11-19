import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../services/image_service.dart';

/// 주문 상세 화면
class OrderDetailPage extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailPage({
    required this.orderId, super.key,
  });

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage> {
  // Mock 사진 데이터 (State로 관리)
  final List<Map<String, dynamic>> _images = [
    {
      'url': 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
      'pinsCount': 3,
      'pins': [], // 실제 핀 데이터
    },
    {
      'url': 'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=400',
      'pinsCount': 2,
      'pins': [],
    },
  ];
  
  // Mock 주문 상태 (테스트용 - 변경 가능)
  // BOOKED: 수거예약 - 수정 O, 취소 O
  // INBOUND: 입고완료 - 수정 O, 취소 X
  // PROCESSING: 수선중 - 수정 X, 취소 X
  // READY_TO_SHIP: 출고완료 - 수정 X, 취소 X
  String _currentStatus = 'BOOKED'; 

  @override
  Widget build(BuildContext context) {
    // TODO: 실제 주문 상태는 Supabase에서 가져오기
    final canEdit = _currentStatus == 'BOOKED' || _currentStatus == 'INBOUND'; // 수선 전에만 수정 가능
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('주문 상세'),
        elevation: 0,
        actions: [
          // 상태 변경 버튼 (테스트용)
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            tooltip: '상태 변경 (테스트)',
            onSelected: (status) {
              setState(() {
                _currentStatus = status;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('상태: $status'),
                  backgroundColor: const Color(0xFF00C896),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'BOOKED',
                child: Text('수거예약 (수정O/취소O)'),
              ),
              const PopupMenuItem(
                value: 'INBOUND',
                child: Text('입고완료 (수정O/취소X)'),
              ),
              const PopupMenuItem(
                value: 'PROCESSING',
                child: Text('수선중 (수정X/취소X)'),
              ),
              const PopupMenuItem(
                value: 'READY_TO_SHIP',
                child: Text('출고완료 (수정X/취소X)'),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              // TODO: 공유 기능
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 상태 배너
            _buildStatusBanner(context),
            const SizedBox(height: 16),
            
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 타임라인
                  _buildTimeline(context),
                  const SizedBox(height: 16),
                  
                  // 주문 정보
                  _buildOrderInfo(context),
                  const SizedBox(height: 16),
                  
                  // 사진 및 수선 부위 (수정 가능)
                  if (canEdit)
                    _buildEditablePhotosSection(context),
                  if (canEdit)
                    const SizedBox(height: 16),
                  
                  // 영상 섹션
                  _buildVideoSection(context),
                  const SizedBox(height: 16),
                  
                  // 배송 정보
                  _buildShippingInfo(context),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  Widget _buildStatusBanner(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.secondary,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.content_cut_rounded,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '청바지 기장 수선',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '수선 중',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(BuildContext context) {
    final steps = [
      {'status': 'BOOKED', 'label': '수거예약', 'completed': true, 'icon': Icons.schedule_outlined},
      {'status': 'INBOUND', 'label': '입고완료', 'completed': true, 'icon': Icons.inventory_outlined},
      {'status': 'PROCESSING', 'label': '수선중', 'completed': true, 'icon': Icons.content_cut_rounded},
      {'status': 'READY_TO_SHIP', 'label': '출고완료', 'completed': false, 'icon': Icons.done_all_outlined},
      {'status': 'DELIVERED', 'label': '배송완료', 'completed': false, 'icon': Icons.check_circle_outline},
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.timeline_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '진행 상황',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(steps.length * 2 - 1, (index) {
                if (index.isEven) {
                  final stepIndex = index ~/ 2;
                  final step = steps[stepIndex];
                  final isCompleted = step['completed'] as bool;
                  return Column(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: isCompleted
                              ? Theme.of(context).colorScheme.primary
                              : Colors.grey.shade300,
                          shape: BoxShape.circle,
                          boxShadow: isCompleted
                              ? [
                                  BoxShadow(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .primary
                                        .withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          step['icon'] as IconData,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: 70,
                        child: Text(
                          step['label'] as String,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isCompleted
                                ? FontWeight.bold
                                : FontWeight.normal,
                            color: isCompleted
                                ? Colors.grey.shade800
                                : Colors.grey.shade600,
                          ),
                        ),
                      ),
                    ],
                  );
                } else {
                  final prevCompleted = steps[(index - 1) ~/ 2]['completed'] as bool;
                  return Container(
                    width: 40,
                    height: 3,
                    margin: const EdgeInsets.only(bottom: 40),
                    decoration: BoxDecoration(
                      color: prevCompleted
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  );
                }
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderInfo(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.receipt_long_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '주문 정보',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow('주문번호', 'ORDER-2024-${widget.orderId}'),
          _buildInfoRow('수선 항목', '청바지 기장 수선'),
          _buildInfoRow('주문일시', '2024.01.15 14:30'),
          Divider(height: 24, color: Colors.grey.shade200),
          _buildInfoRow('결제금액', '₩15,000', isHighlight: true),
          _buildInfoRow('결제방법', '신용카드'),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isHighlight ? 15 : 14,
              color: Colors.grey.shade600,
              fontWeight: isHighlight ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isHighlight ? 16 : 14,
              fontWeight: isHighlight ? FontWeight.bold : FontWeight.w500,
              color: isHighlight ? Colors.grey.shade900 : Colors.grey.shade800,
            ),
          ),
        ],
      ),
    );
  }

  /// 송장번호 카드 빌더
  Widget _buildTrackingCard(
    BuildContext context,
    String label,
    String trackingNo,
    IconData icon,
    Color color,
    String description,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  Icons.copy_rounded,
                  color: color,
                  size: 20,
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('$label이(가) 복사되었습니다'),
                      backgroundColor: color,
                      behavior: SnackBarBehavior.floating,
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    trackingNo,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                      color: Colors.grey.shade800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // 배송추적 버튼
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: Icon(Icons.track_changes_outlined, size: 18, color: color),
              label: const Text('배송추적'),
              onPressed: () => _openTrackingUrl(trackingNo),
              style: OutlinedButton.styleFrom(
                foregroundColor: color,
                side: BorderSide(color: color),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  /// 배송추적 URL 열기
  void _openTrackingUrl(String trackingNo) async {
    final url = Uri.parse(
      'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=$trackingNo',
    );
    
    try {
      // 외부 브라우저로 열기
      final canLaunch = await canLaunchUrl(url);
      if (canLaunch) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('배송추적 URL을 열 수 없습니다');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('배송추적을 열 수 없습니다: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// 사진 추가
  Future<void> _addPhoto() async {
    // 사진 선택 바텀시트
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '사진 추가',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF00C896)),
                ),
                title: const Text('카메라로 촬영'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
                ),
                title: const Text('갤러리에서 선택'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );

    if (source != null && mounted) {
      try {
        final imageService = ImageService();
        
        // 로딩 표시
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('이미지를 업로드하는 중...'),
            duration: Duration(seconds: 2),
          ),
        );
        
        // 실제 이미지 선택 및 업로드
        final imageUrl = await imageService.pickAndUploadImage(
          source: source,
          bucket: 'order-images',
          folder: 'repairs',
        );
        
        // 사용자가 취소한 경우
        if (imageUrl == null) return;
        
        setState(() {
          _images.add({
            'url': imageUrl,
            'pinsCount': 0,
            'pins': [],
          });
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('사진이 추가되었습니다 (${_images.length}장)'),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('이미지 업로드 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// 사진 삭제
  Future<void> _deletePhoto(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('사진 삭제', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(
          '${index + 1}번 사진을 삭제하시겠습니까?\n핀 정보도 함께 삭제됩니다.',
          style: const TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('취소', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('삭제'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() {
        _images.removeAt(index);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('사진이 삭제되었습니다'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  /// 사진 변경
  Future<void> _changePhoto(int index) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '${index + 1}번 사진 변경',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF00C896)),
                ),
                title: const Text('카메라로 촬영'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
                ),
                title: const Text('갤러리에서 선택'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );

    if (source != null && mounted) {
      try {
        final imageService = ImageService();
        
        // 로딩 표시
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('이미지를 업로드하는 중...'),
            duration: Duration(seconds: 2),
          ),
        );
        
        // 실제 이미지 선택 및 업로드
        final imageUrl = await imageService.pickAndUploadImage(
          source: source,
          bucket: 'order-images',
          folder: 'repairs',
        );
        
        // 사용자가 취소한 경우
        if (imageUrl == null) return;
        
        setState(() {
          _images[index] = {
            'url': imageUrl,
            'pinsCount': 0, // 사진 변경 시 핀 초기화
            'pins': [],
          };
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${index + 1}번 사진이 변경되었습니다'),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('이미지 업로드 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// 핀 수정 (특정 사진)
  Future<void> _editPins(int index) async {
    final result = await context.push<Map<String, dynamic>>(
      '/image-annotation',
      extra: {
        'imagePath': _images[index]['url'],
        'pins': _images[index]['pins'] ?? [],
        'onComplete': null,
      },
    );

    if (result != null && mounted) {
      setState(() {
        _images[index]['pins'] = result['pins'] ?? [];
        _images[index]['pinsCount'] = (result['pins'] as List?)?.length ?? 0;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${index + 1}번 사진의 핀이 수정되었습니다 (${_images[index]['pinsCount']}개)'),
          backgroundColor: const Color(0xFF00C896),
        ),
      );
    }
  }

  /// 수정 가능한 사진 및 수선 부위 섹션
  Widget _buildEditablePhotosSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.image_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '첨부 사진 및 수선 부위',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  '수정 가능',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.orange,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // 안내 메시지
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: Colors.blue.shade700),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '수선 시작 전까지 사진과 수선 부위를 수정할 수 있습니다',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.blue.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          
          // 사진 목록
          SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _images.length,
              separatorBuilder: (context, index) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final image = _images[index];
                return _buildPhotoCard(context, image, index);
              },
            ),
          ),
          const SizedBox(height: 16),
          
          // 사진 추가 버튼
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _addPhoto,
              icon: const Icon(Icons.add_photo_alternate_outlined, size: 20),
              label: const Text('사진 추가'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF00C896),
                side: const BorderSide(color: Color(0xFF00C896)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 사진 카드
  Widget _buildPhotoCard(BuildContext context, Map<String, dynamic> image, int index) {
    return GestureDetector(
      onTap: () => _editPins(index), // 탭하면 핀 수정
      onLongPress: () => _showPhotoOptions(context, index), // 길게 누르면 메뉴
      child: Container(
        width: 120,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Stack(
        children: [
          // 사진
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              image['url'] as String,
              width: 120,
              height: 120,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: Colors.grey.shade200,
                  child: const Center(
                    child: Icon(Icons.image_outlined, size: 40, color: Colors.grey),
                  ),
                );
              },
            ),
          ),
          
          // 핀 개수 배지
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.push_pin,
                    size: 12,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${image['pinsCount']}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // 순서 번호
          Positioned(
            bottom: 8,
            left: 8,
            child: Container(
              width: 24,
              height: 24,
              decoration: const BoxDecoration(
                color: Color(0xFF00C896),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '${index + 1}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
          
          // 삭제 버튼 (X)
          Positioned(
            top: 4,
            left: 4,
            child: InkWell(
              onTap: () => _deletePhoto(index),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.close,
                  size: 16,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    ),
    );
  }

  /// 사진 옵션 메뉴
  void _showPhotoOptions(BuildContext context, int index) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '${index + 1}번 사진',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.edit_outlined, color: Colors.orange),
                ),
                title: const Text('핀 수정'),
                subtitle: const Text('수선 부위 표시 수정'),
                onTap: () {
                  Navigator.pop(context);
                  _editPins(index);
                },
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
                ),
                title: const Text('사진 변경'),
                subtitle: const Text('다른 사진으로 교체'),
                onTap: () {
                  Navigator.pop(context);
                  _changePhoto(index);
                },
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.delete_outline, color: Colors.red),
                ),
                title: const Text('사진 삭제'),
                subtitle: const Text('핀 정보도 함께 삭제'),
                onTap: () {
                  Navigator.pop(context);
                  _deletePhoto(index);
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.videocam_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '입출고 영상',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildVideoCard(context, '입고 영상', true),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildVideoCard(context, '출고 영상', false),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVideoCard(BuildContext context, String title, bool available) {
    return InkWell(
      onTap: available
          ? () {
              // TODO: 영상 재생
            }
          : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: available
              ? Theme.of(context).colorScheme.primary.withOpacity(0.05)
              : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: available
                ? Theme.of(context).colorScheme.primary.withOpacity(0.2)
                : Colors.grey.shade300,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: available
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade400,
                shape: BoxShape.circle,
              ),
              child: Icon(
                available ? Icons.play_arrow_rounded : Icons.schedule,
                size: 32,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: available ? Colors.grey.shade800 : Colors.grey.shade600,
              ),
            ),
            if (!available) ...[
              const SizedBox(height: 4),
              Text(
                '준비 중',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildShippingInfo(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.local_shipping_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '배송 정보',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // 송장번호 카드 (2개)
          // 1. 회수 송장번호
          _buildTrackingCard(
            context,
            '회수 송장번호',
            'KPOST25111212345',
            Icons.local_shipping_outlined,
            Colors.blue,
            '수거 시 사용',
          ),
          const SizedBox(height: 12),
          
          // 2. 발송 송장번호
          _buildTrackingCard(
            context,
            '발송 송장번호',
            'KPOST25111298765',
            Icons.send_outlined,
            const Color(0xFF00C896),
            '배송 시 사용',
          ),
          const SizedBox(height: 16),
          
          _buildInfoRow('택배사', '우체국 택배'),
          _buildInfoRow('수거지', '서울시 강남구 테헤란로 123'),
          _buildInfoRow('배송지', '서울시 강남구 테헤란로 123'),
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
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
        child: _currentStatus == 'BOOKED'
            ? _buildBookedButtons(context)
            : _buildDefaultButtons(context),
      ),
    );
  }

  /// BOOKED 상태일 때 버튼 (수거 취소 가능)
  Widget _buildBookedButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: const Icon(Icons.cancel_outlined, size: 20),
            label: const Text('수거 취소'),
            onPressed: () => _showCancelDialog(context),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.headset_mic_outlined, size: 20),
            label: const Text('문의하기'),
            onPressed: () {
              // TODO: 고객센터 연결
            },
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }

  /// 기본 버튼 (문의하기 + 배송 추적)
  Widget _buildDefaultButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: const Icon(Icons.headset_mic_outlined, size: 20),
            label: const Text('문의하기'),
            onPressed: () {
              // TODO: 고객센터 연결
            },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.gps_fixed, size: 20),
            label: const Text('배송 추적'),
            onPressed: () {
              // TODO: 배송 추적
            },
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }

  /// 수거 취소 확인 다이얼로그
  void _showCancelDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          '수거 취소',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text(
          '수거 예약을 취소하시겠습니까?\n취소 후에는 다시 예약하셔야 합니다.',
          style: TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              '닫기',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _handleCancelOrder(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('취소하기'),
          ),
        ],
      ),
    );
  }

  /// 주문 취소 처리
  void _handleCancelOrder(BuildContext context) {
    // TODO: 실제 API 호출하여 주문 취소
    // await orderService.cancelOrder(orderId);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('수거 예약이 취소되었습니다'),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: '확인',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
    
    // 주문 목록으로 이동
    Future.delayed(const Duration(seconds: 2), () {
      if (context.mounted) {
        Navigator.of(context).pop();
      }
    });
  }
}

