import 'package:flutter/material.dart';

/// 추가 작업 요청 다이얼로그 (미사용 - 관리자 앱용)
/// 
/// 이 다이얼로그는 관리자 웹 앱에서 사용됩니다.
/// 모바일 앱에서는 사용되지 않습니다.
class RequestExtraWorkDialog extends StatelessWidget {
  final String orderId;
  final VoidCallback? onSuccess;

  const RequestExtraWorkDialog({
    Key? key,
    required this.orderId,
    this.onSuccess,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('추가 작업 요청'),
      content: const Text('이 기능은 관리자 웹 앱에서 사용 가능합니다.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('닫기'),
        ),
      ],
    );
  }
}
