import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

/// 공지사항 상세 화면
class AnnouncementDetailPage extends StatefulWidget {
  final Map<String, dynamic> announcement;

  const AnnouncementDetailPage({
    Key? key,
    required this.announcement,
  }) : super(key: key);

  @override
  State<AnnouncementDetailPage> createState() => _AnnouncementDetailPageState();
}

class _AnnouncementDetailPageState extends State<AnnouncementDetailPage> {
  final _supabase = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _markAsRead();
  }

  Future<void> _markAsRead() async {
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
      final announcementId = widget.announcement['id'] as String;

      // RPC 함수 호출하여 읽음 표시
      await _supabase.rpc('mark_announcement_as_read', params: {
        'p_announcement_id': announcementId,
        'p_user_id': userId,
      });

      debugPrint('✅ 공지사항 읽음 표시 완료');
    } catch (e) {
      debugPrint('❌ 읽음 표시 실패: $e');
    }
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

  Future<void> _openLink(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('링크를 열 수 없습니다')),
          );
        }
      }
    } catch (e) {
      debugPrint('링크 열기 실패: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('링크 열기 실패: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.announcement['title'] as String;
    final content = widget.announcement['content'] as String;
    final type = widget.announcement['type'] as String;
    final isPinned = widget.announcement['is_pinned'] as bool? ?? false;
    final sentAt = widget.announcement['sent_at'] as String?;
    final imageUrl = widget.announcement['image_url'] as String?;
    final linkUrl = widget.announcement['link_url'] as String?;

    return Scaffold(
      appBar: AppBar(
        title: const Text('공지사항'),
        backgroundColor: _getTypeColor(type),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 헤더
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _getTypeColor(type).withOpacity(0.1),
                border: Border(
                  bottom: BorderSide(
                    color: _getTypeColor(type).withOpacity(0.3),
                    width: 1,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 타입 배지
                  Row(
                    children: [
                      Text(
                        _getTypeIcon(type),
                        style: const TextStyle(fontSize: 24),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: _getTypeColor(type),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _getTypeName(type),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      if (isPinned) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.amber[700],
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.push_pin,
                                size: 14,
                                color: Colors.white,
                              ),
                              SizedBox(width: 4),
                              Text(
                                '고정',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 제목
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 날짜
                  if (sentAt != null)
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 16,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          DateFormat('yyyy년 MM월 dd일 HH:mm').format(
                            DateTime.parse(sentAt),
                          ),
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),

            // 이미지 (있는 경우)
            if (imageUrl != null && imageUrl.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(20),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    imageUrl,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        height: 200,
                        color: Colors.grey[200],
                        child: const Center(
                          child: Icon(
                            Icons.broken_image,
                            size: 48,
                            color: Colors.grey,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

            // 본문
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Text(
                content,
                style: const TextStyle(
                  fontSize: 16,
                  height: 1.6,
                  color: Colors.black87,
                ),
              ),
            ),

            // 링크 버튼 (있는 경우)
            if (linkUrl != null && linkUrl.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _openLink(linkUrl),
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('자세히 보기'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _getTypeColor(type),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

