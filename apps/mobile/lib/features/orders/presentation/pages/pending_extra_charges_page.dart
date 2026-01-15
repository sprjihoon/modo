import 'package:flutter/material.dart';

/// 관리자 승인 대기 화면 (미사용 - 관리자 앱용)
/// 
/// 이 페이지는 관리자 웹 앱에서 사용됩니다.
/// 모바일 앱에서는 라우팅되지 않습니다.
class PendingExtraChargesPage extends StatelessWidget {
  const PendingExtraChargesPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('추가 작업 승인 대기'),
      ),
      body: const Center(
        child: Text('이 기능은 관리자 웹 앱에서 사용 가능합니다.'),
      ),
    );
  }
}
