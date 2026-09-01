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
            Expanded(
              child: floatingActionButton == null
                  ? body
                  : Stack(
                      children: [
                        body,
                        Align(
                          alignment: Alignment.bottomCenter,
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                            child: floatingActionButton,
                          ),
                        ),
                      ],
                    ),
            ),
            const CompanyFooter(),
          ],
        ),
      ),
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}

