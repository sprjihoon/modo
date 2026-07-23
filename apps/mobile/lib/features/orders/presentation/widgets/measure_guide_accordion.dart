import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../../core/measure_guide.dart';

/// 웹 MeasureGuideAccordion과 동일한 치수 재는 방법 아코디언.
class MeasureGuideAccordion extends StatefulWidget {
  final String? initialTypeId;
  final bool defaultOpen;

  const MeasureGuideAccordion({
    this.initialTypeId,
    this.defaultOpen = true,
    super.key,
  });

  @override
  State<MeasureGuideAccordion> createState() => _MeasureGuideAccordionState();
}

class _MeasureGuideAccordionState extends State<MeasureGuideAccordion> {
  static const _brandColor = Color(0xFF00C896);

  late bool _open;
  WebViewController? _controller;
  bool _loading = true;
  String? _error;

  /// widget 테스트에서 WebView 플랫폼 미구현 오류를 피한다.
  bool get _skipWebView {
    final name = WidgetsBinding.instance.runtimeType.toString();
    return name.contains('TestWidgetsFlutterBinding') ||
        name.contains('AutomatedTest');
  }

  @override
  void initState() {
    super.initState();
    _open = widget.defaultOpen;
    if (_open && !_skipWebView) {
      _initWebView();
    } else if (_open) {
      _loading = false;
    }
  }

  @override
  void didUpdateWidget(covariant MeasureGuideAccordion oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTypeId != widget.initialTypeId && _controller != null) {
      _controller!.loadRequest(Uri.parse(measureGuideEmbedUrl(widget.initialTypeId)));
      setState(() {
        _loading = true;
        _error = null;
      });
    }
  }

  void _initWebView() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (err) {
            if (mounted) {
              setState(() {
                _loading = false;
                _error = '가이드를 불러오지 못했습니다';
              });
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(measureGuideEmbedUrl(widget.initialTypeId)));
    _controller = controller;
  }

  void _toggle() {
    setState(() {
      _open = !_open;
      if (_open && _controller == null && !_skipWebView) {
        _loading = true;
        _error = null;
        _initWebView();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final guideHeight = (MediaQuery.sizeOf(context).height * 0.55).clamp(280.0, 480.0);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: _toggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '치수 재는 방법',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                        if (!_open)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              '눌러서 가이드 보기',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      color: _brandColor,
                      size: 22,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_open) ...[
            Divider(height: 1, color: Colors.grey.shade100),
            SizedBox(
              height: guideHeight,
              child: _skipWebView
                  ? const Center(
                      child: Text(
                        '가이드 미리보기',
                        style: TextStyle(fontSize: 13, color: Colors.grey),
                      ),
                    )
                  : Stack(
                      children: [
                        if (_controller != null)
                          WebViewWidget(controller: _controller!),
                        if (_loading)
                          const Center(
                            child: SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: _brandColor,
                              ),
                            ),
                          ),
                        if (_error != null)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ],
      ),
    );
  }
}
