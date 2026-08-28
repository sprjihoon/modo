import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
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
  double? _contentHeight;

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
        _contentHeight = null;
      });
    }
  }

  void _onContentHeight(String raw) {
    final parsed = parseMeasureGuideHeightMessage(
      raw,
      current: _contentHeight,
    );
    if (parsed == null || parsed == _contentHeight) return;
    if (!mounted) return;
    setState(() => _contentHeight = parsed);
  }

  /// document.scrollHeight 는 WebView 뷰포트에 고정되어 짧은 탭으로
  /// 줄지 않는다. 가이드 본문 요소 높이를 재고, 탭 전환 시 다시 보낸다.
  static const _heightReporterJs = '''
(function(){
  function measure(){
    var root = document.getElementById('measure-guide-embed')
      || document.querySelector('[data-measure-guide-root]')
      || document.querySelector('.pb-10')
      || (document.body && document.body.firstElementChild);
    if (root) {
      var rectH = 0;
      try { rectH = root.getBoundingClientRect().height || 0; } catch (e) {}
      return Math.ceil(Math.max(root.scrollHeight || 0, rectH));
    }
    return 0;
  }
  function send(){
    var h = measure();
    if (h >= 80 && window.MeasureGuideHeight) MeasureGuideHeight.postMessage(String(h));
  }
  try {
    document.documentElement.style.height = 'auto';
    document.documentElement.style.minHeight = '0';
    document.documentElement.style.overflow = 'visible';
    if (document.body) {
      document.body.style.minHeight = '0';
      document.body.style.height = 'auto';
      document.body.style.overflow = 'visible';
    }
  } catch (e) {}
  send();
  var root = document.getElementById('measure-guide-embed')
    || document.querySelector('[data-measure-guide-root]')
    || document.querySelector('.pb-10')
    || document.body;
  if (window.ResizeObserver && root) {
    new ResizeObserver(send).observe(root);
  }
  window.addEventListener('measure-guide-layout', send);
  document.addEventListener('click', function(){
    setTimeout(send, 50);
    setTimeout(send, 320);
  }, true);
  document.querySelectorAll('img').forEach(function(img){
    img.addEventListener('load', send);
  });
  setTimeout(send, 120);
  setTimeout(send, 400);
  setTimeout(send, 1000);
})();
''';

  void _initWebView() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..addJavaScriptChannel(
        'MeasureGuideHeight',
        onMessageReceived: (message) => _onContentHeight(message.message),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) async {
            if (!mounted) return;
            setState(() => _loading = false);
            try {
              await _controller?.runJavaScript(_heightReporterJs);
            } catch (_) {}
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

  double _guideHeight(BuildContext context) {
    if (_contentHeight != null) {
      return _contentHeight!.clamp(200.0, 4000.0);
    }
    return (MediaQuery.sizeOf(context).height * 0.72).clamp(380.0, 720.0);
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
    final guideHeight = _guideHeight(context);
    final sizedToContent = _contentHeight != null;

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
                          WebViewWidget(
                            controller: _controller!,
                            // 높이를 콘텐츠에 맞춘 뒤에는 바깥 ListView가 스크롤한다.
                            // 아직이면 WebView가 제스처를 받아 가이드를 직접 스크롤한다.
                            gestureRecognizers: sizedToContent
                                ? const <Factory<OneSequenceGestureRecognizer>>{}
                                : {
                                    Factory<EagerGestureRecognizer>(
                                      EagerGestureRecognizer.new,
                                    ),
                                  },
                          ),
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
