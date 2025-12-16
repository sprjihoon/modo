import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/signup_page.dart';
import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/auth/presentation/pages/terms_page.dart';
import '../../features/auth/presentation/pages/privacy_policy_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/home/presentation/pages/content_view_page.dart';
import '../../features/orders/presentation/pages/order_list_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';
import '../../features/orders/presentation/pages/tracking_page.dart';
import '../../features/orders/presentation/pages/create_order_page.dart';
import '../../features/orders/presentation/pages/select_clothing_type_page.dart';
import '../../features/orders/presentation/pages/select_repair_type_page.dart';
import '../../features/orders/presentation/pages/select_repair_parts_page.dart';
import '../../features/orders/presentation/pages/repair_detail_input_page.dart';
import '../../features/orders/presentation/pages/repair_confirmation_page.dart';
import '../../features/orders/presentation/pages/pickup_request_page.dart';
import '../../features/orders/presentation/pages/payment_page.dart';
import '../../features/orders/presentation/pages/image_annotation_page.dart';
import '../../features/orders/presentation/pages/cart_page.dart';
import '../../features/orders/domain/models/image_pin.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/account_info_page.dart';
import '../../features/profile/presentation/pages/change_password_page.dart';
import '../../features/profile/presentation/pages/addresses_page.dart';
import '../../features/profile/presentation/pages/add_address_page.dart';
import '../../features/analytics/presentation/pages/worker_dashboard_page.dart';
import '../../features/profile/presentation/pages/payment_methods_page.dart';
import '../../features/profile/presentation/pages/add_payment_method_page.dart';
import '../../features/profile/presentation/pages/payment_history_page.dart';
import '../../features/profile/presentation/pages/receipt_page.dart';
import '../../features/profile/presentation/pages/points_history_page.dart';
import '../../features/profile/presentation/pages/invite_friends_page.dart';
import '../../features/profile/presentation/pages/notices_page.dart';
import '../../features/profile/presentation/pages/customer_service_page.dart';
import '../../features/profile/presentation/pages/app_settings_page.dart';
import '../../features/video/presentation/pages/comparison_video_player_page.dart';

