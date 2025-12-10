import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// 푸시 알림 서비스
/// 
/// FCM(Firebase Cloud Messaging)을 사용하여 푸시 알림을 수신하고 처리합니다.
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final _supabase = Supabase.instance.client;
  final _fcm = FirebaseMessaging.instance;
  final _localNotifications = FlutterLocalNotificationsPlugin();

  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  /// 알림 초기화
  Future<void> initialize() async {
    try {
      debugPrint('🔔 알림 서비스 초기화 시작');

      // 1. 알림 권한 요청
      final settings = await _fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        debugPrint('✅ 알림 권한 승인됨');
      } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('⚠️ 임시 알림 권한 승인됨');
      } else {
        debugPrint('❌ 알림 권한 거부됨');
        return;
      }

      // 2. FCM 토큰 가져오기
      _fcmToken = await _fcm.getToken();
      debugPrint('📱 FCM 토큰: $_fcmToken');

      // 3. 로그인한 사용자라면 토큰 저장
      final user = _supabase.auth.currentUser;
      if (user != null && _fcmToken != null) {
        await _saveFcmToken(_fcmToken!);
      }

      // 4. 로컬 알림 초기화 (Android)
      await _initializeLocalNotifications();

      // 5. FCM 리스너 설정
      _setupFcmListeners();

      debugPrint('✅ 알림 서비스 초기화 완료');
    } catch (e) {
      debugPrint('❌ 알림 서비스 초기화 실패: $e');
    }
  }

  /// 로컬 알림 초기화 (Android/iOS)
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Android 알림 채널 생성
    const channel = AndroidNotificationChannel(
      'order_updates', // 채널 ID
      '주문 상태 알림', // 채널 이름
      description: '주문 상태 변경 시 알림을 받습니다',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  /// FCM 리스너 설정
  void _setupFcmListeners() {
    // 1. 포그라운드 메시지 수신
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('🔔 포그라운드 메시지 수신: ${message.notification?.title}');
      _showLocalNotification(message);
    });

    // 2. 백그라운드 메시지 탭 (앱 실행)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('🔔 백그라운드 메시지 탭: ${message.notification?.title}');
      _handleNotificationTap(message.data);
    });

    // 3. 종료 상태에서 알림 탭으로 앱 실행
    FirebaseMessaging.instance.getInitialMessage().then((message) {
      if (message != null) {
        debugPrint('🔔 종료 상태 메시지 탭: ${message.notification?.title}');
        _handleNotificationTap(message.data);
      }
    });

    // 4. 토큰 갱신 리스너
    _fcm.onTokenRefresh.listen((newToken) {
      debugPrint('🔄 FCM 토큰 갱신: $newToken');
      _fcmToken = newToken;
      _saveFcmToken(newToken);
    });
  }

  /// 로컬 알림 표시 (앱이 포그라운드일 때)
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    const androidDetails = AndroidNotificationDetails(
      'order_updates',
      '주문 상태 알림',
      channelDescription: '주문 상태 변경 시 알림을 받습니다',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      details,
      payload: message.data['order_id'],
    );
  }

  /// 알림 탭 핸들러
  void _onNotificationTapped(NotificationResponse response) {
    final orderId = response.payload;
    if (orderId != null && orderId.isNotEmpty) {
      debugPrint('🔔 알림 탭: orderId=$orderId');
      _handleNotificationTap({'order_id': orderId});
    }
  }

  /// 알림 탭 처리 (주문 상세 화면으로 이동)
  void _handleNotificationTap(Map<String, dynamic> data) {
    final orderId = data['order_id'] as String?;
    if (orderId != null) {
      debugPrint('📱 주문 상세로 이동: $orderId');
      // TODO: 라우팅 처리 (GoRouter 사용)
      // context.go('/orders/detail/$orderId');
    }
  }

  /// FCM 토큰을 Supabase에 저장
  Future<void> _saveFcmToken(String token) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        debugPrint('⚠️ 로그인하지 않아 FCM 토큰 저장 생략');
        return;
      }

      debugPrint('💾 FCM 토큰 저장 시작: $token');

      // public.users 테이블에서 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        debugPrint('❌ users 테이블에서 사용자를 찾을 수 없음');
        return;
      }

      final userId = userResponse['id'] as String;

      // fcm_token 업데이트
      await _supabase.from('users').update({
        'fcm_token': token,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', userId);

      debugPrint('✅ FCM 토큰 저장 완료');
    } catch (e) {
      debugPrint('❌ FCM 토큰 저장 실패: $e');
    }
  }

  /// 로그인 시 FCM 토큰 저장
  Future<void> onLogin() async {
    if (_fcmToken != null) {
      await _saveFcmToken(_fcmToken!);
    } else {
      // 토큰이 없으면 새로 가져오기
      final token = await _fcm.getToken();
      if (token != null) {
        _fcmToken = token;
        await _saveFcmToken(token);
      }
    }
  }

  /// 로그아웃 시 FCM 토큰 제거
  Future<void> onLogout() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      debugPrint('🗑️ FCM 토큰 제거 시작');

      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) return;

      final userId = userResponse['id'] as String;

      // fcm_token을 null로 설정
      await _supabase.from('users').update({
        'fcm_token': null,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', userId);

      debugPrint('✅ FCM 토큰 제거 완료');
    } catch (e) {
      debugPrint('❌ FCM 토큰 제거 실패: $e');
    }
  }

  /// 특정 주문에 대한 알림 구독 (선택사항)
  Future<void> subscribeToOrder(String orderId) async {
    try {
      await _fcm.subscribeToTopic('order_$orderId');
      debugPrint('✅ 주문 알림 구독: $orderId');
    } catch (e) {
      debugPrint('❌ 주문 알림 구독 실패: $e');
    }
  }

  /// 특정 주문 알림 구독 해제
  Future<void> unsubscribeFromOrder(String orderId) async {
    try {
      await _fcm.unsubscribeFromTopic('order_$orderId');
      debugPrint('✅ 주문 알림 구독 해제: $orderId');
    } catch (e) {
      debugPrint('❌ 주문 알림 구독 해제 실패: $e');
    }
  }
}

/// 백그라운드 메시지 핸들러 (최상위 함수여야 함)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('🔔 백그라운드 메시지 수신: ${message.notification?.title}');
  // 백그라운드에서 특별한 처리가 필요하면 여기서
}

