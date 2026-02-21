import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../services/order_service.dart';

/// 배송추적 페이지
class TrackingPage extends ConsumerStatefulWidget {
  final String orderId;
  final String trackingNo;

  const TrackingPage({
    required this.orderId,
    required this.trackingNo,
    super.key,
  });

  @override
  ConsumerState<TrackingPage> createState() => _TrackingPageState();
}

class _TrackingPageState extends ConsumerState<TrackingPage> {
  final _orderService = OrderService();
  bool _isLoading = true;
  Map<String, dynamic>? _trackingData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadTrackingData();
  }

  Future<void> _loadTrackingData() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      final data = await _orderService.trackShipment(widget.trackingNo);

      setState(() {
        _trackingData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('배송추적'),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? _buildErrorView()
              : _buildTrackingView(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              '배송추적 정보를 불러올 수 없습니다',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? '알 수 없는 오류',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('다시 시도'),
              onPressed: _loadTrackingData,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrackingView() {
    final shipment = _trackingData?['shipment'] as Map<String, dynamic>?;
    final epost = _trackingData?['epost'] as Map<String, dynamic>?;
    final epostError = _trackingData?['epostError'] as Map<String, dynamic>?;
    final isNotYetPickedUp =
        _trackingData?['isNotYetPickedUp'] as bool? ?? false;
    final trackingUrl = _trackingData?['tracking_url'] as String?;
    final trackingEvents =
        _trackingData?['trackingEvents'] as List<dynamic>? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 송장번호 카드
          _buildTrackingNoCard(),
          const SizedBox(height: 16),

          // 아직 집하되지 않은 경우 안내
          if (isNotYetPickedUp ||
              (epost == null &&
                  epostError == null &&
                  trackingEvents.isEmpty)) ...[
            _buildNotYetPickedUpCard(),
            const SizedBox(height: 16),
          ],

          // 배송 상태
          if (epost != null) ...[
            _buildStatusCard(epost),
            const SizedBox(height: 16),
          ],

          // 배송 추적 이력 (종추적조회 결과)
          if (trackingEvents.isNotEmpty) ...[
            _buildTrackingEventsCard(trackingEvents),
            const SizedBox(height: 16),
          ],

          // 에러가 있는 경우
          if (epostError != null && !isNotYetPickedUp) ...[
            _buildErrorCard(epostError),
            const SizedBox(height: 16),
          ],

          // 배송 정보
          if (shipment != null) ...[
            _buildShipmentInfoCard(shipment),
            const SizedBox(height: 16),
          ],

          // 우체국 사이트 열기 버튼
          if (trackingUrl != null) ...[
            OutlinedButton.icon(
              icon: const Icon(Icons.open_in_browser),
              label: const Text('우체국 사이트에서 자세히 보기'),
              onPressed: () {
                // 외부 브라우저로 열기 (선택사항)
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTrackingNoCard() {
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
              Icon(Icons.local_shipping_outlined, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              Text(
                '송장번호',
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
                child: Text(
                  widget.trackingNo,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    color: Colors.grey.shade800,
                    letterSpacing: 1,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: widget.trackingNo));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('송장번호가 복사되었습니다'),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(Map<String, dynamic> epost) {
    final statusCode = epost['treatStusCd'] as String? ?? '';
    final statusName = epost['treatStusNm'] as String? ?? '알 수 없음';
    final resDate = epost['resDate'] as String?;
    final regiPoNm = epost['regiPoNm'] as String?;

    Color statusColor;
    IconData statusIcon;

    switch (statusCode) {
      case '00':
      case '01':
        statusColor = Colors.blue;
        statusIcon = Icons.schedule;
        break;
      case '02':
      case '03':
        statusColor = Colors.orange;
        statusIcon = Icons.local_shipping;
        break;
      case '04':
        statusColor = Colors.red;
        statusIcon = Icons.error_outline;
        break;
      case '05':
        statusColor = Colors.grey;
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.help_outline;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(statusIcon, color: statusColor, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      statusName,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                    if (regiPoNm != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        regiPoNm,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (resDate != null) ...[
            const SizedBox(height: 16),
            Divider(color: Colors.grey.shade200),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 8),
                Text(
                  '처리일시: $resDate',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildShipmentInfoCard(Map<String, dynamic> shipment) {
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
              Icon(Icons.info_outline, color: Colors.grey.shade700),
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
          _buildInfoRow('배송 상태', shipment['status']?.toString() ?? '-'),
          _buildInfoRow(
              '택배사',
              shipment['carrier'] == 'EPOST'
                  ? '우체국 택배'
                  : shipment['carrier']?.toString() ?? '-'),
          if (shipment['pickup_requested_at'] != null)
            _buildInfoRow(
                '수거 요청일', _formatDate(shipment['pickup_requested_at'])),
          if (shipment['pickup_completed_at'] != null)
            _buildInfoRow(
                '수거 완료일', _formatDate(shipment['pickup_completed_at'])),
          if (shipment['delivery_started_at'] != null)
            _buildInfoRow(
                '배송 시작일', _formatDate(shipment['delivery_started_at'])),
          if (shipment['delivery_completed_at'] != null)
            _buildInfoRow(
                '배송 완료일', _formatDate(shipment['delivery_completed_at'])),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.grey.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '-';
    try {
      final dt = DateTime.parse(date.toString());
      return '${dt.year}.${dt.month.toString().padLeft(2, '0')}.${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return date.toString();
    }
  }

  /// 배송 추적 이력 카드 (종추적조회 결과)
  Widget _buildTrackingEventsCard(List<dynamic> events) {
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
              Icon(Icons.timeline, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              Text(
                '배송 추적 이력',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // 이벤트 목록 (최신순으로 역순 표시)
          ...events.reversed.toList().asMap().entries.map((entry) {
            final index = entry.key;
            final event = entry.value as Map<String, dynamic>;
            final isFirst = index == 0;
            final isLast = index == events.length - 1;

            return _buildTrackingEventItem(
              event: event,
              isFirst: isFirst,
              isLast: isLast,
            );
          }),
        ],
      ),
    );
  }

  /// 배송 추적 이벤트 아이템
  Widget _buildTrackingEventItem({
    required Map<String, dynamic> event,
    required bool isFirst,
    required bool isLast,
  }) {
    final date = event['date'] as String? ?? '';
    final time = event['time'] as String? ?? '';
    final location = event['location'] as String? ?? '';
    final status = event['status'] as String? ?? '';
    final description = event['description'] as String?;

    // 상태에 따른 색상
    Color statusColor = Colors.grey;
    if (isFirst) {
      statusColor = Colors.blue.shade700;
    } else if (status.contains('배달완료') || status.contains('수령')) {
      statusColor = Colors.green.shade700;
    } else if (status.contains('배달중') || status.contains('배달준비')) {
      statusColor = Colors.orange.shade700;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 타임라인 (왼쪽)
          SizedBox(
            width: 24,
            child: Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: isFirst ? statusColor : Colors.grey.shade300,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isFirst ? statusColor : Colors.grey.shade400,
                      width: 2,
                    ),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: Colors.grey.shade300,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // 이벤트 내용 (오른쪽)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 상태
                  Text(
                    status,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: isFirst ? FontWeight.bold : FontWeight.w500,
                      color: isFirst ? statusColor : Colors.grey.shade800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // 위치
                  if (location.isNotEmpty)
                    Text(
                      location,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  // 상세설명
                  if (description != null && description.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        description,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ),
                  const SizedBox(height: 4),
                  // 날짜/시간
                  Text(
                    '$date $time',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
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

  /// 아직 집하되지 않은 경우 안내 카드
  Widget _buildNotYetPickedUpCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Column(
        children: [
          Icon(
            Icons.schedule_outlined,
            size: 48,
            color: Colors.orange.shade700,
          ),
          const SizedBox(height: 16),
          Text(
            '아직 집하되지 않았습니다',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.orange.shade900,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '송장번호가 발급되었지만, 우체부가 제품을 수거하고 스캔하기 전까지는 추적 정보가 표시되지 않습니다.\n\n수거 예정일을 확인하시거나, 우체국 사이트에서 직접 확인해보세요.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.orange.shade800,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// 에러 카드
  Widget _buildErrorCard(Map<String, dynamic> error) {
    final message = error['message'] as String? ?? '알 수 없는 오류';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: Colors.red.shade700,
            size: 32,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '추적 정보 조회 실패',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.red.shade900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.red.shade800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