/// GoRouter 프로바이더
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,
    routes: [
      // Splash
      GoRoute(
        path: '/',
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      
      // Auth
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SignupPage(),
      ),
      GoRoute(
        path: '/forgot-password',
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: '/terms',
        name: 'terms',
        builder: (context, state) => const TermsPage(),
      ),
      GoRoute(
        path: '/privacy-policy',
        name: 'privacy-policy',
        builder: (context, state) => const PrivacyPolicyPage(),
      ),
      
      // Home
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) => const HomePage(),
      ),

      // Content View (가격표, 쉬운가이드 등)
      GoRoute(
        path: '/content-view',
        name: 'content-view',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>;
          return ContentViewPage(
            contentKey: data['key'] as String,
            title: data['title'] as String,
          );
        },
      ),
      
      // Worker Dashboard (작업자 전용 대시보드)
      GoRoute(
        path: '/worker-dashboard',
        name: 'worker-dashboard',
        builder: (context, state) => const WorkerDashboardPage(),
      ),
      
      // Orders
      GoRoute(
        path: '/orders',
        name: 'orders',
        builder: (context, state) => const OrderListPage(),
        routes: [
          GoRoute(
            path: ':orderId',
            name: 'order-detail',
            builder: (context, state) {
              final orderId = state.pathParameters['orderId']!;
              return OrderDetailPage(orderId: orderId);
            },
            routes: [
              GoRoute(
                path: 'tracking/:trackingNo',
                name: 'tracking',
                builder: (context, state) {
                  final orderId = state.pathParameters['orderId']!;
                  final trackingNo = state.pathParameters['trackingNo']!;
                  return TrackingPage(orderId: orderId, trackingNo: trackingNo);
                },
              ),
            ],
          ),
        ],
      ),
      
      // Create Order
      GoRoute(
        path: '/create-order',
        name: 'create-order',
        builder: (context, state) => const CreateOrderPage(),
      ),
      
      // Cart (장바구니)
      GoRoute(
        path: '/cart',
        name: 'cart',
        builder: (context, state) => const CartPage(),
      ),
      
      // Comparison video player (side-by-side)
      GoRoute(
        path: '/comparison-video',
        name: 'comparison-video',
        builder: (context, state) {
          final extra = state.extra;
          
          if (extra is Map<String, dynamic>) {
            // 여러 아이템 순차 재생
            if (extra.containsKey('videoItems')) {
              final videoItems = extra['videoItems'] as List<Map<String, String>>?;
              if (videoItems != null && videoItems.isNotEmpty) {
                return ComparisonVideoPlayerPage(
                  videoItems: videoItems,
                );
              }
            }
            
            // 단일 아이템 (레거시)
            final inboundUrl = extra['inboundUrl'] as String? ?? '';
            final outboundUrl = extra['outboundUrl'] as String? ?? '';
            
            if (inboundUrl.isNotEmpty && outboundUrl.isNotEmpty) {
              return ComparisonVideoPlayerPage(
                inboundVideoUrl: inboundUrl,
                outboundVideoUrl: outboundUrl,
              );
            }
          }
          
          // 데이터 없으면 에러 페이지
          return const Scaffold(
            body: Center(
              child: Text('영상을 찾을 수 없습니다'),
            ),
          );
        },
      ),
      
      // Select Clothing Type
      GoRoute(
        path: '/select-clothing-type',
        name: 'select-clothing-type',
        builder: (context, state) {
          final data = state.extra;
          if (data is Map<String, dynamic>) {
            return SelectClothingTypePage(
              imageUrls: data['imageUrls'] as List<String>? ?? [],
              fromCamera: data['fromCamera'] as bool? ?? false,
              imageUrl: data['imageUrl'] as String?,
              preSelectedCategory: data['preSelectedCategory'] as String?,
            );
          }
          final imageUrls = data as List<String>? ?? [];
          return SelectClothingTypePage(imageUrls: imageUrls);
        },
      ),
      
      // Select Repair Type
      GoRoute(
        path: '/select-repair-type',
        name: 'select-repair-type',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>? ?? {};
          return SelectRepairTypePage(
            clothingType: data['clothingType'] as String? ?? '',
            imageUrls: data['imageUrls'] as List<String>? ?? [],
          );
        },
      ),
      
      // Select Repair Parts (사진 촬영 후 바로 수선 부위 선택)
      GoRoute(
        path: '/select-repair-parts',
        name: 'select-repair-parts',
        pageBuilder: (context, state) {
          final data = state.extra;
          List<String> imageUrls = [];
          List<Map<String, dynamic>>? imagesWithPins;
          String? categoryId;
          String? categoryName;
          
          if (data is Map<String, dynamic>) {
            imageUrls = data['imageUrls'] as List<String>? ?? [];
            imagesWithPins = data['imagesWithPins'] as List<Map<String, dynamic>>?;
            categoryId = data['categoryId'] as String?;
            categoryName = data['categoryName'] as String?;
          } else if (data is List<String>) {
            imageUrls = data;
          }
          
          // 애니메이션 없이 즉시 표시 (깜빡임 최소화)
          return CustomTransitionPage(
            key: state.pageKey,
            child: SelectRepairPartsPage(
              imageUrls: imageUrls,
              imagesWithPins: imagesWithPins,
              categoryId: categoryId,
              categoryName: categoryName,
            ),
            transitionDuration: Duration.zero, // 애니메이션 없음
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return child; // 애니메이션 효과 없이 바로 표시
            },
          );
        },
      ),
      
      // Repair Detail Input (상세 치수 입력)
      GoRoute(
        path: '/repair-detail-input',
        name: 'repair-detail-input',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>? ?? {};
          return RepairDetailInputPage(
            repairPart: data['repairPart'] as String? ?? '',
            priceRange: data['priceRange'] as String?,
            price: data['price'] as int?,
            imageUrls: data['imageUrls'] as List<String>? ?? [],
            imagesWithPins: data['imagesWithPins'] as List<Map<String, dynamic>>?,
            hasAdvancedOptions: data['hasAdvancedOptions'] as bool?,
            requiresMultipleInputs: data['requiresMultipleInputs'] as bool?,
            inputLabels: (data['inputLabels'] as List?)?.cast<String>(),
            repairTypeId: data['repairTypeId'] as String?,
            allowMultipleSubParts: data['allowMultipleSubParts'] as bool?,
          );
        },
      ),
      
      // Repair Confirmation (최종 확인)
      GoRoute(
        path: '/repair-confirmation',
        name: 'repair-confirmation',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>? ?? {};
          return RepairConfirmationPage(
            repairItems: data['repairItems'] as List<Map<String, dynamic>>? ?? [],
            imageUrls: data['imageUrls'] as List<String>? ?? [],
          );
        },
      ),
      
      // Pickup Request (수거신청)
      GoRoute(
        path: '/pickup-request',
        name: 'pickup-request',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>? ?? {};
          return PickupRequestPage(
            repairItems: data['repairItems'] as List<Map<String, dynamic>>? ?? [],
            imageUrls: data['imageUrls'] as List<String>? ?? [],
            imagesWithPins: data['imagesWithPins'] as List<Map<String, dynamic>>?,
          );
        },
      ),
      
      // Payment
      GoRoute(
        path: '/payment/:orderId',
        name: 'payment',
        builder: (context, state) {
          final orderId = state.pathParameters['orderId']!;
          return PaymentPage(orderId: orderId);
        },
      ),
      
      // Image Annotation (이미지 핀 추가)
      GoRoute(
        path: '/image-annotation',
        name: 'image-annotation',
        builder: (context, state) {
          final data = state.extra as Map<String, dynamic>? ?? {};
          
          // pins를 ImagePin으로 변환
          List<ImagePin>? initialPins;
          final pinsData = data['pins'] as List?;
          if (pinsData != null) {
            initialPins = pinsData.map((p) {
              if (p is ImagePin) {
                return p;
              } else if (p is Map<String, dynamic>) {
                return ImagePin.fromJson(p);
              } else if (p is Map) {
                return ImagePin.fromJson(Map<String, dynamic>.from(p));
              }
              return null;
            }).whereType<ImagePin>().toList();
          }
          
          return ImageAnnotationPage(
            initialImagePath: data['imagePath'] as String?,
            initialPins: initialPins,
            onComplete: data['onComplete'] as Function(String, List<ImagePin>)?,
          );
        },
      ),
      
      // Profile (마이페이지)
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const ProfilePage(),
        routes: [
          // 회원정보
          GoRoute(
            path: 'account',
            name: 'profile-account',
            builder: (context, state) => const AccountInfoPage(),
          ),
          // 비밀번호 변경
          GoRoute(
            path: 'change-password',
            name: 'profile-change-password',
            builder: (context, state) => const ChangePasswordPage(),
          ),
          // 배송지 설정
          GoRoute(
            path: 'addresses',
            name: 'profile-addresses',
            builder: (context, state) {
              final data = state.extra as Map<String, dynamic>?;
              final isSelectionMode = data?['isSelectionMode'] as bool? ?? false;
              return AddressesPage(isSelectionMode: isSelectionMode);
            },
            routes: [
              // 배송지 추가/수정
              GoRoute(
                path: 'add',
                name: 'profile-addresses-add',
                builder: (context, state) {
                  final existingAddress = state.extra as Map<String, dynamic>?;
                  return AddAddressPage(existingAddress: existingAddress);
                },
              ),
            ],
          ),
          // 결제수단 관리
          GoRoute(
            path: 'payment-methods',
            name: 'profile-payment-methods',
            builder: (context, state) => const PaymentMethodsPage(),
            routes: [
              // 결제수단 추가
              GoRoute(
                path: 'add',
                name: 'profile-payment-methods-add',
                builder: (context, state) => const AddPaymentMethodPage(),
              ),
            ],
          ),
          // 결제내역
          GoRoute(
            path: 'payment-history',
            name: 'profile-payment-history',
            builder: (context, state) => const PaymentHistoryPage(),
          ),
          // 영수증
          GoRoute(
            path: 'receipt',
            name: 'profile-receipt',
            builder: (context, state) {
              final payment = state.extra as Map<String, dynamic>;
              return ReceiptPage(payment: payment);
            },
          ),
          // 포인트 적립 내역
          GoRoute(
            path: 'points-history',
            name: 'profile-points-history',
            builder: (context, state) => const PointsHistoryPage(),
          ),
          // 친구초대
          GoRoute(
            path: 'invite-friends',
            name: 'profile-invite-friends',
            builder: (context, state) => const InviteFriendsPage(),
          ),
          // 공지사항
          GoRoute(
            path: 'notices',
            name: 'profile-notices',
            builder: (context, state) => const NoticesPage(),
          ),
          // 고객센터
          GoRoute(
            path: 'customer-service',
            name: 'profile-customer-service',
            builder: (context, state) => const CustomerServicePage(),
          ),
          // 앱 설정
          GoRoute(
            path: 'settings',
            name: 'profile-settings',
            builder: (context, state) => const AppSettingsPage(),
          ),
        ],
      ),
    ],
    
    // Error Handler
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('페이지를 찾을 수 없습니다: ${state.uri}'),
      ),
    ),
  );
});

