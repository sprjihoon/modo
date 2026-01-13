import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// 네트워크 상태 모니터링 서비스
/// 
/// 기능:
/// - ✅ 실시간 네트워크 상태 감지
/// - ✅ WiFi/Mobile/Offline 구분
/// - ✅ 네트워크 변경 이벤트 스트림
/// - ✅ 네트워크 품질 평가
class NetworkMonitorService {
  static final NetworkMonitorService _instance = NetworkMonitorService._internal();
  factory NetworkMonitorService() => _instance;
  NetworkMonitorService._internal();

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _subscription;
  
  /// 현재 네트워크 상태
  NetworkStatus _currentStatus = NetworkStatus.unknown;
  NetworkStatus get currentStatus => _currentStatus;

  /// 네트워크 상태 변경 스트림
  final _statusController = StreamController<NetworkStatus>.broadcast();
  Stream<NetworkStatus> get statusStream => _statusController.stream;

  /// 서비스 초기화
  Future<void> initialize() async {
    // 현재 상태 확인
    final result = await _connectivity.checkConnectivity();
    _currentStatus = _parseConnectivityResult([result]);
    
    // 변경 감지 시작
    _subscription = _connectivity.onConnectivityChanged.listen((result) {
      final newStatus = _parseConnectivityResult([result]);
      if (newStatus != _currentStatus) {
        _currentStatus = newStatus;
        _statusController.add(newStatus);
        
        if (kDebugMode) {
          print('📡 Network status changed: ${newStatus.label}');
        }
      }
    });
  }

  /// 서비스 종료
  void dispose() {
    _subscription?.cancel();
    _statusController.close();
  }

  /// ConnectivityResult를 NetworkStatus로 변환
  NetworkStatus _parseConnectivityResult(List<ConnectivityResult> results) {
    if (results.isEmpty) return NetworkStatus.offline;
    
    final result = results.first;
    
    switch (result) {
      case ConnectivityResult.wifi:
        return NetworkStatus.wifi;
      case ConnectivityResult.mobile:
        return NetworkStatus.mobile;
      case ConnectivityResult.ethernet:
        return NetworkStatus.wifi; // Ethernet은 WiFi와 동일하게 처리
      case ConnectivityResult.vpn:
        return NetworkStatus.wifi; // VPN도 WiFi와 동일하게 처리
      case ConnectivityResult.none:
        return NetworkStatus.offline;
      default:
        return NetworkStatus.unknown;
    }
  }

  /// 네트워크 연결 여부 확인
  bool get isConnected => _currentStatus != NetworkStatus.offline;

  /// WiFi 연결 여부 확인
  bool get isWiFi => _currentStatus == NetworkStatus.wifi;

  /// 모바일 데이터 연결 여부 확인
  bool get isMobile => _currentStatus == NetworkStatus.mobile;

  /// 오프라인 여부 확인
  bool get isOffline => _currentStatus == NetworkStatus.offline;

  /// 네트워크 품질 평가
  NetworkQuality get quality {
    switch (_currentStatus) {
      case NetworkStatus.wifi:
        return NetworkQuality.excellent;
      case NetworkStatus.mobile:
        return NetworkQuality.good;
      case NetworkStatus.offline:
        return NetworkQuality.poor;
      default:
        return NetworkQuality.unknown;
    }
  }
}

/// 네트워크 상태 열거형
enum NetworkStatus {
  wifi,
  mobile,
  offline,
  unknown,
}

/// 네트워크 상태 확장 메서드
extension NetworkStatusExtension on NetworkStatus {
  String get label {
    switch (this) {
      case NetworkStatus.wifi:
        return 'WiFi';
      case NetworkStatus.mobile:
        return 'Mobile Data';
      case NetworkStatus.offline:
        return 'Offline';
      case NetworkStatus.unknown:
        return 'Unknown';
    }
  }

  String get emoji {
    switch (this) {
      case NetworkStatus.wifi:
        return '📶';
      case NetworkStatus.mobile:
        return '📱';
      case NetworkStatus.offline:
        return '❌';
      case NetworkStatus.unknown:
        return '❓';
    }
  }

  bool get isConnected => this != NetworkStatus.offline;
}

/// 네트워크 품질 열거형
enum NetworkQuality {
  excellent,  // WiFi
  good,       // Mobile with good signal
  fair,       // Mobile with weak signal
  poor,       // Offline or very weak
  unknown,
}

/// 네트워크 품질 확장 메서드
extension NetworkQualityExtension on NetworkQuality {
  String get label {
    switch (this) {
      case NetworkQuality.excellent:
        return '최고';
      case NetworkQuality.good:
        return '좋음';
      case NetworkQuality.fair:
        return '보통';
      case NetworkQuality.poor:
        return '나쁨';
      case NetworkQuality.unknown:
        return '알 수 없음';
    }
  }

  String get emoji {
    switch (this) {
      case NetworkQuality.excellent:
        return '🟢';
      case NetworkQuality.good:
        return '🟡';
      case NetworkQuality.fair:
        return '🟠';
      case NetworkQuality.poor:
        return '🔴';
      case NetworkQuality.unknown:
        return '⚪';
    }
  }
}

