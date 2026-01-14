import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// 카테고리 아이콘 위젯
/// 
/// DB에 저장된 icon_name을 기반으로 SVG 아이콘을 렌더링합니다.
/// - URL인 경우: 네트워크에서 SVG 로드
/// - 파일명인 경우: 로컬 assets에서 SVG 로드
/// - SVG가 없거나 로드에 실패하면 기본 Material 아이콘을 표시합니다.
class CategoryIconWidget extends StatelessWidget {
  final String? iconName;
  final double size;
  final Color? color;
  
  const CategoryIconWidget({
    super.key,
    this.iconName,
    this.size = 32,
    this.color,
  });
  
  /// icon_name이 URL인지 확인
  bool get _isUrl => iconName != null && iconName!.startsWith('http');
  
  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Colors.grey.shade600;
    
    // icon_name이 없으면 기본 아이콘
    if (iconName == null || iconName!.isEmpty) {
      return Icon(
        Icons.checkroom,
        size: size,
        color: effectiveColor,
      );
    }
    
    // 카테고리명 → 기본 아이콘 매핑 (SVG 파일이 없을 때 fallback)
    final fallbackIcon = _getFallbackIcon(iconName!);
    
    // URL인 경우 네트워크에서 로드
    if (_isUrl) {
      return SvgPicture.network(
        iconName!,
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(effectiveColor, BlendMode.srcIn),
        placeholderBuilder: (context) => SizedBox(
          width: size,
          height: size,
          child: Center(
            child: SizedBox(
              width: size * 0.5,
              height: size * 0.5,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(effectiveColor.withOpacity(0.5)),
              ),
            ),
          ),
        ),
      );
    }
    
    // 로컬 파일인 경우 assets에서 로드
    final svgPath = 'assets/icons/${iconName!.toLowerCase()}.svg';
    
    return SvgPicture.asset(
      svgPath,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(effectiveColor, BlendMode.srcIn),
      placeholderBuilder: (context) => Icon(
        fallbackIcon,
        size: size,
        color: effectiveColor,
      ),
      // SVG 로드 실패 시 기본 아이콘
    );
  }
  
  /// icon_name에 따른 fallback Material 아이콘 반환
  IconData _getFallbackIcon(String iconName) {
    final name = iconName.toLowerCase();
    
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
    } else if (name.contains('outer') || name.contains('아우터') || name.contains('jacket') || name.contains('자켓') || name.contains('coat') || name.contains('코트')) {
      return Icons.dry_cleaning;
    } else if (name.contains('suit') || name.contains('정장')) {
      return Icons.business;
    } else if (name.contains('sweater') || name.contains('니트') || name.contains('스웨터')) {
      return Icons.fiber_manual_record_outlined;
    } else if (name.contains('jeans') || name.contains('청바지') || name.contains('데님')) {
      return Icons.accessibility_new;
    } else if (name.contains('leather') || name.contains('가죽')) {
      return Icons.inventory_2;
    } else {
      return Icons.checkroom;
    }
  }
}

/// 네트워크에서 SVG 로드하는 버전 (Supabase Storage 등)
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
    
    return SvgPicture.network(
      iconUrl!,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(effectiveColor, BlendMode.srcIn),
      placeholderBuilder: (context) => SizedBox(
        width: size,
        height: size,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation(effectiveColor.withOpacity(0.5)),
        ),
      ),
      // 로드 실패 시 로컬 아이콘으로 fallback
    );
  }
}

