import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:http/http.dart' as http;

/// SVG 텍스트 캐시 (키 → 정규화된 SVG 문자열)
/// 앱 시작 시마다 초기화되므로 정규화 로직 변경 시 자동 반영됨.
final Map<String, String> _svgNormalizedCache = {};

/// 주어진 URL 목록의 SVG를 미리 fetch + normalize하여 캐시에 채움.
/// 홈 화면 로드 시 호출하면 수선 신청 화면 진입 시 아이콘이 즉시 표시됨.
Future<void> warmSvgCache(List<String> urls) async {
  final uncached = urls
      .where((u) => u.startsWith('http') && !_svgNormalizedCache.containsKey(u))
      .toSet()
      .toList();
  if (uncached.isEmpty) return;

  const batchSize = 5;
  for (var i = 0; i < uncached.length; i += batchSize) {
    final batch = uncached.sublist(
      i,
      (i + batchSize > uncached.length) ? uncached.length : i + batchSize,
    );
    await Future.wait(batch.map((url) async {
      try {
        final response = await http.get(Uri.parse(url));
        if (response.statusCode == 200) {
          _svgNormalizedCache[url] = _normalizeSvgColors(response.body);
          final inlinedKey = 'inlined:$url';
          if (!_svgNormalizedCache.containsKey(inlinedKey)) {
            _svgNormalizedCache[inlinedKey] = _inlineSvgStyles(response.body);
          }
        }
      } catch (_) {}
    }));
  }
}

/// CSS <style> 블록의 클래스 정의를 인라인 스타일로 변환.
/// flutter_svg는 CSS <style> 블록을 완전히 지원하지 않으므로
/// class="st0" → style="fill:#DD6564;" 형태로 인라인화해야 올바르게 렌더링됨.
String _inlineSvgStyles(String svg) {
  final styleMatch = RegExp(
    r'<style[^>]*>([\s\S]*?)</style>',
    caseSensitive: false,
  ).firstMatch(svg);
  if (styleMatch == null) return svg;

  final styleContent = styleMatch.group(1)!;
  final classRules = RegExp(r'\.([a-zA-Z_][\w-]*)\s*\{([^}]+)\}');
  final classStyles = <String, String>{};

  for (final match in classRules.allMatches(styleContent)) {
    classStyles[match.group(1)!] = match.group(2)!.trim();
  }

  for (final entry in classStyles.entries) {
    svg = svg.replaceAll('class="${entry.key}"', 'style="${entry.value}"');
  }

  svg = svg.replaceAll(
    RegExp(r'<style[^>]*>[\s\S]*?</style>', caseSensitive: false),
    '',
  );

  return svg;
}

/// 웹의 InlineSvg.normalizeSvg와 동일한 로직:
/// fill/stroke를 currentColor로 변환하되 "none" 값은 보존.
String _normalizeSvgColors(String svg) {
  svg = _inlineSvgStyles(svg);

  svg = svg.replaceAllMapped(
    RegExp(r'fill="(?!none)[^"]*"', caseSensitive: false),
    (_) => 'fill="currentColor"',
  );
  svg = svg.replaceAllMapped(
    RegExp(r'stroke="(?!none)[^"]*"', caseSensitive: false),
    (_) => 'stroke="currentColor"',
  );
  svg = svg.replaceAllMapped(
    RegExp(r'style="([^"]*)"', caseSensitive: false),
    (m) {
      var style = m.group(1)!;
      style = style.replaceAllMapped(
        RegExp(r'fill\s*:\s*(?!none\b)[^;"]*', caseSensitive: false),
        (_) => 'fill: currentColor',
      );
      style = style.replaceAllMapped(
        RegExp(r'stroke\s*:\s*(?!none\b)[^;"]*', caseSensitive: false),
        (_) => 'stroke: currentColor',
      );
      return 'style="$style"';
    },
  );
  return svg;
}

/// 네트워크 SVG를 정규화(fill/stroke→currentColor)하여 로드하는 로더.
/// SvgTheme(currentColor: color)와 함께 사용하면 웹과 동일한 렌더링 결과를 얻음.
class _NormalizedNetworkSvgLoader extends SvgLoader<String> {
  final String url;

  _NormalizedNetworkSvgLoader(this.url);

