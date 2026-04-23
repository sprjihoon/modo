import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

/// 앱 전반에서 일관된 헤더를 제공하는 공용 AppBar.
///
/// - 좌측: 뒤로가기 버튼 (이전 화면이 없으면 홈으로 이동)
/// - 우측: 홈 버튼 (현재 위치가 홈이 아닐 때만 표시)
/// - 추가 actions, bottom 등 기존 [AppBar] 의 주요 옵션을 그대로 지원
class ModoAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget? title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool automaticallyImplyLeading;
  final bool centerTitle;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double elevation;
  final double? toolbarHeight;
  final PreferredSizeWidget? bottom;
  final bool showBack;
  final bool showHome;
  final VoidCallback? onBack;
  final VoidCallback? onHome;
  final SystemUiOverlayStyle? systemOverlayStyle;

  const ModoAppBar({
    super.key,
    this.title,
    this.actions,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.centerTitle = true,
    this.backgroundColor = Colors.white,
    this.foregroundColor = Colors.black,
    this.elevation = 0,
    this.toolbarHeight,
    this.bottom,
    this.showBack = true,
    this.showHome = true,
    this.onBack,
    this.onHome,
    this.systemOverlayStyle,
  });

  static const String _homeRoute = '/home';

  bool _isOnHome(BuildContext context) {
    final loc = GoRouterState.of(context).uri.toString();
    return loc == _homeRoute || loc.startsWith('$_homeRoute?');
  }

  Future<void> _handleBack(BuildContext context) async {
    if (onBack != null) {
      onBack!();
      return;
    }
    if (context.canPop()) {
      context.pop();
      return;
    }
    final popped = await Navigator.of(context).maybePop();
    if (popped) return;
    if (!context.mounted) return;
    context.go(_homeRoute);
  }

  void _handleHome(BuildContext context) {
    if (onHome != null) {
      onHome!();
      return;
    }
    context.go(_homeRoute);
  }

  @override
  Widget build(BuildContext context) {
    final bool showBackButton = showBack && automaticallyImplyLeading;
    final bool showHomeButton = showHome && !_isOnHome(context);

    // 좌측 상단에 [뒤로가기, 홈] 버튼을 함께 배치하여 OS/테마와 무관하게 항상 노출
    final List<Widget> leadingButtons = [
      if (showBackButton)
        SizedBox(
          width: 44,
          child: IconButton(
            padding: EdgeInsets.zero,
            icon: Icon(Icons.arrow_back, color: foregroundColor, size: 24),
            tooltip: '뒤로',
            onPressed: () => _handleBack(context),
          ),
        ),
      if (showHomeButton)
        SizedBox(
          width: 44,
          child: IconButton(
            padding: EdgeInsets.zero,
            icon: Icon(Icons.home_rounded, color: foregroundColor, size: 26),
            tooltip: '홈으로',
            onPressed: () => _handleHome(context),
          ),
        ),
    ];

    final Widget? resolvedLeading = leading ??
        (leadingButtons.isEmpty
            ? null
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: leadingButtons,
              ));

    final double computedLeadingWidth = leading != null
        ? kToolbarHeight
        : (leadingButtons.length * 44.0 + 8);

    return AppBar(
      title: title,
      leading: resolvedLeading,
      leadingWidth: resolvedLeading == null ? null : computedLeadingWidth,
      automaticallyImplyLeading: false,
      centerTitle: centerTitle,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      elevation: elevation,
      toolbarHeight: toolbarHeight,
      bottom: bottom,
      systemOverlayStyle: systemOverlayStyle,
      iconTheme: IconThemeData(color: foregroundColor),
      actionsIconTheme: IconThemeData(color: foregroundColor),
      actions: actions,
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(
        (toolbarHeight ?? kToolbarHeight) +
            (bottom?.preferredSize.height ?? 0),
      );
}
