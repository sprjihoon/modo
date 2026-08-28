import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/notifications/notification_settings.dart';
import '../../../../core/utils/notification_format.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/customer_event_service.dart';

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
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final _supabase = Supabase.instance.client;
  late TabController _tabController;

  bool _isLoading = true;
  bool _notificationsEnabled = true;
  List<Map<String, dynamic>> _allNotifications = [];
  List<Map<String, dynamic>> _announcements = [];
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) setState(() {});
    });
    WidgetsBinding.instance.addObserver(this);
    _loadNotifications();
    _refreshPermission();
  }

  Future<void> _refreshPermission() async {
    final granted = await isNotificationGranted();
    if (mounted) setState(() => _notificationsEnabled = granted);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tabController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshPermission();
    }
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

      // 1. 읽지 않은 개인 알림만 조회 (읽음 처리된 항목은 목록에서 제외)
      final notificationsResponse = await _supabase
          .from('notifications')
          .select('*, orders!left(id, status), metadata')
          .eq('user_id', userId)
          .eq('is_read', false)
          .order('created_at', ascending: false)
          .limit(50);

      // 취소된 주문의 알림 제외
      _allNotifications = (notificationsResponse as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .where((notification) {
            if (notification['order_id'] == null) return true;
            final orders = notification['orders'];
            if (orders == null) return true;
            final orderStatus = orders['status'] as String?;
            if (orderStatus == 'CANCELLED') {
              debugPrint('🚫 취소된 주문 알림 필터링: ${notification['id']}');
              return false;
            }
            return true;
          })
          .toList();

      // 2. 공지사항 + 읽음 기록
      final announcementsResponse = await _supabase
          .from('announcements')
          .select('*')
          .eq('status', 'sent')
          .order('is_pinned', ascending: false)
          .order('sent_at', ascending: false)
          .limit(50);

      final readResponse = await _supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', userId);

      final readIds = (readResponse as List)
          .map((item) => item['announcement_id'] as String)
          .toSet();

      // 읽은 공지는 목록에서 제외
      _announcements = (announcementsResponse as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .where((a) => !readIds.contains(a['id'] as String?))
          .toList();

      _unreadCount = _allNotifications.length;

      setState(() => _isLoading = false);
    } catch (e) {
      debugPrint('❌ 알림 로드 실패: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _dismissNotification(String notificationId) async {
    try {
      await _supabase
          .from('notifications')
          .update({'is_read': true, 'read_at': DateTime.now().toIso8601String()})
          .eq('id', notificationId);

      setState(() {
        _allNotifications.removeWhere((n) => n['id'] == notificationId);
        _unreadCount = _allNotifications.length;
      });
    } catch (e) {
      debugPrint('❌ 알림 닫기 실패: $e');
    }
  }

  Future<void> _dismissAnnouncement(String announcementId) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();
      if (userResponse == null) return;

      await _supabase.from('announcement_reads').upsert({
        'announcement_id': announcementId,
        'user_id': userResponse['id'] as String,
        'read_at': DateTime.now().toIso8601String(),
      }, onConflict: 'announcement_id,user_id');

      setState(() {
        _announcements.removeWhere((a) => a['id'] == announcementId);
      });
    } catch (e) {
      debugPrint('❌ 공지 닫기 실패: $e');
    }
  }

  Future<void> _dismissAllVisible() async {
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
      final onAnnouncements = _tabController.index == 1;

      if (onAnnouncements) {
        if (_announcements.isEmpty) return;
        final rows = _announcements
            .map((a) => {
                  'announcement_id': a['id'],
                  'user_id': userId,
                  'read_at': DateTime.now().toIso8601String(),
                })
            .toList();
        await _supabase.from('announcement_reads').upsert(
              rows,
              onConflict: 'announcement_id,user_id',
            );
        setState(() => _announcements = []);
      } else {
        await _supabase
            .from('notifications')
            .update({
              'is_read': true,
              'read_at': DateTime.now().toIso8601String(),
            })
            .eq('user_id', userId)
            .eq('is_read', false);

        setState(() {
          _allNotifications = [];
          _unreadCount = 0;
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(onAnnouncements ? '모든 공지를 닫았습니다' : '모든 알림을 닫았습니다'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      debugPrint('❌ 전체 닫기 실패: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: ModoAppBar(
        title: const Text(
          '알림',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          if ((_tabController.index == 0 && _allNotifications.isNotEmpty) ||
              (_tabController.index == 1 && _announcements.isNotEmpty))
            TextButton(
              onPressed: _dismissAllVisible,
              child: const Text('모두 닫기'),
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
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            if (!_notificationsEnabled)
              Material(
                color: const Color(0xFFFFF3E0),
                child: InkWell(
                  onTap: openNotificationSettings,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: Row(
                      children: [
                        const Icon(Icons.notifications_off_outlined,
                            color: Color(0xFFFF9800)),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            '알림이 꺼져 있습니다. 눌러서 설정에서 켜 주세요.',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF7A4E00),
                            ),
                          ),
                        ),
                        Icon(Icons.chevron_right, color: Colors.orange.shade700),
                      ],
                    ),
                  ),
                ),
              ),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _buildNotificationsList(),
                        _buildAnnouncementsList(),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  /// 내 알림 탭
  Widget _buildNotificationsList() {
    if (_allNotifications.isEmpty) {
      return _buildEmptyState(
        icon: Icons.notifications_none,
        title: '새 알림이 없습니다',
        subtitle: '읽은 알림은 목록에서 제외됩니다',
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
        title: '새 공지사항이 없습니다',
        subtitle: '읽은 공지는 목록에서 제외됩니다',
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
    final type = notification['type'] as String?;
    final title = notification['title'] as String? ?? '알림';
    final body = formatNotificationBody(notification['body'] as String?);
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

    // CS 영상 공유 알림
    final isCsVideo = type == 'CS_VIDEO_SHARED';
    final metadata = notification['metadata'] as Map<String, dynamic>?;
    final videoUrl = metadata?['video_url'] as String?;
    final videoLabel = metadata?['video_label'] as String? ?? 'CS 영상';

    if (isCsVideo) {
      icon = Icons.videocam;
      iconColor = Colors.teal.shade600;
    } else if (type?.contains('extra_charge') == true) {
      icon = Icons.payment;
      iconColor = Colors.orange.shade700;
    } else if (type?.contains('order') == true) {
      icon = Icons.shopping_bag;
      iconColor = Colors.blue;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      color: isCsVideo ? Colors.teal.shade50 : Colors.blue.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isCsVideo ? Colors.teal.shade200 : Colors.blue.shade200,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: () {
          final id = notification['id'] as String;
          debugPrint('🔔 알림 클릭: id=$id, order_id=$orderId, type=$type');
          CustomerEventService.trackNotificationClick(
            notificationId: id,
            notificationType: type,
            orderId: orderId,
          );

          if (isCsVideo && videoUrl != null) {
            _dismissNotification(id);
            _openVideoUrl(videoUrl);
            return;
          }

          _dismissNotification(id);
          if (orderId != null && orderId.isNotEmpty) {
            context.push('/orders/$orderId');
          } else {
            context.push('/orders');
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
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
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
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

                  IconButton(
                    icon: Icon(Icons.close, size: 20, color: Colors.grey.shade400),
                    tooltip: '닫기',
                    onPressed: () =>
                        _dismissNotification(notification['id'] as String),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  ),
                ],
              ),

              // CS 영상 보기 버튼
              if (isCsVideo && videoUrl != null) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _openVideoUrl(videoUrl),
                    icon: const Icon(Icons.play_circle_fill, size: 18),
                    label: Text('$videoLabel 보기'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openVideoUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('영상을 열 수 없습니다.')),
          );
        }
      }
    } catch (e) {
      debugPrint('영상 URL 열기 실패: $e');
    }
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
          final announcementId = announcement['id'] as String?;
          if (announcementId != null) {
            context.push('/announcements/$announcementId', extra: announcement);
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Text(
                typeEmoji,
                style: const TextStyle(fontSize: 28),
              ),
              const SizedBox(width: 12),
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
              IconButton(
                icon: Icon(Icons.close, size: 20, color: Colors.grey.shade400),
                tooltip: '닫기',
                onPressed: () {
                  final id = announcement['id'] as String?;
                  if (id != null) _dismissAnnouncement(id);
                },
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
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