  @override
  Future<String> prepareMessage(BuildContext? context) async {
    if (_svgNormalizedCache.containsKey(url)) return _svgNormalizedCache[url]!;

    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    );
    if (response.statusCode == 200) {
      final normalized = _normalizeSvgColors(response.body);
      _svgNormalizedCache[url] = normalized;
      return normalized;
    }
    throw Exception('Failed to load SVG: ${response.statusCode}');
  }

  @override
  String provideSvg(String? message) => message ?? '';
}

/// 로컬 asset SVG를 정규화하여 로드하는 로더
class _NormalizedAssetSvgLoader extends SvgLoader<String> {
  final String assetPath;

  _NormalizedAssetSvgLoader(this.assetPath);

  @override
  Future<String> prepareMessage(BuildContext? context) async {
    if (_svgNormalizedCache.containsKey(assetPath)) return _svgNormalizedCache[assetPath]!;
    final raw = await rootBundle.loadString(assetPath);
    final normalized = _normalizeSvgColors(raw);
    _svgNormalizedCache[assetPath] = normalized;
    return normalized;
  }

  @override
  String provideSvg(String? message) => message ?? '';
}

/// 네트워크 SVG의 CSS <style> 블록만 인라인화 (색상 원본 유지).
/// flutter_svg가 CSS class를 지원하지 않으므로 인라인 변환은 필수이지만,
/// 빨간색 마킹 등 원본 색상을 보존해야 하는 경우 이 로더를 사용.
class _CssInlinedNetworkSvgLoader extends SvgLoader<String> {
  final String url;

  _CssInlinedNetworkSvgLoader(this.url);

  @override
  Future<String> prepareMessage(BuildContext? context) async {
    final cacheKey = 'inlined:$url';
    if (_svgNormalizedCache.containsKey(cacheKey)) return _svgNormalizedCache[cacheKey]!;

    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    );
    if (response.statusCode == 200) {
      final inlined = _inlineSvgStyles(response.body);
      _svgNormalizedCache[cacheKey] = inlined;
      return inlined;
    }
    throw Exception('Failed to load SVG: ${response.statusCode}');
  }

  @override
  String provideSvg(String? message) => message ?? '';
}

/// 캐시를 비활성화한 SVG 네트워크 로더 (원본 그대로)
class NoCacheSvgLoader extends SvgLoader<String> {
  final String url;

  NoCacheSvgLoader(this.url);

  @override
  Future<String> prepareMessage(BuildContext? context) async {
    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    );
    if (response.statusCode == 200) {
      return response.body;
    }
    throw Exception('Failed to load SVG: ${response.statusCode}');
  }

  @override
  String provideSvg(String? message) => message ?? '';
}

/// 카테고리 아이콘 위젯
///
/// DB에 저장된 icon_name을 기반으로 SVG 아이콘을 렌더링합니다.
/// - URL인 경우: 네트워크에서 SVG 로드 (캐시 비활성화)
/// - 파일명인 경우: 로컬 assets에서 SVG 로드
/// - SVG가 없거나 로드에 실패하면 기본 Material 아이콘을 표시합니다.
class CategoryIconWidget extends StatelessWidget {
  final String? iconName;
  final double size;
  final Color? color;
  final bool preserveColors;

  const CategoryIconWidget({
    super.key,
    this.iconName,
    this.size = 32,
    this.color,
    this.preserveColors = false,
  });

  /// icon_name이 URL인지 확인
  bool get _isUrl => iconName != null && iconName!.startsWith('http');

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Colors.grey.shade600;
    final svgTheme = SvgTheme(currentColor: effectiveColor);

    if (iconName == null || iconName!.isEmpty) {
      return Icon(
        Icons.checkroom,
        size: size,
        color: effectiveColor,
      );
    }

    final fallbackIcon = _getFallbackIcon(iconName!);

