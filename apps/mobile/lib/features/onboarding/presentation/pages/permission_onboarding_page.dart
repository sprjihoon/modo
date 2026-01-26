import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';

/// 첫 실행 시 권한 요청 온보딩 페이지
class PermissionOnboardingPage extends StatefulWidget {
  const PermissionOnboardingPage({super.key});

  @override
  State<PermissionOnboardingPage> createState() => _PermissionOnboardingPageState();
}

class _PermissionOnboardingPageState extends State<PermissionOnboardingPage> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  
  // 권한 상태
  bool _cameraGranted = false;
  bool _photosGranted = false;
  bool _notificationGranted = false;
  
  final List<_PermissionItem> _permissions = [
    _PermissionItem(
      icon: Icons.camera_alt_rounded,
      title: '카메라 권한',
      description: '수선할 의류 사진을 촬영하기 위해\n카메라 접근 권한이 필요합니다.',
      color: Color(0xFF6C5CE7),
    ),
    _PermissionItem(
      icon: Icons.photo_library_rounded,
      title: '사진 접근 권한',
      description: '갤러리에서 의류 사진을 선택하기 위해\n사진 접근 권한이 필요합니다.',
      color: Color(0xFF00B894),
    ),
    _PermissionItem(
      icon: Icons.notifications_rounded,
      title: '알림 권한',
      description: '주문 상태 변경, 수선 완료 알림 등\n중요한 정보를 받기 위해 알림을 허용해주세요.',
      color: Color(0xFFFF7675),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _checkCurrentPermissions();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _checkCurrentPermissions() async {
    final camera = await Permission.camera.status;
    final notification = await Permission.notification.status;
    
    // Android 13+ (API 33+)에서는 READ_MEDIA_IMAGES 사용
    PermissionStatus photos;
    if (Platform.isAndroid) {
      final androidInfo = await DeviceInfoPlugin().androidInfo;
      if (androidInfo.version.sdkInt >= 33) {
        // Android 13+: Photo Picker가 자동으로 처리하므로 항상 granted로 처리
        photos = PermissionStatus.granted;
      } else {
        photos = await Permission.storage.status;
      }
    } else {
      photos = await Permission.photos.status;
    }
    
    setState(() {
      _cameraGranted = camera.isGranted;
      _photosGranted = photos.isGranted;
      _notificationGranted = notification.isGranted;
    });
  }

  Future<void> _requestPermission() async {
    PermissionStatus status;
    
    switch (_currentPage) {
      case 0: // 카메라
        status = await Permission.camera.request();
        setState(() => _cameraGranted = status.isGranted);
        break;
      case 1: // 사진
        if (Platform.isAndroid) {
          final androidInfo = await DeviceInfoPlugin().androidInfo;
          if (androidInfo.version.sdkInt >= 33) {
            // Android 13+: Photo Picker가 자동으로 권한 처리
            // 별도 권한 요청 없이 granted로 처리
            setState(() => _photosGranted = true);
          } else {
            // Android 12 이하: storage 권한 요청
            status = await Permission.storage.request();
            setState(() => _photosGranted = status.isGranted);
          }
        } else {
          // iOS
          status = await Permission.photos.request();
          setState(() => _photosGranted = status.isGranted);
        }
        break;
      case 2: // 알림
        status = await Permission.notification.request();
        setState(() => _notificationGranted = status.isGranted);
        break;
    }
    
    _nextPage();
  }

  void _nextPage() {
    if (_currentPage < _permissions.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  void _skipPermission() {
    _nextPage();
  }

  Future<void> _completeOnboarding() async {
    // 온보딩 완료 표시 저장
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('permission_onboarding_completed', true);
    
    if (mounted) {
      // 로그인 페이지로 이동
      context.go('/login');
    }
  }

  bool _isCurrentPermissionGranted() {
    switch (_currentPage) {
      case 0:
        return _cameraGranted;
      case 1:
        return _photosGranted;
      case 2:
        return _notificationGranted;
      default:
        return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // 상단 스킵 버튼
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: _completeOnboarding,
                child: Text(
                  '건너뛰기',
                  style: TextStyle(
                    color: Colors.grey[500],
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            
            // 페이지 인디케이터
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _permissions.length,
                (index) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == index ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _currentPage == index
                        ? _permissions[_currentPage].color
                        : Colors.grey[300],
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 40),
            
            // 페이지 뷰
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                itemCount: _permissions.length,
                itemBuilder: (context, index) {
                  final item = _permissions[index];
                  return _buildPermissionPage(item, index);
                },
              ),
            ),
            
            // 하단 버튼
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // 권한 허용 버튼
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isCurrentPermissionGranted()
                          ? _nextPage
                          : _requestPermission,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _permissions[_currentPage].color,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        _isCurrentPermissionGranted()
                            ? (_currentPage < _permissions.length - 1 ? '다음' : '시작하기')
                            : '허용하기',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // 나중에 하기 버튼
                  if (!_isCurrentPermissionGranted())
                    TextButton(
                      onPressed: _skipPermission,
                      child: Text(
                        '나중에 하기',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 14,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionPage(_PermissionItem item, int index) {
    final isGranted = _isCurrentPermissionGranted();
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 아이콘
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: item.color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              item.icon,
              size: 56,
              color: item.color,
            ),
          ),
          
          const SizedBox(height: 40),
          
          // 제목
          Text(
            item.title,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // 설명
          Text(
            item.description,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
              height: 1.5,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // 권한 상태 표시
          if (isGranted)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.check_circle, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    '권한이 허용되었습니다',
                    style: TextStyle(
                      color: Colors.green[700],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _PermissionItem {
  final IconData icon;
  final String title;
  final String description;
  final Color color;

  _PermissionItem({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
  });
}

