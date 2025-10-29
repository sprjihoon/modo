import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/orders/presentation/pages/order_list_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';
import '../../features/orders/presentation/pages/create_order_page.dart';
import '../../features/orders/presentation/pages/select_clothing_type_page.dart';
import '../../features/orders/presentation/pages/select_repair_type_page.dart';
import '../../features/orders/presentation/pages/select_repair_parts_page.dart';
import '../../features/orders/presentation/pages/repair_detail_input_page.dart';
import '../../features/orders/presentation/pages/repair_confirmation_page.dart';
import '../../features/orders/presentation/pages/pickup_request_page.dart';
import '../../features/orders/presentation/pages/payment_page.dart';

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
      
      // Home
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) => const HomePage(),
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
          ),
        ],
      ),
      
      // Create Order
      GoRoute(
        path: '/create-order',
        name: 'create-order',
        builder: (context, state) => const CreateOrderPage(),
      ),
      
      // Select Clothing Type
      GoRoute(
        path: '/select-clothing-type',
        name: 'select-clothing-type',
        builder: (context, state) {
          final imageUrls = state.extra as List<String>? ?? [];
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
        builder: (context, state) {
          final imageUrls = state.extra as List<String>? ?? [];
          return SelectRepairPartsPage(imageUrls: imageUrls);
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
            priceRange: data['priceRange'] as String? ?? '',
            imageUrls: data['imageUrls'] as List<String>? ?? [],
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
    ],
    
    // Error Handler
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('페이지를 찾을 수 없습니다: ${state.uri}'),
      ),
    ),
  );
});

