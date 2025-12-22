import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

/// 통합 알림 센터
/// 
/// 표시되는 알림:
/// - 공지사항 (announcements)
/// - 주문 알림 (notifications - order_status_changed)
/// - 추가결제 알림 (notifications - extra_charge_status_changed)
/// - 기타 시스템 알림
class NotificationsPage extends StatefulWidget {
  const NotificationsPage({Key? key}) : super(key: key);

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage>
    with SingleTickerProviderStateMixin {
  final _supabase = Supabase.instance.client;
  late TabController _tabController;

  bool _isLoading = true;
  List<Map<String, dynamic>> _allNotifications = [];
  List<Map<String, dynamic>> _announcements = [];
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadNotifications();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      setState(() => _isLoading = true);

      final user = _supabase.auth.currentUser;
      if (user == null) {
        setState(() => _isLoading = false);
        return;
      }

      // public.users에서 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        setState(() => _isLoading = false);
        return;
      }

      final userId = userResponse['id'] as String;

      // 1. 개인 알림 조회 (notifications 테이블)
      final notificationsResponse = await _supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(50);

      _allNotifications = (notificationsResponse as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

      // 2. 공지사항 조회 (announcements 테이블)
      final announcementsResponse = await _supabase
          .from('announcements')
          .select('*')
          .eq('status', 'sent')
          .order('is_pinned', ascending: false)
          .order('sent_at', ascending: false)
          .limit(20);

      _announcements = (announcementsResponse as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

      // 읽지 않은 알림 개수
      _unreadCount = _allNotifications.where((n) => n['is_read'] == false).length;

      setState(() => _isLoading = false);
    } catch (e) {
      debugPrint('❌ 알림 로드 실패: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markAsRead(String notificationId) async {
    try {
      await _supabase
          .from('notifications')
          .update({'read': true, 'read_at': DateTime.now().toIso8601String()})
          .eq('id', notificationId);

      setState(() {
        final index = _allNotifications.indexWhere((n) => n['id'] == notificationId);
        if (index != -1) {
          _allNotifications[index]['is_read'] = true;
          _unreadCount = _allNotifications.where((n) => n['is_read'] == false).length;
        }
      });
    } catch (e) {
      debugPrint('❌ 알림 읽음 처리 실패: $e');
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) return;

      final userId = userResponse['id'] as String;

      await _supabase
          .from('notifications')
          .update({'is_read': true, 'read_at': DateTime.now().toIso8601String()})
          .eq('user_id', userId)
          .eq('is_read', false);

      setState(() {
        for (var notification in _allNotifications) {
          notification['is_read'] = true;
        }
        _unreadCount = 0;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('모든 알림을 읽음 처리했습니다'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      debugPrint('❌ 전체 읽음 처리 실패: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          '알림',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text('모두 읽음'),
            ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.black),
            onPressed: _loadNotifications,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Theme.of(context).primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Theme.of(context).primaryColor,
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('내 알림'),
                  if (_unreadCount > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        _unreadCount > 99 ? '99+' : '$_unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: '공지사항'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildNotificationsList(),
                _buildAnnouncementsList(),
              ],
            ),
    );
  }

  /// 내 알림 탭
  Widget _buildNotificationsList() {
    if (_allNotifications.isEmpty) {
      return _buildEmptyState(
        icon: Icons.notifications_none,
        title: '알림이 없습니다',
        subtitle: '새로운 알림이 도착하면 여기에 표시됩니다',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _allNotifications.length,
        itemBuilder: (context, index) {
          final notification = _allNotifications[index];
          return _buildNotificationCard(notification);
        },
      ),
    );
  }

  /// 공지사항 탭
  Widget _buildAnnouncementsList() {
    if (_announcements.isEmpty) {
      return _buildEmptyState(
        icon: Icons.campaign_outlined,
        title: '공지사항이 없습니다',
        subtitle: '새로운 공지사항이 등록되면 여기에 표시됩니다',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _announcements.length,
        itemBuilder: (context, index) {
          final announcement = _announcements[index];
          return _buildAnnouncementCard(announcement);
        },
      ),
    );
  }

  /// 알림 카드
  Widget _buildNotificationCard(Map<String, dynamic> notification) {
    final isRead = notification['is_read'] == true;
    final type = notification['type'] as String?;
    final title = notification['title'] as String? ?? '알림';
    final body = notification['body'] as String? ?? '';
    final createdAt = notification['created_at'] as String?;
    final orderId = notification['order_id'] as String?;

    String timeAgo = '';
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt);
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 1) {
          timeAgo = '방금 전';
        } else if (diff.inHours < 1) {
          timeAgo = '${diff.inMinutes}분 전';
        } else if (diff.inDays < 1) {
          timeAgo = '${diff.inHours}시간 전';
        } else if (diff.inDays < 7) {
          timeAgo = '${diff.inDays}일 전';
        } else {
          timeAgo = DateFormat('yyyy.MM.dd').format(dt);
        }
      } catch (_) {}
    }

    IconData icon = Icons.notifications;
    Color iconColor = Theme.of(context).primaryColor;

    if (type?.contains('extra_charge') == true) {
      icon = Icons.payment;
      iconColor = Colors.orange.shade700;
    } else if (type?.contains('order') == true) {
      icon = Icons.shopping_bag;
      iconColor = Colors.blue;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isRead ? 0 : 2,
      color: isRead ? Colors.white : Colors.blue.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isRead ? Colors.grey.shade200 : Colors.blue.shade200,
          width: isRead ? 1 : 2,
        ),
      ),
      child: InkWell(
        onTap: () {
          if (!isRead) {
            _markAsRead(notification['id'] as String);
          }
          if (orderId != null && orderId.isNotEmpty) {
            context.push('/orders/$orderId');
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 아이콘
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 12),

              // 내용
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(right: 8),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                          ),
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      body,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      timeAgo,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),

              // 화살표
              if (orderId != null && orderId.isNotEmpty)
                Icon(
                  Icons.arrow_forward_ios,
                  size: 16,
                  color: Colors.grey.shade400,
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// 공지사항 카드
  Widget _buildAnnouncementCard(Map<String, dynamic> announcement) {
    final isPinned = announcement['is_pinned'] == true;
    final type = announcement['type'] as String? ?? 'general';
    final title = announcement['title'] as String? ?? '';
    final sentAt = announcement['sent_at'] as String?;

    String dateStr = '';
    if (sentAt != null) {
      try {
        final dt = DateTime.parse(sentAt);
        dateStr = DateFormat('yyyy.MM.dd').format(dt);
      } catch (_) {}
    }

    String typeEmoji = '📢';

    switch (type) {
      case 'urgent':
        typeEmoji = '🚨';
        break;
      case 'maintenance':
        typeEmoji = '🔧';
        break;
      case 'promotion':
        typeEmoji = '🎉';
        break;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isPinned ? 2 : 0,
      color: isPinned ? Colors.yellow.shade50 : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isPinned ? Colors.yellow.shade300 : Colors.grey.shade200,
        ),
      ),
      child: InkWell(
        onTap: () {
          // TODO: 공지사항 상세 페이지로 이동
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // 이모지
              Text(
                typeEmoji,
                style: const TextStyle(fontSize: 28),
              ),
              const SizedBox(width: 12),

              // 내용
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (isPinned)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              color: Colors.yellow.shade200,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              '📌 고정',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        Expanded(
                          child: Text(
                            title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      dateStr,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),

              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 빈 상태 UI
  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