    if (_isUrl) {
      // preserveColors: CSS인라인만 수행, 원본 색상 유지 (빨간 마킹 등 보존)
      // !preserveColors: CSS인라인 + 전체 색상을 currentColor로 단색화
      final loader = preserveColors
          ? _CssInlinedNetworkSvgLoader(iconName!)
          : _NormalizedNetworkSvgLoader(iconName!);
      return SvgPicture(
        loader,
        width: size,
        height: size,
        theme: svgTheme,
        placeholderBuilder: (context) => SizedBox(
          width: size,
          height: size,
          child: Center(
            child: SizedBox(
              width: size * 0.5,
              height: size * 0.5,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor:
                    AlwaysStoppedAnimation(effectiveColor.withOpacity(0.5)),
              ),
            ),
          ),
        ),
      );
    }

    final svgPath = 'assets/icons/${iconName!.toLowerCase()}.svg';

    if (preserveColors) {
      return SvgPicture.asset(
        svgPath,
        width: size,
        height: size,
        theme: svgTheme,
        placeholderBuilder: (context) => Icon(
          fallbackIcon,
          size: size,
          color: effectiveColor,
        ),
      );
    }

    // 로컬 asset SVG도 정규화하여 웹과 동일한 렌더링
    return SvgPicture(
      _NormalizedAssetSvgLoader(svgPath),
      width: size,
      height: size,
      theme: svgTheme,
      placeholderBuilder: (context) => Icon(
        fallbackIcon,
        size: size,
        color: effectiveColor,
      ),
    );
  }

  /// icon_name에 따른 fallback Material 아이콘 반환
  IconData _getFallbackIcon(String iconName) {
    final name = iconName.toLowerCase();

    // 수선 타입별 기본 아이콘 매핑
    if (name.contains('sleeve') || name.contains('소매')) {
      return Icons.straighten;
    } else if (name.contains('arm') || name.contains('팔통')) {
      return Icons.swap_horiz;
    } else if (name.contains('shoulder') || name.contains('어깨')) {
      return Icons.accessibility;
    } else if (name.contains('body') || name.contains('품')) {
      return Icons.crop_free;
    } else if (name.contains('length') || name.contains('기장')) {
      return Icons.height;
    } else if (name.contains('waist') || name.contains('허리')) {
      return Icons.radio_button_unchecked;
    } else if (name.contains('zipper') || name.contains('지퍼')) {
      return Icons.linear_scale;
    } else if (name.contains('button') || name.contains('단추')) {
      return Icons.radio_button_checked;
    } else if (name.contains('pocket') || name.contains('주머니')) {
      return Icons.inventory_2_outlined;
    } else if (name.contains('hem') || name.contains('단')) {
      return Icons.horizontal_rule;
    } else if (name.contains('repair') || name.contains('수선')) {
      return Icons.build_outlined;
    }

    // 의류 카테고리별 기본 아이콘 매핑
    if (name.contains('tshirt') || name.contains('티셔츠')) {
      return Icons.checkroom;
    } else if (name.contains('shirt') || name.contains('셔츠')) {
      return Icons.dry_cleaning;
    } else if (name.contains('pants') || name.contains('바지')) {
      return Icons.accessibility_new;
    } else if (name.contains('skirt') || name.contains('치마')) {
      return Icons.woman;
    } else if (name.contains('dress') || name.contains('원피스')) {
      return Icons.woman_2;
    } else if (name.contains('outer') ||
        name.contains('아우터') ||
        name.contains('jacket') ||
        name.contains('자켓') ||
        name.contains('coat') ||
        name.contains('코트')) {
      return Icons.dry_cleaning;
    } else if (name.contains('suit') || name.contains('정장')) {
      return Icons.business;
    } else if (name.contains('sweater') ||
        name.contains('니트') ||
        name.contains('스웨터')) {
      return Icons.fiber_manual_record_outlined;
    } else if (name.contains('jeans') ||
        name.contains('청바지') ||
        name.contains('데님')) {
      return Icons.accessibility_new;
    } else if (name.contains('leather') || name.contains('가죽')) {
      return Icons.inventory_2;
    } else {
      return Icons.content_cut;
    }
  }
}

/// 네트워크에서 SVG 로드하는 버전 (Supabase Storage 등)
/// 캐시를 비활성화하여 항상 최신 아이콘을 로드합니다.
class NetworkCategoryIconWidget extends StatelessWidget {
  final String? iconUrl;
  final String? iconName;
  final double size;
  final Color? color;

  const NetworkCategoryIconWidget({
    super.key,
    this.iconUrl,
    this.iconName,
    this.size = 32,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Colors.grey.shade600;

    // URL이 없으면 로컬 아이콘 사용
    if (iconUrl == null || iconUrl!.isEmpty) {
      return CategoryIconWidget(
        iconName: iconName,
        size: size,
        color: effectiveColor,
      );
    }

    return SvgPicture(
      _NormalizedNetworkSvgLoader(iconUrl!),
      width: size,
      height: size,
      theme: SvgTheme(currentColor: effectiveColor),
      placeholderBuilder: (context) => SizedBox(
        width: size,
        height: size,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation(effectiveColor.withOpacity(0.5)),
        ),
      ),
    );
  }
}
