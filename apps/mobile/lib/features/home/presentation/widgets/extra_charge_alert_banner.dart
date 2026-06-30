import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

/// ???”ë©´???œì‹œ??ì¶”ê?ê²°ì œ ?Œë¦¼ ë°°ë„ˆ
/// 
/// PENDING_CUSTOMER ?íƒœ??ì£¼ë¬¸???ˆì„ ?????”ë©´ ìµœìƒ?¨ì— ?œì‹œ
class ExtraChargeAlertBanner extends StatelessWidget {
  final Map<String, dynamic> orderData;

  const ExtraChargeAlertBanner({
    Key? key,
    required this.orderData,
  }) : super(key: key);

  void _navigateToPayment(BuildContext context) {
    // extra_charge_data?ì„œ ê°€ê²??•ë³´ ì¶”ì¶œ
    final extraChargeData = orderData['extra_charge_data'] as Map<String, dynamic>?;
    final price = extraChargeData?['managerPrice'] as int? ?? 0;
    final orderId = orderData['id'] as String;
    final orderNumber = orderData['order_number'] as String? ?? 'ì£¼ë¬¸';
    final note = extraChargeData?['managerNote'] as String? ?? 'ì¶”ê? ?‘ì—…';
    
    // ? ìŠ¤?˜ì´ë¨¼ì¸  ê²°ì œ ?”ë©´?¼ë¡œ ?´ë™
    // ì£¼ì˜: payments-confirm-toss??ì¶”ê?ê²°ì œ ë¶„ê¸°?ì„œ original_order_idë¡?orders.idë¥?ë§¤ì¹­??
    //       ??originalOrderId ë°˜ë“œ???¨ê»˜ ?„ë‹¬?´ì•¼ ??(?†ìœ¼ë©??ˆê±°??extra_charge_requests ë¶„ê¸°ë¡?ë¹ ì ¸ ?¤íŒ¨)
    // ì£¼ì˜: orderId ?¨í„´?€ ?¹ê³¼ ?™ì¼?˜ê²Œ 'EXTRA_<uuid>_<ts>' (?€ë¬¸ì) - ??success URL ?Œì‹±ê³??µì¼
    context.push('/payment', extra: {
      'orderId': 'EXTRA_${orderId}_${DateTime.now().millisecondsSinceEpoch}',
      'amount': price,
      'orderName': '$orderNumber - $note',
      'isExtraCharge': true,
      'originalOrderId': orderId,
    });
  }

  @override
  Widget build(BuildContext context) {
    // extra_charge_data?ì„œ ê°€ê²??•ë³´ ì¶”ì¶œ
    final extraChargeData = orderData['extra_charge_data'] as Map<String, dynamic>?;
    final price = extraChargeData?['managerPrice'] as int? ?? 0;
    final orderId = orderData['id'] as String;
    final note = extraChargeData?['managerNote'] as String? ?? 'ì¶”ê? ?‘ì—…???„ìš”?©ë‹ˆ??;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.orange.shade400,
            Colors.deepOrange.shade500,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.orange.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // ?„ì´ì½?
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.payment,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  
                  // ?ìŠ¤???•ë³´
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '?’³ ì¶”ê? ê²°ì œ ?”ì²­',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          note,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white.withOpacity(0.95),
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ì¶”ê? ê¸ˆì•¡: ${NumberFormat('#,###').format(price)}??,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // ë²„íŠ¼??
              Row(
                children: [
                  // ì£¼ë¬¸ ?ì„¸ ë³´ê¸° ë²„íŠ¼
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.push('/orders/$orderId'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white, width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text(
                        '?ì„¸ë³´ê¸°',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // ê²°ì œ?˜ê¸° ë²„íŠ¼
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () => _navigateToPayment(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.deepOrange,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.credit_card, size: 18),
                          const SizedBox(width: 6),
                          Text(
                            '${NumberFormat('#,###').format(price)}??ê²°ì œ',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

