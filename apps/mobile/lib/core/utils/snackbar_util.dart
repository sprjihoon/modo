import 'package:flutter/material.dart';

/// SnackBar 유틸리티 클래스
/// 메시지가 겹쳐서 표시되지 않도록 이전 SnackBar를 먼저 닫고 새로 표시
class SnackBarUtil {
  /// SnackBar를 표시합니다. 이전 SnackBar가 있으면 먼저 닫습니다.
  static void show(
    BuildContext context, {
    required String message,
    Color? backgroundColor,
    Duration duration = const Duration(seconds: 3),
    SnackBarAction? action,
    SnackBarBehavior? behavior,
  }) {
    // 이전 SnackBar가 있으면 먼저 닫기
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    
    // 새로운 SnackBar 표시
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
        duration: duration,
        action: action,
        behavior: behavior,
      ),
    );
  }

  /// 성공 메시지를 표시합니다.
  static void showSuccess(
    BuildContext context, {
    required String message,
    Duration duration = const Duration(seconds: 2),
  }) {
    show(
      context,
      message: message,
      backgroundColor: const Color(0xFF00C896),
      duration: duration,
    );
  }

  /// 에러 메시지를 표시합니다.
  static void showError(
    BuildContext context, {
    required String message,
    Duration duration = const Duration(seconds: 4),
  }) {
    show(
      context,
      message: message,
      backgroundColor: Colors.red.shade400,
      duration: duration,
    );
  }

  /// 경고 메시지를 표시합니다.
  static void showWarning(
    BuildContext context, {
    required String message,
    Duration duration = const Duration(seconds: 3),
  }) {
    show(
      context,
      message: message,
      backgroundColor: Colors.orange,
      duration: duration,
    );
  }
}

