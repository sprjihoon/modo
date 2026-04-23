import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import 'announcement_detail_page.dart';

/// 공지사항 목록 화면
class AnnouncementsPage extends StatefulWidget {
  const AnnouncementsPage({Key? key}) : super(key: key);

  @override
  State<AnnouncementsPage> createState() => _AnnouncementsPageState();
}

class _AnnouncementsPageState extends State<AnnouncementsPage> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _announcements = [];
  List<String> _readAnnouncementIds = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  Future<void> _loadAnnouncements() async {
    try {
      setState(() {
        _isLoading = true;
      });

      // 공지사항 조회
      final response = await _supabase
          .from('announcements')
          .select('*')
          .eq('status', 'sent')
          .order('is_pinned', ascending: false)
          .order('sent_at', ascending: false);

      _announcements = (response as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

      // 읽은 공지사항 조회
      await _loadReadAnnouncements();

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('❌ 공지사항 로드 실패: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadReadAnnouncements() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      // public.users에서 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) return;

      final userId = userResponse['id'] as String;

      // 읽은 공지사항 목록
      final readResponse = await _supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', userId);

      _readAnnouncementIds = (readResponse as List)
          .map((item) => item['announcement_id'] as String)
          .toList();
    } catch (e) {
      debugPrint('❌ 읽은 공지사항 로드 실패: $e');
    }
  }

  bool _isRead(String announcementId) {
    return _readAnnouncementIds.contains(announcementId);
  }

  String _getTypeIcon(String type) {
    switch (type) {
      case 'urgent':
        return '🚨';
      case 'maintenance':
        return '🔧';
      case 'promotion':
        return '🎉';
      default:
        return '📢';
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'urgent':
        return Colors.red;
      case 'maintenance':
        return Colors.orange;
      case 'promotion':
        return Colors.purple;
      default:
        return Colors.blue;
    }
  }

  String _getTypeName(String type) {
    switch (type) {
      case 'urgent':
        return '긴급';
      case 'maintenance':
        return '점검';
      case 'promotion':
        return '프로모션';
      default:
        return '일반';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: const ModoAppBar(
        title: Text('공지사항'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _announcements.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadAnnouncements,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _announcements.length,
                    itemBuilder: (context, index) {
                      final announcement = _announcements[index];
                      return _buildAnnouncementCard(announcement);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_none,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            '공지사항이 없습니다',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnnouncementCard(Map<String, dynamic> announcement) {
    final id = announcement['id'] as String;
    final title = announcement['title'] as String;
    final type = announcement['type'] as String;
    final isPinned = announcement['is_pinned'] as bool? ?? false;
    final sentAt = announcement['sent_at'] as String?;
    final isRead = _isRead(id);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isRead ? 1 : 3,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isPinned
            ? BorderSide(color: Colors.amber[700]!, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: () async {
          // 상세 화면으로 이동
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AnnouncementDetailPage(
                announcement: announcement,
              ),
            ),
          );

          // 돌아온 후 읽음 목록 갱신
          await _loadReadAnnouncements();
          setState(() {});
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 헤더
              Row(
                children: [
                  // 타입 아이콘
                  Text(
                    _getTypeIcon(type),
                    style: const TextStyle(fontSize: 20),
                  ),
                  const SizedBox(width: 8),

                  // 타입 라벨
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getTypeColor(type).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _getTypeName(type),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: _getTypeColor(type),
                      ),
                    ),
                  ),

                  // 고정 배지
                  if (isPinned) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.amber[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.push_pin,
                            size: 12,
                            color: Colors.amber[900],
                          ),
                          const SizedBox(width: 2),
                          Text(
                            '고정',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.amber[900],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const Spacer(),

                  // 읽지 않음 표시
                  if (!isRead)
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // 제목
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: isRead ? FontWeight.w500 : FontWeight.bold,
                  color: isRead ? Colors.grey[700] : Colors.black,
                ),
              ),
              const SizedBox(height: 8),

              // 날짜
              if (sentAt != null)
                Text(
                  DateFormat('yyyy.MM.dd HH:mm').format(
                    DateTime.parse(sentAt),
                  ),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

