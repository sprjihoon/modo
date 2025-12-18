import 'package:flutter/material.dart';
import '../../../../services/content_service.dart';

class ContentViewPage extends StatefulWidget {
  final String contentKey;
  final String title;

  const ContentViewPage({
    super.key,
    required this.contentKey,
    required this.title,
  });

  @override
  State<ContentViewPage> createState() => _ContentViewPageState();
}

class _ContentViewPageState extends State<ContentViewPage> {
  final ContentService _contentService = ContentService();
  AppContent? _content;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadContent();
  }

  Future<void> _loadContent() async {
    final content = await _contentService.getContent(widget.contentKey);
    if (mounted) {
      setState(() {
        _content = content;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_content == null || (_content!.text.isEmpty && _content!.images.isEmpty)) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Text(
            '내용이 없습니다.',
            style: TextStyle(
              fontSize: 16,
              color: Colors.black54,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_content!.text.isNotEmpty) ...[
            Text(
              _content!.text,
              style: const TextStyle(
                fontSize: 16,
                height: 1.6,
                color: Colors.black87,
              ),
            ),
            if (_content!.images.isNotEmpty) const SizedBox(height: 24),
          ],
          if (_content!.images.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _content!.images.map((url) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AspectRatio(
                      aspectRatio: 4 / 3,
                      child: Image.network(
                        url,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.grey.shade200,
                            alignment: Alignment.center,
                            child: const Text(
                              '이미지를 불러오지 못했습니다.',
                              style: TextStyle(fontSize: 13, color: Colors.black54),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }
}

