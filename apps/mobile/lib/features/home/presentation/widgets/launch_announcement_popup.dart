import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 웹 `LaunchAnnouncementPopup`과 동일 — `popups` 테이블 활성 팝업 1건 표시
class LaunchAnnouncementPopup {
  LaunchAnnouncementPopup._();

  static const _brand = Color(0xFF00C896);

  static String _storageKey(String id) => 'popup_hidden_until_$id';

  static int _endOfTodayMs() {
    final now = DateTime.now();
    final end = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
    return end.millisecondsSinceEpoch;
  }

  /// 홈 진입 후 한 번 호출. 표시할 팝업이 없으면 아무 것도 안 함.
  static Future<void> maybeShow(BuildContext context) async {
    if (!context.mounted) return;

    try {
      final data = await Supabase.instance.client
          .from('popups')
          .select(
            'id, subtitle, title, highlight_text, items, cta_text, dismiss_label, dismiss_hours',
          )
          .eq('is_active', true)
          .order('display_priority', ascending: false)
          .limit(1)
          .maybeSingle();

      if (data == null || !context.mounted) return;

      final id = data['id'] as String?;
      if (id == null) return;

      final prefs = await SharedPreferences.getInstance();
      final hiddenUntil = prefs.getInt(_storageKey(id));
      if (hiddenUntil != null &&
          DateTime.now().millisecondsSinceEpoch < hiddenUntil) {
        return;
      }

      if (!context.mounted) return;

      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        builder: (dialogContext) => _PopupDialog(
          data: data,
          brand: _brand,
          onDismiss: (hideToday) async {
            if (hideToday) {
              await prefs.setInt(_storageKey(id), _endOfTodayMs());
            }
            if (dialogContext.mounted) {
              Navigator.of(dialogContext).pop();
            }
          },
        ),
      );
    } catch (e) {
      debugPrint('홈 팝업 로드 실패(무시): $e');
    }
  }
}

class _PopupDialog extends StatefulWidget {
  const _PopupDialog({
    required this.data,
    required this.brand,
    required this.onDismiss,
  });

  final Map<String, dynamic> data;
  final Color brand;
  final Future<void> Function(bool hideToday) onDismiss;

  @override
  State<_PopupDialog> createState() => _PopupDialogState();
}

class _PopupDialogState extends State<_PopupDialog> {
  bool _hideToday = false;

  List<Map<String, dynamic>> get _items {
    final raw = widget.data['items'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Widget _buildTitle(String title, String? highlight) {
    const style = TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.bold,
      color: Color(0xFF111827),
      height: 1.3,
    );
    if (highlight == null ||
        highlight.isEmpty ||
        !title.contains(highlight)) {
      return Text(title, textAlign: TextAlign.center, style: style);
    }

    final parts = title.split(highlight);
    final spans = <TextSpan>[];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].isNotEmpty) {
        spans.add(TextSpan(text: parts[i]));
      }
      if (i < parts.length - 1) {
        spans.add(TextSpan(
          text: highlight,
          style: TextStyle(color: widget.brand),
        ));
      }
    }
    return Text.rich(
      TextSpan(style: style, children: spans),
      textAlign: TextAlign.center,
    );
  }

  @override
  Widget build(BuildContext context) {
    final subtitle = widget.data['subtitle'] as String?;
    final title = widget.data['title'] as String? ?? '';
    final highlight = widget.data['highlight_text'] as String?;
    final cta = widget.data['cta_text'] as String? ?? '확인';
    final dismissLabel =
        widget.data['dismiss_label'] as String? ?? '오늘 그만보기';
    final items = _items;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (subtitle != null && subtitle.isNotEmpty) ...[
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                      color: widget.brand,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                _buildTitle(title, highlight),
                if (items.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  ...items.map((item) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['title']?.toString() ?? '',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF111827),
                              ),
                            ),
                            if ((item['description']?.toString() ?? '')
                                .isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  item['description'].toString(),
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
                const SizedBox(height: 4),
                InkWell(
                  onTap: () => setState(() => _hideToday = !_hideToday),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: Checkbox(
                          value: _hideToday,
                          activeColor: widget.brand,
                          onChanged: (v) =>
                              setState(() => _hideToday = v ?? false),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        dismissLabel,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => widget.onDismiss(_hideToday),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: widget.brand,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      cta,
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
          Positioned(
            top: 8,
            right: 8,
            child: IconButton(
              visualDensity: VisualDensity.compact,
              icon: Icon(Icons.close, color: Colors.grey.shade400),
              onPressed: () => widget.onDismiss(_hideToday),
            ),
          ),
        ],
      ),
    );
  }
}
