import 'package:flutter/material.dart';
import 'company_footer.dart';

/// 푸터가 포함된 Scaffold 래퍼
class ScaffoldWithFooter extends StatelessWidget {
  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final Color? backgroundColor;
  final bool resizeToAvoidBottomInset;

  const ScaffoldWithFooter({
    required this.body, super.key,
    this.appBar,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.backgroundColor,
    this.resizeToAvoidBottomInset = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: appBar,
      backgroundColor: backgroundColor ?? Colors.white,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(child: body),
            if (floatingActionButton != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: Center(child: floatingActionButton),
              ),
            const CompanyFooter(),
          ],
        ),
      ),
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}

