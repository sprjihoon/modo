import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/orders/presentation/pages/order_list_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';

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
    ],
    
    // Error Handler
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('페이지를 찾을 수 없습니다: ${state.uri}'),
      ),
    ),
  );
});

