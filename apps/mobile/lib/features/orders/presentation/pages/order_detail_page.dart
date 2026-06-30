import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart' as provider;

import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/image_service.dart';
import '../../../../services/order_service.dart';
import '../../../../services/customer_event_service.dart';
import '../../../../services/shipping_settings_service.dart';
import '../../../../core/enums/extra_charge_status.dart';
import '../../providers/extra_charge_provider.dart';
import '../../domain/models/extra_charge_data.dart';
import '../../../profile/presentation/widgets/daum_postcode_widget.dart';

/// ì£¼ë¬¸ ?ì„¸ ?”ë©´
class OrderDetailPage extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailPage({
    required this.orderId,
    super.key,
  });

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage>
    with WidgetsBindingObserver {
  final _orderService = OrderService();
  bool _isLoading = true;
  bool _isCancelling = false; // ì·¨ì†Œ ì¤??íƒœ ì¶”ê?
  Map<String, dynamic>? _orderData;
  Map<String, dynamic>? _shipmentData;

  // ?¤ì œ ?¬ì§„ ?°ì´??(Stateë¡?ê´€ë¦?
  List<Map<String, dynamic>> _images = [];

  // ì£¼ë¬¸ ?íƒœ (?œë²„?ì„œ ë¡œë“œ)
  // BOOKED: ?˜ê±°?ˆì•½ - ?˜ì • O, ì·¨ì†Œ O (?„ì•¡ ?˜ë¶ˆ + ?°ì²´êµ?ì·¨ì†Œ)
  // PICKED_UP: ?˜ê±°?„ë£Œ - ?˜ì • X, ì·¨ì†Œ O (?•ë³µ ë°°ì†¡ë¹?ì°¨ê° ??ë¶€ë¶„í™˜ë¶?+ ë°˜ì†¡)
  // INBOUND: ?…ê³ ?„ë£Œ - ?˜ì • O, ì·¨ì†Œ O (?•ë³µ ë°°ì†¡ë¹?ì°¨ê° ??ë¶€ë¶„í™˜ë¶?+ ë°˜ì†¡)
  // PROCESSING: ?˜ì„ ì¤?- ?˜ì • X, ì·¨ì†Œ X (ê³ ê°?¼í„° ë¬¸ì˜)
  // READY_TO_SHIP: ì¶œê³ ?„ë£Œ - ?˜ì • X, ì·¨ì†Œ X (ê³ ê°?¼í„° ë¬¸ì˜)
  String _currentStatus = 'BOOKED';

  // ?°ì²´êµ?API ì·¨ì†Œ ?‘ë‹µ ?•ë³´ ?€??
  Map<String, dynamic>? _cancelInfo;

  // ë°°ì†¡ì§€/ë©”ëª¨ ?˜ì •
  bool _isSavingDelivery = false;

  /// ë°°ì†¡ì¶”ì  treatStusCd (00:? ì²­ì¤€ë¹? 01:?Œí¬? ì²­, 02:?´ì†¡?¥ì¶œ?? 03:ì§‘í•˜?„ë£Œ, 04:ë°°ì†¡ì¤? 05:ë°°ì†¡?„ë£Œ)
  /// 00~02: ?˜ê±°ì¤€ë¹?ì·¨ì†Œ ê°€??, 03~05: ?‘ìˆ˜/ë°œì†¡/?„ì°©(ì·¨ì†Œ ë¶ˆê? ??ë¬¸ì˜?˜ê¸°)
  String? _pickupTreatStusCd;

  // ?…ê³ /ì¶œê³  ?ìƒ URL (?¨ì¼)
  String? _inboundVideoUrl;
  String? _outboundVideoUrl;

  // ?¬ëŸ¬ ?„ì´?œì˜ ?ìƒ ??(?œì°¨ ?¬ìƒ??
  List<Map<String, String>> _videoItems = [];

  // ì£¼ê¸°???ˆë¡œê³ ì¹¨???„í•œ ?€?´ë¨¸
  // ?¤íŠ¸?Œí¬ ?ëŸ¬ ë©”ì‹œì§€ (UI??ë°°ë„ˆë¡??œì‹œ)
  String? _networkErrorMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    CustomerEventService.trackProductView(
      productName: 'ì£¼ë¬¸ ?ì„¸',
      productId: widget.orderId,
    );
    _loadOrderData();
    // ë°°ì†¡ë¹??¤ì •??ë°±ê·¸?¼ìš´?œë¡œ ê°±ì‹  (?”ë©´ ë¹Œë“œ ?œì ?ëŠ” ìºì‹œê°??¬ìš©)
    ShippingSettingsService().get();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// ?±ì´ ?¬ê·¸?¼ìš´?œë¡œ ?Œì•„?????°ì´??ê°±ì‹ 
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      _loadOrderData(showLoading: false);
    }
  }

  Future<void> _loadOrderData({bool showLoading = true}) async {
    try {
      if (showLoading) {
        setState(() => _isLoading = true);
      }

      // ê¸°ì¡´ ?ëŸ¬ ë©”ì‹œì§€ ì´ˆê¸°??ë°?SnackBar ?œê±°
      if (_networkErrorMessage != null && mounted) {
        setState(() => _networkErrorMessage = null);
        ScaffoldMessenger.of(context).clearSnackBars();
      }

      debugPrint('?“¦ ì£¼ë¬¸ ?ì„¸ ì¡°íšŒ ?œì‘: ${widget.orderId}');

      // ?”’ ë³´ì•ˆ: ì£¼ë¬¸ ?ì„¸ ?•ë³´ ì¡°íšŒ (?Œìœ ??ê²€ì¦??¬í•¨)
      final order = await _orderService.getOrderDetail(widget.orderId).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('ì£¼ë¬¸ ?•ë³´ ì¡°íšŒ ?œê°„ ì´ˆê³¼ (30ì´?');
        },
      );

      debugPrint('??ì£¼ë¬¸ ?ì„¸ ì¡°íšŒ ?±ê³µ: ${order['id']}');

      // shipments ?•ë³´ ì¶”ì¶œ
      final shipments = order['shipments'] as List<dynamic>?;
      final shipment = shipments != null && shipments.isNotEmpty
          ? shipments.first as Map<String, dynamic>
          : null;

      // ?¤ì œ ?¬ì§„ ?°ì´??ë¡œë“œ
      List<Map<String, dynamic>> images = [];

      // images_with_pins ?ëŠ” images ?„ë“œ?ì„œ ?¬ì§„ ?•ë³´ ê°€?¸ì˜¤ê¸?
      final imagesWithPins = order['images_with_pins'] as List<dynamic>?;
      if (imagesWithPins != null && imagesWithPins.isNotEmpty) {
        images = imagesWithPins.map((img) {
          final imgMap = Map<String, dynamic>.from(img as Map);
          final pinsData = imgMap['pins'] as List<dynamic>? ?? [];
          // pinsë¥?Map<String, dynamic>?¼ë¡œ ë³€??(ImagePin.fromJson???„í•´)
          final pins = pinsData
              .map((p) {
                if (p is Map<String, dynamic>) {
                  return p;
                } else if (p is Map) {
                  return Map<String, dynamic>.from(p);
                }
                return null;
              })
              .whereType<Map<String, dynamic>>()
              .toList();
          return {
            'url': imgMap['imagePath'] ?? imgMap['url'] ?? '',
            'pinsCount': pins.length,
            'pins': pins, // Map<String, dynamic> ë¦¬ìŠ¤?¸ë¡œ ?€??
          };
        }).toList();
      } else {
        // images ?„ë“œ?ì„œ URL ë°°ì—´ ê°€?¸ì˜¤ê¸?
        final imageUrls = order['images'] as Map<String, dynamic>?;
        if (imageUrls != null) {
          final urls = imageUrls['urls'] as List<dynamic>? ?? [];
          images = urls
              .map(
                (url) => {
                  'url': url.toString(),
                  'pinsCount': 0,
                  'pins': <dynamic>[],
                },
              )
              .toList();
        }
      }

      final newStatus = order['status'] as String? ?? 'BOOKED';
      final statusChanged = _currentStatus != newStatus;
      
      debugPrint('?“Š ì£¼ë¬¸ ?íƒœ: $newStatus (?´ì „: $_currentStatus)');

      setState(() {
        _orderData = order;
        _shipmentData = shipment;
        _currentStatus = newStatus;
        _images = images;
        _isLoading = false;
        // BOOKEDê°€ ?„ë‹ˆë©??˜ê±° treatStusCd ì´ˆê¸°??
        if (newStatus != 'BOOKED') {
          _pickupTreatStusCd = null;
        }
      });

      // ì¶”ê?ê¸??ˆë‚´ ?”ë©´ ?¸ì¶œ ì¶”ì 
      final extraChargeStatus = order['extra_charge_status'] as String?;
      if (extraChargeStatus == 'PENDING_CUSTOMER') {
        final extraData = order['extra_charge_data'] as Map<String, dynamic>?;
        final amount = (extraData?['managerPrice'] as num?)?.toInt() ?? 0;
        CustomerEventService.trackExtraChargeView(
          orderId: widget.orderId,
          amount: amount,
        );
      }
      
      debugPrint('?”˜ ì·¨ì†Œ ê°€???¬ë?: $_isPickupCancellable (treatStusCd: $_pickupTreatStusCd)');

      // ?íƒœ ë³€ê²??Œë¦¼ (ë°°ì†¡?„ë£Œ ??
      if (statusChanged && mounted) {
        if (newStatus == 'DELIVERED') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ë°°ì†¡???„ë£Œ?˜ì—ˆ?µë‹ˆ?? ?¬ì¸?¸ê? ?ë¦½?˜ì—ˆ?µë‹ˆ??'),
              backgroundColor: Color(0xFF00C896),
              duration: Duration(seconds: 3),
            ),
          );
        } else if (newStatus == 'INBOUND') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('?…ê³ ê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ??'),
              backgroundColor: Colors.blue,
              duration: Duration(seconds: 2),
            ),
          );
        } else if (newStatus == 'PROCESSING') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('?˜ì„ ???œì‘?˜ì—ˆ?µë‹ˆ??'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 2),
            ),
          );
        } else if (newStatus == 'READY_TO_SHIP') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ì¶œê³ ê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ?? ë°°ì†¡???œì‘?©ë‹ˆ??'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }

      // ?…ê³ /ì¶œê³  ?ìƒ URL ì¡°íšŒ (ë¹„ë™ê¸? ë³„ë„ ì²˜ë¦¬)
      _loadVideoUrls();

      // ?šš ë°°ì†¡/?˜ê±° ?„ë£Œ ?ë™ ì²´í¬
      // - BOOKED: ?˜ê±° ?„ë£Œ ????INBOUNDë¡?ë³€ê²?
      // - READY_TO_SHIP: ë°°ì†¡ ?„ë£Œ ????DELIVEREDë¡?ë³€ê²?
      if (newStatus == 'BOOKED' || newStatus == 'READY_TO_SHIP') {
        _checkDeliveryCompletion(newStatus);
      }

      // ?“¦ BOOKED ?íƒœ: ë°°ì†¡ì¶”ì  APIë¡?treatStusCd ì¡°íšŒ (?˜ê±°ì¤€ë¹„ì¸ì§€ ?‘ìˆ˜/ë°œì†¡/?„ì°©?¸ì? ?ë‹¨)
      if (newStatus == 'BOOKED' && shipment != null && mounted) {
        _fetchPickupTreatStusCd(shipment);
      }
    } catch (e, stackTrace) {
      debugPrint('??ì£¼ë¬¸ ?ì„¸ ì¡°íšŒ ?¤íŒ¨: $e');
      debugPrint('?¤íƒ ?¸ë ˆ?´ìŠ¤: $stackTrace');

      // ?”’ ë³´ì•ˆ: ?‘ê·¼ ê¶Œí•œ ?†ìŒ ì²˜ë¦¬
      final errorMessage = e.toString();
      final isAccessDenied = errorMessage.contains('?‘ê·¼ ê¶Œí•œ???†ìŠµ?ˆë‹¤') ||
          errorMessage.contains('ë³¸ì¸??ì£¼ë¬¸ë§?);

      if (mounted) {
        // ë¡œë”© ?íƒœ ?´ì œ
        setState(() => _isLoading = false);

        if (isAccessDenied) {
          // ?”’ ?‘ê·¼ ê¶Œí•œ ?†ìŒ: ì¦‰ì‹œ ?¤ë¡œê°€ê¸?
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('???‘ê·¼ ê¶Œí•œ???†ìŠµ?ˆë‹¤. ë³¸ì¸??ì£¼ë¬¸ë§?ì¡°íšŒ?????ˆìŠµ?ˆë‹¤.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );

          // 0.5ì´????ë™?¼ë¡œ ?¤ë¡œê°€ê¸?(?¬ìš©?ê? ë©”ì‹œì§€ë¥??½ì„ ?œê°„ ?œê³µ)
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) {
              context.pop(); // ì¦‰ì‹œ ?¤ë¡œê°€ê¸?(ë³´ì•ˆ ?„í˜‘ ì°¨ë‹¨)
            }
          });
        } else if (_orderData != null) {
          // ?´ë? ?°ì´?°ê? ?ˆëŠ” ê²½ìš° (?ë™ ?ˆë¡œê³ ì¹¨ ?¤íŒ¨): ?íƒœ ë³€?˜ì—ë§??€??
          // ?¤íŠ¸?Œí¬ ?¬ì—°ê²????ë™?¼ë¡œ ?±ê³µ?˜ë©´ ?ëŸ¬ ë©”ì‹œì§€ê°€ ?¬ë¼ì§?
          setState(() {
            _networkErrorMessage = '?¤íŠ¸?Œí¬ ?°ê²°???•ì¸?´ì£¼?¸ìš”';
          });
        } else {
          // ìµœì´ˆ ë¡œë“œ ?¤íŒ¨: SnackBarë¡??¬ì‹œ???ˆë‚´
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('ì£¼ë¬¸ ?•ë³´ ì¡°íšŒ ?¤íŒ¨: ${e.toString()}'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: '?¤ì‹œ ?œë„',
                textColor: Colors.white,
                onPressed: () {
                  _loadOrderData();
                },
              ),
            ),
          );
        }
      } else {
        // mountedê°€ falseë©?setState ?¸ì¶œ?˜ì? ?ŠìŒ
        _isLoading = false;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: const ModoAppBar(
          title: Text('ì£¼ë¬¸ ?ì„¸'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'ì£¼ë¬¸ ?•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤?..',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () {
                  _loadOrderData();
                },
                child: const Text('?¤ì‹œ ?œë„'),
              ),
            ],
          ),
        ),
      );
    }

    // TODO: ?¤ì œ ì£¼ë¬¸ ?íƒœ??Supabase?ì„œ ê°€?¸ì˜¤ê¸?
    final canEdit = _currentStatus == 'BOOKED' ||
        _currentStatus == 'INBOUND'; // ?˜ì„  ?„ì—ë§??˜ì • ê°€??

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: ModoAppBar(
        title: const Text('ì£¼ë¬¸ ?ì„¸'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: '?ˆë¡œê³ ì¹¨',
            onPressed: () => _loadOrderData(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ?íƒœ ë°°ë„ˆ
            _buildStatusBanner(context),

            // ?†• ì¶”ê? ê²°ì œ ?”ì²­ ì¹´ë“œ (PENDING_CUSTOMER ?íƒœ???Œë§Œ ?œì‹œ)
            _buildExtraChargeCard(context),

            const SizedBox(height: 16),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ?€?„ë¼??
                  _buildTimeline(context),
                  const SizedBox(height: 16),

                  // ì£¼ë¬¸ ?•ë³´
                  _buildOrderInfo(context),
                  const SizedBox(height: 16),

                  // ?¬ì§„ ë°??˜ì„  ë¶€??(?˜ì • ê°€??
                  if (canEdit) _buildEditablePhotosSection(context),
                  if (canEdit) const SizedBox(height: 16),

                  // ?ìƒ ?¹ì…˜
                  _buildVideoSection(context),
                  const SizedBox(height: 16),

                  // ë°°ì†¡ ?•ë³´
                  _buildShippingInfo(context),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ?¤íŠ¸?Œí¬ ?ëŸ¬ ë°°ë„ˆ (?¬ì—°ê²????ë™?¼ë¡œ ?¬ë¼ì§?
          if (_networkErrorMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Colors.red.shade50,
              child: Row(
                children: [
                  Icon(Icons.wifi_off, color: Colors.red.shade700, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _networkErrorMessage!,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _loadOrderData(),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.red.shade700,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('?¤ì‹œ ?œë„'),
                  ),
                ],
              ),
            ),
          _buildBottomBar(context),
        ],
      ),
    );
  }

  /// ?†• ì¶”ê? ê²°ì œ ?”ì²­ ì¹´ë“œ ë¹Œë“œ
  Widget _buildExtraChargeCard(BuildContext context) {
    // extra_charge_status ?•ì¸
    final extraChargeStatusStr = _orderData?['extra_charge_status'] as String?;
    if (extraChargeStatusStr == null ||
        extraChargeStatusStr != 'PENDING_CUSTOMER') {
      return const SizedBox.shrink();
    }

    // extra_charge_data ?Œì‹±
    final extraChargeDataJson = _orderData?['extra_charge_data'];
    ExtraChargeData? extraChargeData;
    if (extraChargeDataJson != null &&
        extraChargeDataJson is Map<String, dynamic>) {
      extraChargeData = ExtraChargeData.fromJson(extraChargeDataJson);
    }

    final price = extraChargeData?.managerPrice ?? 0;
    final note = extraChargeData?.managerNote ?? 'ì¶”ê? ?‘ì—…???„ìš”?©ë‹ˆ??;
    final memo = extraChargeData?.workerMemo ?? '';
    final orderName = _orderData?['item_name'] as String? ?? '?˜ì„ ';

    return Card(
      margin: const EdgeInsets.all(16),
      elevation: 4,
      color: Colors.orange[50],
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.orange[300]!, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ?¤ë”
            Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: Colors.orange[700],
                  size: 28,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '?’³ ì¶”ê? ê²°ì œ ?”ì²­',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[900],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ?ˆë‚´ ë¬¸êµ¬
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                note,
                style: const TextStyle(fontSize: 14),
              ),
            ),
            const SizedBox(height: 12),

            // ì¶”ê? ê¸ˆì•¡
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'ì¶”ê? ì²?µ¬ ê¸ˆì•¡',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${_formatNumberWithComma(price)}??,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[900],
                    ),
                  ),
                ],
              ),
            ),

            // ?„ì¥ ë©”ëª¨ (?ˆìœ¼ë©??œì‹œ)
            if (memo.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                '?„ì¥ ë©”ëª¨: $memo',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[700],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // ?¡ì…˜ ë²„íŠ¼??
            Column(
              children: [
                // ê²°ì œ?˜ê¸° ë²„íŠ¼ (? ìŠ¤?˜ì´ë¨¼ì¸ ë¡??´ë™)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () =>
                        _handleExtraChargePay(context, price, orderName),
                    icon: const Icon(Icons.payment),
                    label: Text('${_formatNumberWithComma(price)}??ê²°ì œ?˜ê¸°'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0064FF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // ê·¸ëƒ¥ ì§„í–‰ / ë°˜ì†¡?˜ê¸° ë²„íŠ¼
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _handleExtraChargeSkip(context),
                        icon: const Icon(Icons.arrow_forward, size: 18),
                        label: const Text('ê·¸ëƒ¥ ì§„í–‰'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.green,
                          side: const BorderSide(color: Colors.green),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _handleExtraChargeReturn(context),
                        icon: const Icon(Icons.keyboard_return, size: 18),
                        label: const Text('ë°˜ì†¡?˜ê¸°'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 12),

            // ?ˆë‚´ ë©”ì‹œì§€
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '??ê·¸ëƒ¥ ì§„í–‰: ì¶”ê? ?‘ì—… ?†ì´ ?ì•ˆ?€ë¡?ì§„í–‰?©ë‹ˆ??n??ë°˜ì†¡: ?•ë³µ ë°°ì†¡ë¹?${_formatPrice(ShippingSettingsService().current.returnShippingFee)}?ì´ ì°¨ê°?©ë‹ˆ??,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[700],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// ?«ì??ì½¤ë§ˆ ì¶”ê?
  String _formatNumberWithComma(int number) {
    return number.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }

  /// ì¶”ê? ê²°ì œ?˜ê¸° (? ìŠ¤?˜ì´ë¨¼ì¸ ë¡??´ë™)
  Future<void> _handleExtraChargePay(
      BuildContext context, int price, String orderName) async {
    // ê²°ì œ ?•ì¸ ?¤ì´?¼ë¡œê·?
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('ì¶”ê? ê²°ì œ'),
        content: Text('${_formatNumberWithComma(price)}?ì„ ê²°ì œ?˜ì‹œê² ìŠµ?ˆê¹Œ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('ì·¨ì†Œ', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0064FF),
              foregroundColor: Colors.white,
            ),
            child: const Text('ê²°ì œ'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // ? ìŠ¤?˜ì´ë¨¼ì¸  ê²°ì œ ?˜ì´ì§€ë¡??´ë™
    final result = await context.push<bool>(
      '/payment',
      extra: {
        'orderId':
            'EXTRA_${widget.orderId}_${DateTime.now().millisecondsSinceEpoch}',
        'amount': price,
        'orderName': '$orderName ì¶”ê? ê²°ì œ',
        'isExtraCharge': true,
        'originalOrderId': widget.orderId,
      },
    );

    // ê²°ì œ ?„ë£Œ ??ì£¼ë¬¸ ?°ì´???ˆë¡œê³ ì¹¨
    if (result == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('??ì¶”ê? ê²°ì œê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ?? ?‘ì—…???¬ê°œ?©ë‹ˆ??'),
          backgroundColor: Colors.green,
        ),
      );
      await _loadOrderData();
    }
  }

  /// ê·¸ëƒ¥ ì§„í–‰ (ì¶”ê? ?‘ì—… ?†ì´)
  Future<void> _handleExtraChargeSkip(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('?ì•ˆ?€ë¡?ì§„í–‰'),
        content: const Text('ì¶”ê? ?‘ì—… ?†ì´ ?ì•ˆ?€ë¡?ì§„í–‰?˜ì‹œê² ìŠµ?ˆê¹Œ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('ì·¨ì†Œ', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('ì§„í–‰'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // ë¡œë”© ?œì‹œ
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final extraChargeProvider =
          provider.Provider.of<ExtraChargeProvider>(context, listen: false);
      final success = await extraChargeProvider.processCustomerDecision(
        orderId: widget.orderId,
        action: CustomerDecisionAction.SKIP,
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // ë¡œë”© ?«ê¸°

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('?ì•ˆ?€ë¡?ì§„í–‰?©ë‹ˆ??),
            backgroundColor: Colors.green,
          ),
        );
        await _loadOrderData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? 'ì²˜ë¦¬ ?¤íŒ¨'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // ë¡œë”© ?«ê¸°
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('?¤ë¥˜ ë°œìƒ: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// ë°˜ì†¡?˜ê¸°
  Future<void> _handleExtraChargeReturn(BuildContext context) async {
    final returnFee = ShippingSettingsService().current.returnShippingFee;
    final formattedReturnFee = _formatPrice(returnFee);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('ë°˜ì†¡ ?”ì²­'),
        content: Text(
          'ë°˜ì†¡???”ì²­?˜ì‹œê² ìŠµ?ˆê¹Œ?\n\n'
          '? ï¸ ?•ë³µ ë°°ì†¡ë¹?${formattedReturnFee}?ì´ ì°¨ê°?©ë‹ˆ??\n'
          '??ê¸ˆì•¡?€ ?˜ë¶ˆ ??ê³µì œ?©ë‹ˆ??',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('ì·¨ì†Œ', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('ë°˜ì†¡ ?”ì²­'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // ë¡œë”© ?œì‹œ
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final extraChargeProvider =
          provider.Provider.of<ExtraChargeProvider>(context, listen: false);
      final success = await extraChargeProvider.processCustomerDecision(
        orderId: widget.orderId,
        action: CustomerDecisionAction.RETURN,
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // ë¡œë”© ?«ê¸°

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ë°˜ì†¡ ?”ì²­ ?„ë£Œ. ë°°ì†¡ë¹?${formattedReturnFee}?ì´ ì°¨ê°?©ë‹ˆ??),
            backgroundColor: Colors.orange,
          ),
        );
        await _loadOrderData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? 'ë°˜ì†¡ ?”ì²­ ?¤íŒ¨'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // ë¡œë”© ?«ê¸°
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('?¤ë¥˜ ë°œìƒ: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildStatusBanner(BuildContext context) {
    final isCancelled = _currentStatus == 'CANCELLED';
    final itemName = _orderData?['item_name'] as String? ?? '?˜ì„  ??ª©';

    // ì·¨ì†Œ??ê²½ìš° ?¤ë¥¸ ?¤í???
    if (isCancelled) {
      return Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.grey.shade300,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade400, width: 2),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade400,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.cancel_outlined,
                color: Colors.white,
                size: 32,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    itemName,
                    style: TextStyle(
                      color: Colors.grey.shade800,
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
                      color: Colors.red.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade300),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.cancel_outlined,
                          size: 14,
                          color: Colors.red.shade700,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '?˜ê±° ì·¨ì†Œ??,
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
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

    // ?•ìƒ ?íƒœ ë°°ë„ˆ
    final statusMap = {
      'BOOKED': {'label': '?˜ê±°?ˆì•½', 'icon': Icons.schedule_outlined},
      'INBOUND': {'label': '?…ê³ ?„ë£Œ', 'icon': Icons.inventory_outlined},
      'PROCESSING': {'label': '?˜ì„ ì¤?, 'icon': Icons.content_cut_rounded},
      'READY_TO_SHIP': {'label': 'ì¶œê³ ?„ë£Œ', 'icon': Icons.done_all_outlined},
      'DELIVERED': {'label': 'ë°°ì†¡?„ë£Œ', 'icon': Icons.check_circle_outline},
    };

    final statusInfo = statusMap[_currentStatus] ?? statusMap['BOOKED']!;
    final statusLabel = statusInfo['label'] as String;
    final statusIcon = statusInfo['icon'] as IconData;

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
            child: Icon(
              statusIcon,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  itemName,
                  style: const TextStyle(
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
                  child: Text(
                    statusLabel,
                    style: const TextStyle(
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
    // ê°€??6?¨ê³„ ?¸ë±?? ?˜ê±°?ˆì•½(0) ???˜ê±°?„ë£Œ(1) ???…ê³ ?„ë£Œ(2) ???˜ì„ ì¤?3) ??ì¶œê³ ?„ë£Œ(4) ??ë°°ì†¡?„ë£Œ(5)
    // ?˜ê±°?„ë£Œ??DB ?íƒœê°’ì´ ?„ë‹Œ ?°ì²´êµ?treatStusCd(03 ì§‘í•˜?„ë£Œ ?´ìƒ)ë¡??ë‹¨
    final dbStatusVirtualIndex = {
      'BOOKED': 0,
      'INBOUND': 2,
      'PROCESSING': 3,
      'READY_TO_SHIP': 4,
      'DELIVERED': 5,
    };

    int currentVirtualIndex = dbStatusVirtualIndex[_currentStatus] ?? 0;

    // BOOKED ?íƒœ?????°ì²´êµ?ì§‘í•˜?„ë£Œ(03 ?´ìƒ)ë©??˜ê±°?„ë£Œ(1) ?¨ê³„ë¡?ì§„ì…
    if (_currentStatus == 'BOOKED') {
      final code = _pickupTreatStusCd;
      if (code == '03' || code == '04' || code == '05') {
        currentVirtualIndex = 1;
      }
    }

    final steps = [
      {'label': '?˜ê±°?ˆì•½', 'icon': Icons.schedule_outlined},
      {'label': '?˜ê±°?„ë£Œ', 'icon': Icons.local_shipping_outlined},
      {'label': '?…ê³ ?„ë£Œ', 'icon': Icons.inventory_outlined},
      {'label': '?˜ì„ ì¤?, 'icon': Icons.content_cut_rounded},
      {'label': 'ì¶œê³ ?„ë£Œ', 'icon': Icons.done_all_outlined},
      {'label': 'ë°°ì†¡?„ë£Œ', 'icon': Icons.check_circle_outline},
    ];

    // ê°??¨ê³„???„ë£Œ ?¬ë? ê³„ì‚°
    for (int i = 0; i < steps.length; i++) {
      steps[i]['completed'] = currentVirtualIndex >= i;
    }

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
                'ì§„í–‰ ?í™©',
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
                  final isCurrent = stepIndex == currentVirtualIndex;
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
                          border: isCurrent
                              ? Border.all(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .primary
                                      .withOpacity(0.5),
                                  width: 3,
                                )
                              : null,
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
                  final prevCompleted =
                      steps[(index - 1) ~/ 2]['completed'] as bool;
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
                'ì£¼ë¬¸ ?•ë³´',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow(
              'ì£¼ë¬¸ë²ˆí˜¸',
              _formatOrderNumber(
                  _orderData?['order_number'] ?? widget.orderId)),
          _buildInfoRow('?˜ì„  ??ª©', _orderData?['item_name'] ?? '?˜ì„  ??ª©'),
          _buildInfoRow('ì£¼ë¬¸?¼ì‹œ', _formatDateTime(_orderData?['created_at'])),
          Divider(height: 24, color: Colors.grey.shade200),
          // ë°°ì†¡ë¹??´ì—­???ˆëŠ” ê²½ìš° ??ª©ë³??œì‹œ
          if (_orderData?['shipping_fee'] != null) ...[
            _buildInfoRow(
              '?˜ì„ ë¹?,
              _formatPrice(_orderData?['base_price'] ?? ((_orderData?['total_price'] as int? ?? 0) - (_orderData?['shipping_fee'] as int? ?? 0))),
            ),
            _buildInfoRow('?•ë³µë°°ì†¡ë¹?, _formatPrice(_orderData?['shipping_fee'])),
          ],
          _buildInfoRow('ê²°ì œê¸ˆì•¡', _formatPrice(_orderData?['total_price']),
              isHighlight: true),
          _buildInfoRow(
              'ê²°ì œë°©ë²•', _getPaymentMethodDisplay(_orderData?['payment_method'])),
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
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: TextStyle(
                fontSize: isHighlight ? 16 : 14,
                fontWeight: isHighlight ? FontWeight.bold : FontWeight.w500,
                color:
                    isHighlight ? Colors.grey.shade900 : Colors.grey.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// ì£¼ë¬¸ë²ˆí˜¸ ?¬ë§·??(ì§§ê²Œ ?œì‹œ)
  String _formatOrderNumber(dynamic orderNumber) {
    if (orderNumber == null) return 'ì£¼ë¬¸ë²ˆí˜¸ ?†ìŒ';
    final str = orderNumber.toString();
    // UUID??ê²½ìš° ë§ˆì?ë§?8?ë¦¬ë§??œì‹œ
    if (str.length > 20) {
      return '...${str.substring(str.length - 8)}';
    }
    // order_number ?„ë“œê°€ ?ˆìœ¼ë©?ê·¸ë?ë¡??¬ìš©
    return str;
  }

  /// ? ì§œ ?¬ë§·??
  String _formatDateTime(dynamic dateTime) {
    if (dateTime == null) return '? ì§œ ?†ìŒ';
    try {
      final dt = DateTime.parse(dateTime.toString());
      return '${dt.year}.${dt.month.toString().padLeft(2, '0')}.${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTime.toString();
    }
  }

  /// ê°€ê²??¬ë§·??
  String _formatPrice(dynamic price) {
    if (price == null) return '??';
    final numPrice = price is num ? price : int.tryParse(price.toString()) ?? 0;
    return '??{numPrice.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}';
  }

  /// ê²°ì œ ë°©ë²• ?œì‹œ ?ìŠ¤??
  String _getPaymentMethodDisplay(dynamic paymentMethod) {
    if (paymentMethod == null) return 'ë¯¸ê²°??;

    final method = paymentMethod.toString().toUpperCase();
    switch (method) {
      case 'CARD':
        return '? ìš©ì¹´ë“œ';
      case 'VIRTUAL_ACCOUNT':
        return 'ê°€?ê³„ì¢?;
      case 'TRANSFER':
        return 'ê³„ì¢Œ?´ì²´';
      case 'MOBILE':
        return '?´ë??°ê²°??;
      case 'BILLING':
        return '?•ê¸°ê²°ì œ';
      case 'TOSS':
        return '? ìŠ¤?˜ì´';
      case 'NAVERPAY':
        return '?¤ì´ë²„í˜??;
      case 'KAKAOPAY':
        return 'ì¹´ì¹´?¤í˜??;
      default:
        return paymentMethod.toString();
    }
  }

  /// ì£¼ì†Œ ?¬ë§·??
  String _formatAddress(dynamic address, dynamic detail) {
    final addr = address?.toString() ?? '';
    final det = detail?.toString();
    if (det != null && det.isNotEmpty && det != '?†ìŒ') {
      return '$addr $det';
    }
    return addr.isNotEmpty ? addr : 'ì£¼ì†Œ ?†ìŒ';
  }

  /// ê³ ê°?¼í„° ?°ê²° (ì¹´ì¹´?¤í†¡?¼ë¡œ ë°”ë¡œ ?°ê²°)
  Future<void> _openCustomerService(BuildContext context) async {
    // ì£¼ë¬¸ ?•ë³´ ?¬ë§·??ë°??´ë¦½ë³´ë“œ??ë³µì‚¬
    final orderInfo = _formatOrderInfoForChat();
    await Clipboard.setData(ClipboardData(text: orderInfo));

    // ì¹´ì¹´?¤í†¡ ì±„ë„ URL
    const kakaoChannelId = '_dLhAX';
    final kakaoChannelChatUrl =
        Uri.parse('https://pf.kakao.com/$kakaoChannelId/chat');
    final kakaoAppUrl =
        Uri.parse('kakaoplus://plusfriend/chat/$kakaoChannelId');

    // ë°”ë¡œ ì¹´ì¹´?¤í†¡ ???´ê¸°
    try {
      if (await canLaunchUrl(kakaoAppUrl)) {
        await launchUrl(kakaoAppUrl, mode: LaunchMode.externalApplication);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ì£¼ë¬¸ ?•ë³´ê°€ ë³µì‚¬?˜ì—ˆ?µë‹ˆ?? ì±„íŒ…ì°½ì—??ë¶™ì—¬?£ê¸° ?´ì£¼?¸ìš”.'),
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else if (await canLaunchUrl(kakaoChannelChatUrl)) {
        await launchUrl(kakaoChannelChatUrl,
            mode: LaunchMode.externalApplication);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ì£¼ë¬¸ ?•ë³´ê°€ ë³µì‚¬?˜ì—ˆ?µë‹ˆ?? ì±„íŒ…ì°½ì—??ë¶™ì—¬?£ê¸° ?´ì£¼?¸ìš”.'),
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else {
        throw Exception('ì¹´ì¹´?¤í†¡???????†ìŠµ?ˆë‹¤');
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('ì¹´ì¹´?¤í†¡???????†ìŠµ?ˆë‹¤. ?±ì´ ?¤ì¹˜?˜ì–´ ?ˆëŠ”ì§€ ?•ì¸?´ì£¼?¸ìš”.'),
          backgroundColor: Colors.red.shade400,
        ),
      );
    }
  }

  /// ì£¼ë¬¸ ?•ë³´ë¥?ì±„íŒ…???ìŠ¤?¸ë¡œ ?¬ë§·??
  String _formatOrderInfoForChat() {
    final buffer = StringBuffer();
    buffer.writeln('?ˆë…•?˜ì„¸?? ëª¨ë‘?˜ìˆ˜??ê³ ê°?…ë‹ˆ??');
    buffer.writeln();
    buffer.writeln('?“¦ ë¬¸ì˜ ì£¼ë¬¸ ?•ë³´');
    buffer.writeln('?€?€?€?€?€?€?€?€?€?€?€?€?€');

    // ì£¼ë¬¸ë²ˆí˜¸
    final orderNumber = _orderData?['order_number'] ?? widget.orderId;
    buffer.writeln('ì£¼ë¬¸ë²ˆí˜¸: $orderNumber');

    // ?˜ë¥˜/?˜ì„  ?•ë³´
    final clothingType = _orderData?['clothing_type'] ?? '-';
    final repairType = _orderData?['repair_type'] ?? '-';
    buffer.writeln('?˜ë¥˜: $clothingType');
    buffer.writeln('?˜ì„ : $repairType');

    // ?íƒœ
    final statusTextMap = {
      'BOOKED': '?˜ê±°?ˆì•½',
      'INBOUND': '?…ê³ ?„ë£Œ',
      'PROCESSING': '?˜ì„ ì¤?,
      'READY_TO_SHIP': 'ì¶œê³ ?„ë£Œ',
      'DELIVERED': 'ë°°ì†¡?„ë£Œ',
      'CANCELLED': 'ì·¨ì†Œ??,
    };
    buffer.writeln('?íƒœ: ${statusTextMap[_currentStatus] ?? _currentStatus}');

    // ?¡ì¥ë²ˆí˜¸ (?ˆìœ¼ë©?
    final trackingNo = _shipmentData?['pickup_tracking_no'] ??
        _shipmentData?['delivery_tracking_no'] ??
        _shipmentData?['tracking_no'];
    if (trackingNo != null) {
      buffer.writeln('?¡ì¥ë²ˆí˜¸: $trackingNo');
    }

    buffer.writeln('?€?€?€?€?€?€?€?€?€?€?€?€?€');
    buffer.writeln();
    buffer.writeln('ë¬¸ì˜ ?´ìš©:');

    return buffer.toString();
  }

  /// ?¡ì¥ë²ˆí˜¸ ì¹´ë“œ ë¹Œë”
  /// [showTrackingButton] - ë°°ì†¡ì¶”ì  ë²„íŠ¼ ?œì‹œ ?¬ë? (ê¸°ë³¸ê°? true)
  Widget _buildTrackingCard(
    BuildContext context,
    String label,
    String trackingNo,
    IconData icon,
    Color color,
    String description, {
    bool showTrackingButton = true,
  }) {
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
                  Clipboard.setData(ClipboardData(text: trackingNo));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('$label??ê°€) ë³µì‚¬?˜ì—ˆ?µë‹ˆ??),
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
          // ë°°ì†¡ì¶”ì  ë²„íŠ¼ (ì¡°ê±´ë¶€ ?œì‹œ)
          if (showTrackingButton) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon:
                    Icon(Icons.track_changes_outlined, size: 18, color: color),
                label: const Text('ë°°ì†¡ì¶”ì '),
                onPressed: () => _openTracking(trackingNo),
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
        ],
      ),
    );
  }

  /// ë°°ì†¡ì¶”ì  ?˜ì´ì§€ ?´ê¸° (???´ì—??
  void _openTracking(String trackingNo) async {
    try {
      // ë°°ì†¡ì¶”ì  ?˜ì´ì§€ë¡??´ë™
      if (mounted) {
        context.push('/orders/${widget.orderId}/tracking/$trackingNo');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ë°°ì†¡ì¶”ì ???????†ìŠµ?ˆë‹¤: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// ?¬ì§„ ì¶”ê? (?¬ìš©?˜ì? ?ŠìŒ)
  Future<void> _addPhoto() async {
    // ?¬ì§„ ? íƒ ë°”í??œíŠ¸
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
                  '?¬ì§„ ì¶”ê?',
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
                  child: const Icon(Icons.camera_alt_rounded,
                      color: Color(0xFF00C896)),
                ),
                title: const Text('ì¹´ë©”?¼ë¡œ ì´¬ì˜'),
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
                  child: const Icon(Icons.photo_library_rounded,
                      color: Colors.blue),
                ),
                title: const Text('ê°¤ëŸ¬ë¦¬ì—??? íƒ'),
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

        // ë¡œë”© ?œì‹œ
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('?´ë?ì§€ë¥??…ë¡œ?œí•˜??ì¤?..'),
            duration: Duration(seconds: 2),
          ),
        );

        // ?¤ì œ ?´ë?ì§€ ? íƒ ë°??…ë¡œ??
        final imageUrl = await imageService.pickAndUploadImage(
          source: source,
          bucket: 'order-images',
          folder: 'repairs',
        );

        // ?¬ìš©?ê? ì·¨ì†Œ??ê²½ìš°
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
            content: Text('?¬ì§„??ì¶”ê??˜ì—ˆ?µë‹ˆ??(${_images.length}??'),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('?´ë?ì§€ ?…ë¡œ???¤íŒ¨: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// ?¬ì§„ ?? œ
  Future<void> _deletePhoto(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title:
            const Text('?¬ì§„ ?? œ', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(
          '${index + 1}ë²??¬ì§„???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?\n?€ ?•ë³´???¨ê»˜ ?? œ?©ë‹ˆ??',
          style: const TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('ì·¨ì†Œ', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('?? œ'),
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
          content: Text('?¬ì§„???? œ?˜ì—ˆ?µë‹ˆ??),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  /// ?¬ì§„ ë³€ê²?
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
                  '${index + 1}ë²??¬ì§„ ë³€ê²?,
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
                  child: const Icon(Icons.camera_alt_rounded,
                      color: Color(0xFF00C896)),
                ),
                title: const Text('ì¹´ë©”?¼ë¡œ ì´¬ì˜'),
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
                  child: const Icon(Icons.photo_library_rounded,
                      color: Colors.blue),
                ),
                title: const Text('ê°¤ëŸ¬ë¦¬ì—??? íƒ'),
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

        // ë¡œë”© ?œì‹œ
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('?´ë?ì§€ë¥??…ë¡œ?œí•˜??ì¤?..'),
            duration: Duration(seconds: 2),
          ),
        );

        // ?¤ì œ ?´ë?ì§€ ? íƒ ë°??…ë¡œ??
        final imageUrl = await imageService.pickAndUploadImage(
          source: source,
          bucket: 'order-images',
          folder: 'repairs',
        );

        // ?¬ìš©?ê? ì·¨ì†Œ??ê²½ìš°
        if (imageUrl == null) return;

        setState(() {
          _images[index] = {
            'url': imageUrl,
            'pinsCount': 0, // ?¬ì§„ ë³€ê²????€ ì´ˆê¸°??
            'pins': [],
          };
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${index + 1}ë²??¬ì§„??ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤'),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('?´ë?ì§€ ?…ë¡œ???¤íŒ¨: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// ?€ ?˜ì • (?¹ì • ?¬ì§„)
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
          content: Text(
              '${index + 1}ë²??¬ì§„???€???˜ì •?˜ì—ˆ?µë‹ˆ??(${_images[index]['pinsCount']}ê°?'),
          backgroundColor: const Color(0xFF00C896),
        ),
      );
    }
  }

  /// ì²¨ë? ?¬ì§„ ë°??˜ì„  ë¶€???¹ì…˜ (?½ê¸° ?„ìš©)
  Widget _buildEditablePhotosSection(BuildContext context) {
    if (_images.isEmpty) {
      return const SizedBox.shrink();
    }

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
                'ì²¨ë? ?¬ì§„ ë°??˜ì„  ë¶€??,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ?¬ì§„ ëª©ë¡ (?½ê¸° ?„ìš©)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1,
            ),
            itemCount: _images.length,
            itemBuilder: (context, index) {
              final image = _images[index];
              final pins = image['pins'] as List<dynamic>? ?? [];

              return Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Stack(
                  children: [
                    // ?¬ì§„
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        image['url'] as String,
                        width: double.infinity,
                        height: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.grey.shade200,
                            child: const Center(
                              child: Icon(Icons.image_outlined,
                                  size: 40, color: Colors.grey),
                            ),
                          );
                        },
                      ),
                    ),

                    // ?€ ê°œìˆ˜ ë°°ì?
                    if (pins.isNotEmpty)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.shade600,
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
                                '${pins.length}',
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

                    // ?¬ì§„ ë²ˆí˜¸
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '?¬ì§„ ${index + 1}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),

          // ?€ ë©”ëª¨ ëª©ë¡ (?„ë˜ ?„ì¹˜, ?ë‹¨ ?¹ì…˜ ?œê±°??
          if (_images
              .any((img) => (img['pins'] as List?)?.isNotEmpty ?? false)) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.push_pin,
                          size: 16, color: Colors.blue.shade700),
                      const SizedBox(width: 6),
                      Text(
                        '?˜ì„  ë¶€??ë©”ëª¨',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ..._images.asMap().entries.expand((entry) {
                    final imageIndex = entry.key;
                    final image = entry.value;
                    final pins = image['pins'] as List<dynamic>? ?? [];

                    return pins.asMap().entries.map((pinEntry) {
                      final pinIndex = pinEntry.key;
                      final pin = pinEntry.value as Map<String, dynamic>;
                      final memo = pin['memo'] as String? ?? '';

                      if (memo.isEmpty) return const SizedBox.shrink();

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                color: Colors.red.shade600,
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
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '$memo (?¬ì§„ ${imageIndex + 1})',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    });
                  }),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// ?¬ì§„ ì¹´ë“œ (ë¹„í™œ?±í™”)
  Widget _buildPhotoCard(
      BuildContext context, Map<String, dynamic> image, int index) {
    return GestureDetector(
      onTap: () => _editPins(index), // ??•˜ë©??€ ?˜ì •
      onLongPress: () => _showPhotoOptions(context, index), // ê¸¸ê²Œ ?„ë¥´ë©?ë©”ë‰´
      child: Container(
        width: 120,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Stack(
          children: [
            // ?¬ì§„
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
                      child: Icon(Icons.image_outlined,
                          size: 40, color: Colors.grey),
                    ),
                  );
                },
              ),
            ),

            // ?€ ê°œìˆ˜ ë°°ì?
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

            // ?œì„œ ë²ˆí˜¸
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

            // ?? œ ë²„íŠ¼ (X)
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

  /// ?¬ì§„ ?µì…˜ ë©”ë‰´
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
                  '${index + 1}ë²??¬ì§„',
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
                title: const Text('?€ ?˜ì •'),
                subtitle: const Text('?˜ì„  ë¶€???œì‹œ ?˜ì •'),
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
                  child: const Icon(Icons.photo_library_rounded,
                      color: Colors.blue),
                ),
                title: const Text('?¬ì§„ ë³€ê²?),
                subtitle: const Text('?¤ë¥¸ ?¬ì§„?¼ë¡œ êµì²´'),
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
                title: const Text('?¬ì§„ ?? œ'),
                subtitle: const Text('?€ ?•ë³´???¨ê»˜ ?? œ'),
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
    // media ?Œì´ë¸”ì—??ì¡°íšŒ???ìƒ URL ?¬ìš©
    final hasInboundVideo = _inboundVideoUrl != null;
    final hasOutboundVideo = _outboundVideoUrl != null;
    final hasBothVideos = hasInboundVideo && hasOutboundVideo;

    // ?ìƒ???˜ë‚˜???†ìœ¼ë©??¹ì…˜ ?¨ê¸°ê¸?
    if (!hasInboundVideo && !hasOutboundVideo) {
      return const SizedBox.shrink();
    }

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
                '?…ì¶œê³??ìƒ',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),

          // ?„í›„ ë¹„êµ ?ìƒ (?°ì„  ?œì‹œ)
          if (hasBothVideos) ...[
            const SizedBox(height: 16),
            _buildComparisonVideoCard(context),
          ],

          // ê°œë³„ ?ìƒ (?„í›„ ë¹„êµ ?ìƒ???ˆì„ ?ŒëŠ” ?¨ê¸°ê¸?
          if (!hasBothVideos) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child:
                      _buildVideoCard(context, '?…ê³  ?ìƒ', true, hasInboundVideo),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildVideoCard(
                      context, 'ì¶œê³  ?ìƒ', false, hasOutboundVideo),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVideoCard(
      BuildContext context, String title, bool isInbound, bool hasVideo) {
    return InkWell(
      onTap: hasVideo
          ? () {
              // ê°œë³„ ?ìƒ ?¬ìƒ
              final videoUrl = isInbound ? _inboundVideoUrl : _outboundVideoUrl;
              if (videoUrl != null && videoUrl.isNotEmpty) {
                // VideoPlayerDialog ?¬ìš© (ë¦¬ì†Œ???„ìˆ˜ ë°©ì?)
                showDialog(
                  context: context,
                  builder: (context) => _VideoPlayerDialog(
                    title: title,
                    videoUrl: videoUrl,
                  ),
                );
              }
            }
          : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: hasVideo
              ? Theme.of(context).colorScheme.primary.withOpacity(0.05)
              : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasVideo
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
                color: hasVideo
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade400,
                shape: BoxShape.circle,
              ),
              child: Icon(
                hasVideo ? Icons.play_arrow_rounded : Icons.schedule,
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
                color: hasVideo ? Colors.grey.shade800 : Colors.grey.shade600,
              ),
            ),
            if (!hasVideo) ...[
              const SizedBox(height: 4),
              Text(
                'ì¤€ë¹?ì¤?,
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

  Widget _buildComparisonVideoCard(BuildContext context) {
    final hasBoth = _inboundVideoUrl != null && _outboundVideoUrl != null;
    final hasMultipleItems = _videoItems.length > 1;

    return InkWell(
      onTap: hasBoth
          ? () {
              if (hasMultipleItems) {
                // ?¬ëŸ¬ ?„ì´?? ?œì°¨ ?¬ìƒ
                debugPrint('?¬ ${_videoItems.length}ê°??„ì´???œì°¨ ?¬ìƒ');
                context.push(
                  '/comparison-video',
                  extra: {
                    'videoItems': _videoItems,
                  },
                );
              } else {
                // ?¨ì¼ ?„ì´?? ê¸°ì¡´ ë°©ì‹
                debugPrint('?¬ ?¨ì¼ ?„ì´???¬ìƒ');
                context.push(
                  '/comparison-video',
                  extra: {
                    'inboundUrl': _inboundVideoUrl,
                    'outboundUrl': _outboundVideoUrl,
                  },
                );
              }
            }
          : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: hasBoth
              ? LinearGradient(
                  colors: [
                    Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    Theme.of(context).colorScheme.primary.withOpacity(0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: hasBoth ? null : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasBoth
                ? Theme.of(context).colorScheme.primary.withOpacity(0.3)
                : Colors.grey.shade300,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: hasBoth
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade400,
                shape: BoxShape.circle,
              ),
              child: Icon(
                hasBoth ? Icons.compare_arrows_outlined : Icons.schedule,
                size: 36,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '?„í›„ ë¹„êµ ?ìƒ',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color:
                          hasBoth ? Colors.grey.shade900 : Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    hasBoth ? 'ì¢Œìš° ?˜ë????¬ìƒ?©ë‹ˆ?? : '?…ê³ /ì¶œê³  ?ìƒ ì¤€ë¹?ì¤?,
                    style: TextStyle(
                      fontSize: 13,
                      color:
                          hasBoth ? Colors.grey.shade600 : Colors.grey.shade500,
                    ),
                  ),
                  if (hasBoth) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        '?¬ìƒ?˜ê¸°',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 20,
              color: hasBoth
                  ? Theme.of(context).colorScheme.primary
                  : Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }

  /// ?šš ë°°ì†¡/?˜ê±° ?„ë£Œ ?ë™ ì²´í¬
  /// - BOOKED ?íƒœ: ?˜ê±° ?¡ì¥?¼ë¡œ ì¶”ì  ???˜ê±° ?„ë£Œ ??INBOUNDë¡?ë³€ê²?
  /// - READY_TO_SHIP ?íƒœ: ë°°ì†¡ ?¡ì¥?¼ë¡œ ì¶”ì  ??ë°°ì†¡ ?„ë£Œ ??DELIVEREDë¡?ë³€ê²?
  Future<void> _checkDeliveryCompletion(String currentStatus) async {
    try {
      // ?íƒœ???°ë¼ ?ì ˆ???¡ì¥ë²ˆí˜¸ ? íƒ
      String? trackingNo;
      String trackingType;

      if (currentStatus == 'BOOKED') {
        // ?˜ê±° ì¤? ?˜ê±° ?¡ì¥ë²ˆí˜¸ ?¬ìš©
        trackingNo = _shipmentData?['pickup_tracking_no']?.toString();
        trackingType = '?˜ê±°';
      } else {
        // ë°°ì†¡ ì¤? ë°°ì†¡ ?¡ì¥ë²ˆí˜¸ ?¬ìš©
        trackingNo = _shipmentData?['delivery_tracking_no']?.toString();
        trackingType = 'ë°°ì†¡';
      }

      if (trackingNo == null || trackingNo.isEmpty) {
        debugPrint('? ï¸ $trackingType ì¶”ì  ì²´í¬: ?¡ì¥ë²ˆí˜¸ ?†ìŒ');
        return;
      }

      debugPrint('?šš $trackingType ?„ë£Œ ?ë™ ì²´í¬ ?œì‘: $trackingNo');

      // ë°°ì†¡ ì¶”ì  API ?¸ì¶œ (??API?ì„œ ?„ë£Œ ê°ì? ???ë™?¼ë¡œ DB ?…ë°?´íŠ¸)
      final trackingData = await _orderService.trackShipment(trackingNo);

      // ?„ë£Œ ê°ì??˜ì—ˆ?”ì? ?•ì¸ (successResponse ?˜í•‘ ì²˜ë¦¬)
      final inner =
          trackingData['data'] as Map<String, dynamic>? ?? trackingData;
      final epost = inner['epost'] as Map<String, dynamic>?;
      final treatStusCd = epost?['treatStusCd'] as String?;

      if (treatStusCd == '05') {
        debugPrint('??$trackingType ?„ë£Œ ê°ì??? ?íƒœ ?…ë°?´íŠ¸ ?„ë£Œ');

        // ì£¼ë¬¸ ?°ì´???ˆë¡œê³ ì¹¨ (?íƒœ ë³€ê²?ë°˜ì˜)
        if (mounted) {
          await _loadOrderData(showLoading: false);

          // ?íƒœ???°ë¥¸ ?Œë¦¼ ë©”ì‹œì§€
          final message = currentStatus == 'BOOKED'
              ? '?“¦ ?˜ê±°ê°€ ?„ë£Œ?˜ì–´ ?…ê³ ?˜ì—ˆ?µë‹ˆ??'
              : '?‰ ë°°ì†¡???„ë£Œ?˜ì—ˆ?µë‹ˆ??';

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: const Color(0xFF00C896),
              duration: const Duration(seconds: 3),
            ),
          );
        }
      } else {
        debugPrint(
            '?“¦ $trackingType ?íƒœ: ${epost?['treatStusNm'] ?? '?•ì¸ ì¤?} (ì½”ë“œ: $treatStusCd)');
      }
    } catch (e) {
      debugPrint('? ï¸ ì¶”ì  ì²´í¬ ?¤íŒ¨ (ë¬´ì‹œ): $e');
      // ?¤íŒ¨?´ë„ ë¬´ì‹œ - ?¬ìš©??ê²½í—˜???í–¥ ?†ìŒ
    }
  }

  /// ?˜ê±° ?¡ì¥??treatStusCd ì¡°íšŒ (ì·¨ì†Œ ë²„íŠ¼ ?¸ì¶œ ?¬ë? ?ë‹¨??
  /// 00/01/02: ?˜ê±°ì¤€ë¹???ì·¨ì†Œ ê°€?? 03/04/05: ?‘ìˆ˜/ë°œì†¡/?„ì°© ??ë¬¸ì˜?˜ê¸°ë§?
  Future<void> _fetchPickupTreatStusCd(Map<String, dynamic> shipment) async {
    try {
      final pickupNo =
          shipment['pickup_tracking_no'] ?? shipment['tracking_no'];
      if (pickupNo == null || pickupNo.toString().isEmpty) return;

      final trackingData =
          await _orderService.trackShipment(pickupNo.toString());
      // successResponse ?˜í•‘: data.data ?ëŠ” data??epost ?ˆì„ ???ˆìŒ
      final inner =
          trackingData['data'] as Map<String, dynamic>? ?? trackingData;
      final epost = inner['epost'] as Map<String, dynamic>?;
      final code = epost?['treatStusCd'] as String?;

      if (mounted) {
        setState(() => _pickupTreatStusCd = code);
        debugPrint('?“¦ ?˜ê±° treatStusCd: $code (00~02=ì·¨ì†Œê°€?? 03~05=ë¬¸ì˜?˜ê¸°)');
      }
    } catch (e) {
      debugPrint('? ï¸ ?˜ê±° treatStusCd ì¡°íšŒ ?¤íŒ¨: $e');
      if (mounted) {
        setState(() => _pickupTreatStusCd = null);
      }
    }
  }

  /// ?˜ê±° ì·¨ì†Œ ê°€???¬ë? ?ë‹¨
  /// - BOOKED ?íƒœ?ì„œ??ê¸°ë³¸?ìœ¼ë¡?ì·¨ì†Œ ê°€??
  /// - ë°°ì†¡ì¶”ì  ê²°ê³¼ê°€ 03(ì§‘í•˜?„ë£Œ) ?´ìƒ?´ë©´ ì·¨ì†Œ ë¶ˆê?????ë¬¸ì˜?˜ê¸°ë§?
  /// - ì¡°íšŒ ???¤íŒ¨ ?œì—??ì·¨ì†Œ ê°€??(?°ì²´êµ?API?ì„œ ìµœì¢… ê²€ì¦?
  bool get _isPickupCancellable {
    // ë°°ì†¡ì¶”ì  ì¡°íšŒ ?„ì´ê±°ë‚˜ ?¤íŒ¨??ê²½ìš° ??ì·¨ì†Œ ê°€??(?°ì²´êµ?API?ì„œ ìµœì¢… ê²€ì¦?
    if (_pickupTreatStusCd == null) return true;

    // 03(ì§‘í•˜?„ë£Œ), 04(ë°°ì†¡ì¤?, 05(ë°°ì†¡?„ë£Œ) ??ì·¨ì†Œ ë¶ˆê???
    if (_pickupTreatStusCd == '03' ||
        _pickupTreatStusCd == '04' ||
        _pickupTreatStusCd == '05') {
      return false;
    }

    // 00(? ì²­ì¤€ë¹?, 01(?Œí¬? ì²­), 02(?´ì†¡?¥ì¶œ?? ??ì·¨ì†Œ ê°€??
    return true;
  }

  Future<void> _loadVideoUrls() async {
    try {
      debugPrint('?” shipmentData: ${_shipmentData?.keys.toList()}');
      debugPrint(
          '?” pickup_tracking_no: ${_shipmentData?['pickup_tracking_no']}');
      debugPrint(
          '?” delivery_tracking_no: ${_shipmentData?['delivery_tracking_no']}');

      // ëª¨ë“  ê°€?¥í•œ ?¡ì¥ë²ˆí˜¸ë¡?ì¡°íšŒ (? ì—°??ë§¤ì¹­)
      final candidates = [
        _shipmentData?['pickup_tracking_no'], // ?˜ê±° ?¡ì¥ (?…ê³  ?ìƒ??
        _shipmentData?['delivery_tracking_no'], // ì¶œê³  ?¡ì¥ (ì¶œê³  ?ìƒ??
        _shipmentData?['tracking_no'], // ê¸°ë³¸ ?¡ì¥
        _shipmentData?['outbound_tracking_no'], // ?¸í™˜??
        _orderData?['id'], // orderId (?´ë°±)
      ]
          .where((v) => v != null && (v is String) && v.isNotEmpty)
          .toSet()
          .toList(); // ì¤‘ë³µ ?œê±°

      if (candidates.isEmpty) {
        debugPrint('??final_waybill_no ?„ë³´ê°€ ?†ìŠµ?ˆë‹¤');
        return;
      }

      debugPrint('?” ?ìƒ ì¡°íšŒ ?œë„ (${candidates.length}ê°??„ë³´): $candidates');

      final supabase = Supabase.instance.client;
      final videos = await supabase
          .from('media')
          .select('type, path, provider, final_waybill_no, sequence')
          .inFilter('final_waybill_no', candidates)
          .inFilter('type', ['inbound_video', 'outbound_video']).order(
              'sequence',
              ascending: true); // sequence ?œì„œ?€ë¡?

      debugPrint('?“¹ ì¡°íšŒ???ìƒ: ${videos.length}ê°?);
      if (videos.isNotEmpty) {
        debugPrint(
            '?“¹ ?ìƒ ?ì„¸: ${videos.map((v) => '${v['type']}#${v['sequence']}(${v['final_waybill_no']})').join(', ')}');
      }

      // sequenceë³„ë¡œ ?ìƒ ê·¸ë£¹??
      final Map<int, Map<String, String>> videosBySequence = {};
      String? firstInboundUrl;
      String? firstOutboundUrl;

      for (final video in videos) {
        final type = video['type'] as String?;
        final path = video['path'] as String? ?? '';
        final provider = video['provider'] as String? ?? '';
        final sequence = video['sequence'] as int? ?? 1;

        String? url;
        if (path.startsWith('http')) {
          url = path;
        } else if (provider == 'cloudflare' && path.isNotEmpty) {
          // Cloudflare Stream HLS URL
          url = 'https://videodelivery.net/$path/manifest/video.m3u8';
        }

        if (url != null) {
          // sequenceë³„ë¡œ ?€??
          videosBySequence[sequence] ??= {};

          if (type == 'inbound_video') {
            videosBySequence[sequence]!['inbound'] = url;
            firstInboundUrl ??= url; // ì²?ë²ˆì§¸ ?…ê³  ?ìƒ
          } else if (type == 'outbound_video') {
            videosBySequence[sequence]!['outbound'] = url;
            firstOutboundUrl ??= url; // ì²?ë²ˆì§¸ ì¶œê³  ?ìƒ
          }
        }
      }

      // ëª¨ë“  ?„ì´?œì˜ ?ìƒ ?ì„ ë¦¬ìŠ¤?¸ë¡œ ë³€??
      final videoItems = <Map<String, String>>[];
      final sortedSequences = videosBySequence.keys.toList()..sort();

      for (final seq in sortedSequences) {
        final inbound = videosBySequence[seq]!['inbound'];
        final outbound = videosBySequence[seq]!['outbound'];

        // ?…ê³ /ì¶œê³  ?????ˆëŠ” ê²½ìš°ë§?ì¶”ê?
        if (inbound != null && outbound != null) {
          videoItems.add({
            'inbound': inbound,
            'outbound': outbound,
          });
        }
      }

      debugPrint('?¬ ?„ì„±???ìƒ ?? ${videoItems.length}ê°?);

      if (mounted) {
        setState(() {
          _inboundVideoUrl = firstInboundUrl;
          _outboundVideoUrl = firstOutboundUrl;
          _videoItems = videoItems;
        });
      }
    } catch (e) {
      debugPrint('?…ê³ /ì¶œê³  ?ìƒ ì¡°íšŒ ?¤íŒ¨: $e');
    }
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
                'ë°°ì†¡ ?•ë³´',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ?¡ì¥ë²ˆí˜¸ ì¹´ë“œ (2ê°?
          // ?…ê³  ?„ë£Œ(INBOUND), ?˜ì„ ì¤?PROCESSING) ?íƒœ?ì„œ??ë°°ì†¡ì¶”ì  ë²„íŠ¼ ?¨ê?
          // 1. ?Œìˆ˜ ?¡ì¥ë²ˆí˜¸ - ?…ê³  ?„ë£Œ ?„ì—??ë°°ì†¡ì¶”ì  ë¶ˆí•„??
          if (_shipmentData?['pickup_tracking_no'] != null)
            _buildTrackingCard(
              context,
              '?Œìˆ˜ ?¡ì¥ë²ˆí˜¸',
              _shipmentData!['pickup_tracking_no'] as String,
              Icons.local_shipping_outlined,
              Colors.blue,
              '?˜ê±° ???¬ìš©',
              showTrackingButton: _currentStatus == 'BOOKED',
            ),
          if (_shipmentData?['pickup_tracking_no'] != null)
            const SizedBox(height: 12),

          // 2. ë°œì†¡ ?¡ì¥ë²ˆí˜¸ - ì¶œê³  ?„ë£Œ(READY_TO_SHIP) ?´í›„?ë§Œ ë°°ì†¡ì¶”ì  ?œì‹œ
          if (_shipmentData?['delivery_tracking_no'] != null)
            _buildTrackingCard(
              context,
              'ë°œì†¡ ?¡ì¥ë²ˆí˜¸',
              _shipmentData!['delivery_tracking_no'] as String,
              Icons.send_outlined,
              const Color(0xFF00C896),
              'ë°°ì†¡ ???¬ìš©',
              showTrackingButton:
                  _currentStatus == 'READY_TO_SHIP' ||
                  _currentStatus == 'DELIVERED',
            ),
          if (_shipmentData?['delivery_tracking_no'] != null)
            const SizedBox(height: 12),

          // ?¡ì¥ë²ˆí˜¸ê°€ ?†ì„ ???ˆë‚´
          if ((_shipmentData?['pickup_tracking_no'] == null) &&
              (_shipmentData?['delivery_tracking_no'] == null))
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline,
                      color: Colors.grey.shade600, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '?¡ì¥ë²ˆí˜¸ê°€ ?„ì§ ë°œê¸‰?˜ì? ?Šì•˜?µë‹ˆ??',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),

          _buildInfoRow('?ë°°??,
              _shipmentData?['carrier'] == 'EPOST' ? '?°ì²´êµ??ë°°' : '?°ì²´êµ??ë°°'),
          _buildInfoRow(
            '?˜ê±°ì§€',
            _formatAddress(
              _orderData?['pickup_address'],
              _orderData?['pickup_address_detail'],
            ),
          ),
          _buildDeliveryAddressRow(context),
          if (_orderData?['notes'] != null &&
              (_orderData!['notes'] as String).isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 80,
                  child: Text(
                    'ë°°ì†¡ ë©”ëª¨',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    _orderData!['notes'] as String,
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDeliveryAddressRow(BuildContext context) {
    final addr = _formatAddress(
      _orderData?['delivery_address'],
      _orderData?['delivery_address_detail'],
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              'ë°°ì†¡ì§€',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
            ),
          ),
          Expanded(
            child: Text(addr, style: const TextStyle(fontSize: 14)),
          ),
          if (_canEditDelivery)
            GestureDetector(
              onTap: () => _showDeliveryEditSheet(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF00C896).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit_outlined, size: 13, color: Color(0xFF00C896)),
                    SizedBox(width: 4),
                    Text(
                      '?˜ì •',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF00C896),
                        fontWeight: FontWeight.w600,
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
        child: _currentStatus == 'CANCELLED'
            ? _buildCancelledButtons(context)
            : _currentStatus == 'BOOKED'
                ? (_isPickupCancellable
                    ? _buildBookedButtons(context)
                    : _buildDefaultButtons(context))
                : (_currentStatus == 'PICKED_UP' || _currentStatus == 'INBOUND')
                    ? _buildPostPickupCancelButtons(context)
                    : _buildDefaultButtons(context),
      ),
    );
  }

  /// BOOKED ?íƒœ????ë²„íŠ¼ (?˜ê±° ì·¨ì†Œ ê°€??
  Widget _buildBookedButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: _isCancelling
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.red),
                  )
                : const Icon(Icons.cancel_outlined, size: 20),
            label: Text(_isCancelling ? 'ì·¨ì†Œ ì¤?..' : '?˜ê±° ì·¨ì†Œ'),
            onPressed: _isCancelling ? null : () => _showCancelDialog(context),
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
            label: const Text('ë¬¸ì˜?˜ê¸°'),
            onPressed: () => _openCustomerService(context),
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

  /// ?˜ê±°?„ë£Œ(PICKED_UP) / ?…ê³ ?„ë£Œ(INBOUND) ?íƒœ ë²„íŠ¼.
  /// ?˜ë¥˜ê°€ ?´ë? ?°ë¦¬ ?ì— ?ˆìœ¼ë¯€ë¡??°ì²´êµ??˜ê±° ì·¨ì†Œê°€ ?„ë‹ˆ??
  /// "ì£¼ë¬¸ ì·¨ì†Œ ??ë¶€ë¶„í™˜ë¶?+ ë°˜ì†¡ ?Œí¬?Œë¡œ?? ë¡?ì²˜ë¦¬?œë‹¤.
  Widget _buildPostPickupCancelButtons(BuildContext context) {
    final returnFee =
        ShippingSettingsService().current.returnShippingFee;
    final remoteAreaFee =
        (_orderData?['remote_area_fee'] as num?)?.toInt() ?? 0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                icon: _isCancelling
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.red),
                      )
                    : const Icon(Icons.cancel_outlined, size: 20),
                label: Text(_isCancelling ? 'ì·¨ì†Œ ì¤?..' : 'ì£¼ë¬¸ ì·¨ì†Œ'),
                onPressed: _isCancelling
                    ? null
                    : () => _showPostPickupCancelDialog(context),
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
                label: const Text('ë¬¸ì˜?˜ê¸°'),
                onPressed: () => _openCustomerService(context),
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
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            remoteAreaFee > 0
                ? '?…ê³ ???íƒœ?ì„œ ì·¨ì†Œ ???•ë³µ ë°°ì†¡ë¹?${_formatPrice(returnFee)}??+ ?„ì„œ?°ê°„ ${_formatPrice(remoteAreaFee)}?ì´ ì°¨ê°?˜ê³  ?˜ë¨¸ì§€ ê¸ˆì•¡???˜ë¶ˆ?©ë‹ˆ??'
                : '?…ê³ ???íƒœ?ì„œ ì·¨ì†Œ ???•ë³µ ë°°ì†¡ë¹?${_formatPrice(returnFee)}?ì´ ì°¨ê°?˜ê³  ?˜ë¨¸ì§€ ê¸ˆì•¡???˜ë¶ˆ?©ë‹ˆ??',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade500,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }

  /// ì·¨ì†Œ???íƒœ????ë²„íŠ¼
  Widget _buildCancelledButtons(BuildContext context) {
    final canceledYn = _cancelInfo?['canceledYn'] as String?;

    // ?°ì²´êµ?API ?‘ë‹µ???°ë¥¸ ë²„íŠ¼ ?ìŠ¤??
    // canceledYn ê°?
    // - 'Y': ?°ì²´êµ??„ì‚°?ë„ ì·¨ì†Œ ë°˜ì˜????(?¤ì œ ì·¨ì†Œ ?±ê³µ)
    // - 'N': ?°ì²´êµ??„ì‚° ì·¨ì†Œ ?¤íŒ¨ (?´ë? ì§‘í•˜?˜ì—ˆê±°ë‚˜ ì·¨ì†Œ ë¶ˆê???
    // - 'D': ?°ì²´êµ??„ì‚°?ì„œ ?? œ??
    // - null/ë¹ˆê°’: ?°ì²´êµ?API ?‘ë‹µ ?†ìŒ (ë¹„ì •???í™© - ë°œìƒ?˜ì? ?Šì•„????
    String buttonText = '?˜ê±° ì·¨ì†Œ??;
    Color buttonColor = Colors.grey.shade600;
    IconData buttonIcon = Icons.cancel_outlined;

    if (canceledYn == 'Y') {
      // ?°ì²´êµ??„ì‚°?ë„ ì·¨ì†Œ ë°˜ì˜??- ?¤ì œ ì·¨ì†Œ ?±ê³µ
      buttonText = '?˜ê±° ì·¨ì†Œ??;
      buttonColor = Colors.grey.shade600;
      buttonIcon = Icons.check_circle_outline;
    } else if (canceledYn == 'N') {
      // ?°ì²´êµ??„ì‚° ì·¨ì†Œ ?¤íŒ¨ (?´ë? ì§‘í•˜?˜ì—ˆê±°ë‚˜ ì·¨ì†Œ ë¶ˆê???
      buttonText = '?˜ê±° ì·¨ì†Œ??(?°ì²´êµ??„ì‚° ?¤íŒ¨)';
      buttonColor = Colors.orange.shade700;
      buttonIcon = Icons.warning_amber_rounded;
    } else if (canceledYn == 'D') {
      // ?°ì²´êµ??„ì‚°?ì„œ ?? œ??
      buttonText = '?˜ê±° ì·¨ì†Œ??;
      buttonColor = Colors.grey.shade600;
      buttonIcon = Icons.delete_outline;
    } else {
      // ?°ì²´êµ?API ?‘ë‹µ ?†ìŒ (ë¹„ì •???í™©)
      // ??ê²½ìš°??ë°œìƒ?˜ì? ?Šì•„???˜ì?ë§? ?¹ì‹œ ë°œìƒ?˜ë©´ DBë§?ì·¨ì†Œ???íƒœ
      buttonText = '?˜ê±° ì·¨ì†Œ??;
      buttonColor = Colors.grey.shade600;
      buttonIcon = Icons.cancel_outlined;
    }

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: Icon(buttonIcon, size: 20, color: buttonColor),
            label: Text(
              buttonText,
              style: TextStyle(color: buttonColor),
            ),
            onPressed: null, // ë¹„í™œ?±í™”
            style: OutlinedButton.styleFrom(
              foregroundColor: buttonColor,
              side: BorderSide(color: buttonColor),
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
            label: const Text('ë¬¸ì˜?˜ê¸°'),
            onPressed: () => _openCustomerService(context),
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

  /// ê¸°ë³¸ ë²„íŠ¼ (ë¬¸ì˜?˜ê¸° + ë°°ì†¡ ì¶”ì )
  /// ?…ê³  ?„ë£Œ(INBOUND), ?˜ì„ ì¤?PROCESSING) ?íƒœ?ì„œ??ë°°ì†¡ì¶”ì  ë²„íŠ¼ ?¨ê?
  Widget _buildDefaultButtons(BuildContext context) {
    // ?…ê³  ?„ë£Œ ~ ì¶œê³  ???íƒœ?ì„œ??ë°°ì†¡ì¶”ì ???„ìš” ?†ìŒ
    final hideTrackingButton =
        _currentStatus == 'INBOUND' || _currentStatus == 'PROCESSING';

    if (hideTrackingButton) {
      // ë¬¸ì˜?˜ê¸° ë²„íŠ¼ë§??œì‹œ (?„ì²´ ?ˆë¹„)
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          icon: const Icon(Icons.headset_mic_outlined, size: 20),
          label: const Text('ë¬¸ì˜?˜ê¸°'),
          onPressed: () => _openCustomerService(context),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 0,
          ),
        ),
      );
    }

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: const Icon(Icons.headset_mic_outlined, size: 20),
            label: const Text('ë¬¸ì˜?˜ê¸°'),
            onPressed: () => _openCustomerService(context),
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
            label: const Text('ë°°ì†¡ ì¶”ì '),
            onPressed: () {
              final trackingNo = _shipmentData?['pickup_tracking_no'] ??
                  _shipmentData?['delivery_tracking_no'] ??
                  _shipmentData?['tracking_no'];
              if (trackingNo != null) {
                _openTracking(trackingNo.toString());
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('?¡ì¥ë²ˆí˜¸ê°€ ?†ìŠµ?ˆë‹¤'),
                    backgroundColor: Colors.orange,
                  ),
                );
              }
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

  /// ì¶œê³ ?„ë£Œ ?„ê¹Œì§€ë§?ë°°ì†¡ì§€ ?˜ì • ê°€??
  bool get _canEditDelivery =>
      !['READY_TO_SHIP', 'DELIVERED', 'CANCELLED'].contains(_currentStatus);

  /// ë°°ì†¡ì§€/ë©”ëª¨ ?˜ì • ë°”í??œíŠ¸
  Future<void> _showDeliveryEditSheet(BuildContext context) async {
    final zipcode = _orderData?['delivery_zipcode'] as String? ?? '';
    final address = _orderData?['delivery_address'] as String? ?? '';
    final addressDetail = _orderData?['delivery_address_detail'] as String? ?? '';
    final notes = _orderData?['notes'] as String? ?? '';

    final zipcodeController = TextEditingController(text: zipcode);
    final addressController = TextEditingController(text: address);
    final detailController = TextEditingController(text: addressDetail);
    final notesController = TextEditingController(text: notes);
    final detailFocus = FocusNode();

    Future<void> searchAddress(StateSetter setModalState) async {
      final result = await showDialog<Map<String, String>>(
        context: context,
        builder: (context) => Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: const DaumPostcodeWidget(),
        ),
      );
      if (result != null) {
        setModalState(() {
          zipcodeController.text = result['zonecode'] ?? '';
          addressController.text = result['address'] ?? '';
        });
        await Future.delayed(const Duration(milliseconds: 300));
        if (context.mounted) detailFocus.requestFocus();
      }
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ?¤ë”
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'ë°°ì†¡ì§€ ?˜ì •',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // ë°°ì†¡ ì£¼ì†Œ
                const Text(
                  'ë°°ì†¡ ì£¼ì†Œ',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Text(
                          addressController.text.isEmpty
                              ? 'ì£¼ì†Œë¥?ê²€?‰í•´ì£¼ì„¸??
                              : '${zipcodeController.text.isNotEmpty ? '[${zipcodeController.text}] ' : ''}${addressController.text}',
                          style: TextStyle(
                            fontSize: 14,
                            color: addressController.text.isEmpty
                                ? Colors.grey.shade400
                                : Colors.grey.shade800,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.search, size: 18),
                      label: const Text('ê²€??),
                      onPressed: () => searchAddress(setModalState),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ?ì„¸ ì£¼ì†Œ
                const Text(
                  '?ì„¸ ì£¼ì†Œ',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: detailController,
                  focusNode: detailFocus,
                  decoration: InputDecoration(
                    hintText: '?? ?¸ìˆ˜ ???ì„¸ì£¼ì†Œ ?…ë ¥',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF00C896)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                // ë°°ì†¡ ë©”ëª¨
                const Text(
                  'ë°°ì†¡ ë©”ëª¨',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'ë°°ì†¡ ???”ì²­?¬í•­ (?? ë¬??ì— ?“ì•„ì£¼ì„¸??',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF00C896)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 20),

                // ?€??ë²„íŠ¼
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSavingDelivery
                        ? null
                        : () async {
                            if (addressController.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('ë°°ì†¡ ì£¼ì†Œë¥??…ë ¥?´ì£¼?¸ìš”.'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }
                            Navigator.of(context).pop();
                            await _saveDeliveryInfo(
                              zipcode: zipcodeController.text.trim(),
                              address: addressController.text.trim(),
                              addressDetail: detailController.text.trim(),
                              notes: notesController.text.trim(),
                            );
                          },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('?€?¥í•˜ê¸?, style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    zipcodeController.dispose();
    addressController.dispose();
    detailController.dispose();
    notesController.dispose();
    detailFocus.dispose();
  }

  /// ë°°ì†¡ì§€ ?•ë³´ Supabase ?€??
  Future<void> _saveDeliveryInfo({
    required String zipcode,
    required String address,
    required String addressDetail,
    required String notes,
  }) async {
    if (!mounted) return;
    setState(() => _isSavingDelivery = true);
    try {
      final supabase = Supabase.instance.client;
      await supabase.from('orders').update({
        'delivery_address': address,
        'delivery_address_detail': addressDetail.isEmpty ? null : addressDetail,
        'delivery_zipcode': zipcode.isEmpty ? null : zipcode,
        'notes': notes.isEmpty ? null : notes,
        'delivery_address_updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', widget.orderId);

      if (mounted) {
        setState(() {
          _orderData = {
            ..._orderData ?? {},
            'delivery_address': address,
            'delivery_address_detail': addressDetail.isEmpty ? null : addressDetail,
            'delivery_zipcode': zipcode.isEmpty ? null : zipcode,
            'notes': notes.isEmpty ? null : notes,
          };
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('ë°°ì†¡ì§€ê°€ ?˜ì •?˜ì—ˆ?µë‹ˆ??'),
            backgroundColor: Color(0xFF00C896),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('?€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSavingDelivery = false);
    }
  }

  /// ?˜ê±° ì·¨ì†Œ ?•ì¸ ?¤ì´?¼ë¡œê·?
  void _showCancelDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          '?˜ê±° ì·¨ì†Œ',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text(
          '?˜ê±° ?ˆì•½??ì·¨ì†Œ?˜ì‹œê² ìŠµ?ˆê¹Œ?\nì·¨ì†Œ ?„ì—???¤ì‹œ ?ˆì•½?˜ì…”???©ë‹ˆ??',
          style: TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              '?«ê¸°',
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
            child: const Text('ì·¨ì†Œ?˜ê¸°'),
          ),
        ],
      ),
    );
  }

  /// ?…ê³  ??PICKED_UP / INBOUND) ì·¨ì†Œ ?•ì¸ ?¤ì´?¼ë¡œê·?
  /// ?•ë³µ ë°°ì†¡ë¹„ê? ì°¨ê°?˜ê³  ë¶€ë¶„í™˜ë¶?+ ?˜ë¥˜ ë°˜ì†¡??ì§„í–‰?¨ì„ ëª…í™•???ˆë‚´.
  Future<void> _showPostPickupCancelDialog(BuildContext context) async {
    // ë°°ì†¡ë¹??¤ì •?€ ìºì‹œê°??°ì„  ?œì‹œ?˜ê³  ë°±ê·¸?¼ìš´?œë¡œ ê°±ì‹ .
    final settings = ShippingSettingsService().current;
    // ë°±ê·¸?¼ìš´???ˆë¡œê³ ì¹¨ (?¤ì´?¼ë¡œê·????°ì´?°ê? ?½ê°„ ?¤ë˜??ê²½ìš° ?€ë¹?
    unawaited(ShippingSettingsService().get());

    final returnFee = settings.returnShippingFee;
    final totalPrice = (_orderData?['total_price'] as num?)?.toInt() ?? 0;
    // ?„ì„œ?°ê°„ ì°¨ê°?? orders.remote_area_fee ì»¬ëŸ¼?€ ê²°ì œ ???´ë? ?•ë³µ(?¸ë„Ã—2)?¼ë¡œ
    // ?€?¥ëœ ê°’ì´ë¯€ë¡?ë³„ë„ Ã—2 ?†ì´ ê·¸ë?ë¡??”í•œ??
    // (?€???„ì¹˜: web/lib/order-pricing.ts, edge/orders-quote/index.ts ?ì„œ Ã—2 ì²˜ë¦¬)
    final remoteAreaFee = (_orderData?['remote_area_fee'] as num?)?.toInt() ?? 0;
    final totalDeduction = returnFee + (remoteAreaFee > 0 ? remoteAreaFee : 0);
    final refundAmount = (totalPrice - totalDeduction).clamp(0, totalPrice);
    final paymentStatus = _orderData?['payment_status'] as String?;
    final isPaid = paymentStatus == 'PAID' ||
        paymentStatus == 'COMPLETED' ||
        paymentStatus == 'DONE';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          'ì£¼ë¬¸ ì·¨ì†Œ / ë°˜ì†¡',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '?˜ë¥˜ê°€ ?´ë? ?…ê³ ???íƒœ?…ë‹ˆ?? ì·¨ì†Œë¥?ì§„í–‰?˜ë©´ ?˜ë¥˜??ë°˜ì†¡?˜ê³  ?¼ë? ê¸ˆì•¡ë§??˜ë¶ˆ?©ë‹ˆ??',
              style: TextStyle(height: 1.5),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  if (isPaid) ...[
                    _buildCancelInfoRow(
                      'ê²°ì œ ê¸ˆì•¡',
                      '${_formatPrice(totalPrice)}??,
                    ),
                    const SizedBox(height: 6),
                  ],
                  _buildCancelInfoRow(
                    '?•ë³µ ë°°ì†¡ë¹?ì°¨ê°',
                    '- ${_formatPrice(returnFee)}??,
                    valueColor: Colors.red.shade600,
                  ),
                  if (remoteAreaFee > 0) ...[
                    const SizedBox(height: 6),
                    _buildCancelInfoRow(
                      '? ?„ì„œ?°ê°„ ë°°ì†¡ë¹?ì°¨ê° (?•ë³µ)',
                      '- ${_formatPrice(remoteAreaFee)}??,
                      valueColor: Colors.orange.shade700,
                    ),
                  ],
                  if (isPaid) ...[
                    const Divider(height: 16),
                    _buildCancelInfoRow(
                      '?˜ë¶ˆ ê¸ˆì•¡',
                      '${_formatPrice(refundAmount)}??,
                      isHighlight: true,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '?˜ë¥˜???±ë¡?˜ì‹  ë°°ì†¡ ì£¼ì†Œë¡?ë°˜ì†¡?©ë‹ˆ??',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
                height: 1.4,
              ),
            ),
            if (remoteAreaFee > 0) ...[
              const SizedBox(height: 4),
              Text(
                '?„ì„œ?°ê°„ ë°°ì†¡ë¹„ëŠ” ?¸ë„ ?¨ê? Ã— 2 (?•ë³µ) ê¸°ì??…ë‹ˆ??',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.orange.shade700,
                  height: 1.4,
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              '?«ê¸°',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('ì·¨ì†Œ?˜ê³  ë°˜ì†¡'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await _handlePostPickupCancel(context);
    }
  }

  Widget _buildCancelInfoRow(
    String label,
    String value, {
    Color? valueColor,
    bool isHighlight = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isHighlight ? 14 : 13,
            color: isHighlight ? Colors.black87 : Colors.grey.shade700,
            fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isHighlight ? 15 : 13,
            color: valueColor ??
                (isHighlight ? const Color(0xFF00C896) : Colors.black87),
            fontWeight: isHighlight ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ],
    );
  }

  /// ?…ê³  ??ì·¨ì†Œ ì²˜ë¦¬ (orders-cancel Edge Function ?¸ì¶œ).
  Future<void> _handlePostPickupCancel(BuildContext context) async {
    try {
      if (!mounted) return;
      setState(() => _isCancelling = true);

      final result = await _orderService.cancelOrder(
        widget.orderId,
        reason: 'ê³ ê° ?”ì²­ - ?…ê³  ??ì·¨ì†Œ',
      );

      if (!mounted) return;

      final message = result['message'] as String? ?? 'ì·¨ì†Œê°€ ì²˜ë¦¬?˜ì—ˆ?µë‹ˆ??;
      final refundProcessed = result['refundProcessed'] == true;
      final refundError = result['refundError'] as String?;

      Color messageColor = Colors.green;
      if (refundError != null && refundError.isNotEmpty && !refundProcessed) {
        messageColor = Colors.orange;
      }

      try {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: messageColor,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 6),
            action: SnackBarAction(
              label: '?•ì¸',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      } catch (snackError) {
        debugPrint('? ï¸ ScaffoldMessenger ?‘ê·¼ ?¤íŒ¨: $snackError');
      }

      // ì·¨ì†Œ ?±ê³µ ???íƒœ ì¦‰ì‹œ ?…ë°?´íŠ¸ (?œë²„ ?ˆë¡œê³ ì¹¨ ??ë¹ ë¥¸ ë°˜ì˜)
      if (mounted) {
        setState(() {
          if (refundProcessed || refundError == null) {
            _currentStatus = 'RETURN_PENDING';
          }
          _isCancelling = false;
        });
      }

      try {
        await _loadOrderData(showLoading: false);
      } catch (e) {
        debugPrint('? ï¸ ì£¼ë¬¸ ?°ì´???ˆë¡œê³ ì¹¨ ?¤íŒ¨: $e');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCancelling = false);
      }
      if (!mounted) return;

      try {
        final errorMessage = e.toString().replaceAll('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ì£¼ë¬¸ ì·¨ì†Œ ?¤íŒ¨: $errorMessage'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: '?•ì¸',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      } catch (snackError) {
        debugPrint('? ï¸ ScaffoldMessenger ?‘ê·¼ ?¤íŒ¨ (?ëŸ¬ ?œì‹œ ì¤?: $snackError');
      }
    }
  }

  /// ì£¼ë¬¸ ì·¨ì†Œ ì²˜ë¦¬ (?¤ì´?¼ë¡œê·??†ì´ ë²„íŠ¼ ?íƒœë¡??œì‹œ)
  Future<void> _handleCancelOrder(BuildContext context) async {
    try {
      // ì·¨ì†Œ ì¤??íƒœ ?œì‹œ
      if (!mounted) return;
      setState(() {
        _isCancelling = true;
      });

      // ?¤ì œ API ?¸ì¶œ?˜ì—¬ ?˜ê±° ì·¨ì†Œ
      final result = await _orderService.cancelShipment(widget.orderId);

      if (!mounted) return;

      // ?±ê³µ ë©”ì‹œì§€
      final message = result['message'] as String? ?? '?˜ê±° ?ˆì•½??ì·¨ì†Œ?˜ì—ˆ?µë‹ˆ??;
      final epostResult = result['epost_result'] as Map<String, dynamic>?;
      final canceledYn = epostResult?['canceledYn'] as String?;
      final cancelDate = epostResult?['cancelDate'] as String?;

      String detailMessage = message;
      Color messageColor = Colors.orange;

      if (canceledYn == 'Y') {
        detailMessage += '\n???°ì²´êµ??„ì‚°?ë„ ì·¨ì†Œ?˜ì—ˆ?µë‹ˆ??';
        if (cancelDate != null && cancelDate.isNotEmpty) {
          // cancelDate ?•ì‹: YYYYMMDDHHmmss -> YYYY.MM.DD HH:mm ?•ì‹?¼ë¡œ ë³€??
          try {
            final year = cancelDate.substring(0, 4);
            final month = cancelDate.substring(4, 6);
            final day = cancelDate.substring(6, 8);
            final hour = cancelDate.substring(8, 10);
            final minute = cancelDate.substring(10, 12);
            detailMessage += '\nì·¨ì†Œ ?¼ì‹œ: $year.$month.$day $hour:$minute';
          } catch (e) {
            detailMessage += '\nì·¨ì†Œ ?¼ì‹œ: $cancelDate';
          }
        }
        messageColor = Colors.green;
      } else if (canceledYn == 'N') {
        final notCancelReason = epostResult?['notCancelReason'] as String?;
        detailMessage += '\n? ï¸ ?°ì²´êµ??„ì‚° ì·¨ì†Œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.';
        if (notCancelReason != null && notCancelReason.isNotEmpty) {
          detailMessage += '\n?¬ìœ : $notCancelReason';
        }
        messageColor = Colors.orange;
      } else if (canceledYn == 'D') {
        detailMessage += '\n?—‘ï¸??°ì²´êµ??„ì‚°?ì„œ ?? œ?˜ì—ˆ?µë‹ˆ??';
        if (cancelDate != null && cancelDate.isNotEmpty) {
          try {
            final year = cancelDate.substring(0, 4);
            final month = cancelDate.substring(4, 6);
            final day = cancelDate.substring(6, 8);
            final hour = cancelDate.substring(8, 10);
            final minute = cancelDate.substring(10, 12);
            detailMessage += '\nì·¨ì†Œ ?¼ì‹œ: $year.$month.$day $hour:$minute';
          } catch (e) {
            detailMessage += '\nì·¨ì†Œ ?¼ì‹œ: $cancelDate';
          }
        }
        messageColor = Colors.blue;
      }

      // ?±ê³µ ë©”ì‹œì§€ ?œì‹œ (?ˆì „?˜ê²Œ)
      if (mounted) {
        try {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(detailMessage),
              backgroundColor: messageColor,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: '?•ì¸',
                textColor: Colors.white,
                onPressed: () {},
              ),
            ),
          );
        } catch (snackError) {
          debugPrint('? ï¸ ScaffoldMessenger ?‘ê·¼ ?¤íŒ¨ (?´ë? dispose??: $snackError');
        }
      }

      // ?°ì²´êµ?API ì·¨ì†Œ ?‘ë‹µ ?•ë³´ ?€??ë°??íƒœ ?…ë°?´íŠ¸
      if (mounted) {
        setState(() {
          _cancelInfo = {
            'canceledYn': canceledYn,
            'cancelDate': cancelDate,
            'notCancelReason': epostResult?['notCancelReason'],
            'cancelRegiNo': epostResult?['cancelRegiNo'],
          };

          // ?°ì²´êµ?API ?‘ë‹µ???ˆì„ ?Œë§Œ ì·¨ì†Œ ?íƒœë¡??œì‹œ
          if (canceledYn != null && canceledYn != '') {
            _currentStatus = 'CANCELLED';
          } else {
            _currentStatus = 'CANCELLED';
          }

          _isCancelling = false; // ì·¨ì†Œ ?„ë£Œ
        });
      }

      // ì£¼ë¬¸ ?°ì´???ˆë¡œê³ ì¹¨ (ë¡œë”© ?œì‹œ ?†ì´)
      if (mounted) {
        try {
          await _loadOrderData(showLoading: false);
        } catch (e) {
          debugPrint('? ï¸ ì£¼ë¬¸ ?°ì´???ˆë¡œê³ ì¹¨ ?¤íŒ¨: $e');
        }
      }
    } catch (e) {
      // ?ëŸ¬ ë°œìƒ ??ì·¨ì†Œ ì¤??íƒœ ?´ì œ
      if (mounted) {
        setState(() {
          _isCancelling = false;
        });
      }

      if (!mounted) return;

      // ?ëŸ¬ ë©”ì‹œì§€ ?œì‹œ
      if (mounted) {
        try {
          final errorMessage = e
              .toString()
              .replaceAll('Exception: ', '')
              .replaceAll('?°ì²´êµ??„ì‚° ì·¨ì†Œ ?¤íŒ¨: ', '');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('?˜ê±° ì·¨ì†Œ ?¤íŒ¨: $errorMessage'),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: '?•ì¸',
                textColor: Colors.white,
                onPressed: () {},
              ),
            ),
          );
        } catch (snackError) {
          debugPrint('? ï¸ ScaffoldMessenger ?‘ê·¼ ?¤íŒ¨ (?ëŸ¬ ?œì‹œ ì¤?: $snackError');
        }
      }
    }
  }
}

/// ë¹„ë””???Œë ˆ?´ì–´ ?¤ì´?¼ë¡œê·?(ë¦¬ì†Œ??ê´€ë¦¬ë? ?„í•œ StatefulWidget)
class _VideoPlayerDialog extends StatefulWidget {
  final String title;
  final String videoUrl;

  const _VideoPlayerDialog({
    required this.title,
    required this.videoUrl,
  });

  @override
  State<_VideoPlayerDialog> createState() => _VideoPlayerDialogState();
}

class _VideoPlayerDialogState extends State<_VideoPlayerDialog> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeController();
  }

  Future<void> _initializeController() async {
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    try {
      await _controller.initialize();
      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
        _controller.play(); // ?ë™ ?¬ìƒ
      }
    } catch (e) {
      debugPrint('??ë¹„ë””??ì´ˆê¸°???¤íŒ¨: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose(); // ë¦¬ì†Œ???´ì œ
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppBar(
            title: Text(widget.title),
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            leading: IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          AspectRatio(
            aspectRatio: 16 / 9,
            child: _hasError
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, color: Colors.red, size: 48),
                        SizedBox(height: 8),
                        Text(
                          '?ìƒ??ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤',
                          style: TextStyle(color: Colors.white),
                        ),
                      ],
                    ),
                  )
                : _isInitialized
                    ? Stack(
                        alignment: Alignment.center,
                        children: [
                          VideoPlayer(_controller),
                          // ?¬ìƒ/?¼ì‹œ?•ì? ë²„íŠ¼
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                if (_controller.value.isPlaying) {
                                  _controller.pause();
                                } else {
                                  _controller.play();
                                }
                              });
                            },
                            child: Container(
                              color: Colors.transparent,
                              child: Center(
                                child: AnimatedOpacity(
                                  opacity: _controller.value.isPlaying ? 0 : 1,
                                  duration: const Duration(milliseconds: 300),
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.black54,
                                      borderRadius: BorderRadius.circular(50),
                                    ),
                                    child: Icon(
                                      _controller.value.isPlaying
                                          ? Icons.pause
                                          : Icons.play_arrow,
                                      color: Colors.white,
                                      size: 48,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    : const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
          ),
          // ?¬ìƒ ì»¨íŠ¸ë¡?ë°?
          if (_isInitialized)
            Container(
              color: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: VideoProgressIndicator(
                _controller,
                allowScrubbing: true,
                colors: const VideoProgressColors(
                  playedColor: Colors.blue,
                  bufferedColor: Colors.grey,
                  backgroundColor: Colors.white24,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
