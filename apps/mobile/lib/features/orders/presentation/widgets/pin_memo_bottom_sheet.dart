import 'package:flutter/material.dart';

/// 핀 메모 입력 바텀시트
class PinMemoBottomSheet extends StatefulWidget {
  final String? initialMemo;
  final Function(String memo) onSave;
  final VoidCallback? onDelete; // 삭제 콜백 추가

  const PinMemoBottomSheet({
    super.key,
    this.initialMemo,
    required this.onSave,
    this.onDelete,
  });

  @override
  State<PinMemoBottomSheet> createState() => _PinMemoBottomSheetState();

  /// 바텀시트 표시 헬퍼 메서드
  static Future<Map<String, dynamic>?> showMemoBottomSheet(
    BuildContext context, {
    String? initialMemo,
    VoidCallback? onDelete,
  }) async {
    Map<String, dynamic>? result;
    
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PinMemoBottomSheet(
        initialMemo: initialMemo,
        onSave: (memo) {
          result = {'action': 'save', 'memo': memo};
        },
        onDelete: onDelete != null ? () {
          result = {'action': 'delete'};
          Navigator.of(context).pop();
          onDelete();
        } : null,
      ),
    );
    
    return result;
  }
}

class _PinMemoBottomSheetState extends State<PinMemoBottomSheet> {
  late TextEditingController _controller;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialMemo ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleSave() {
    // 빈 메모도 저장 가능
    widget.onSave(_controller.text.trim());
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 헤더
            Row(
              children: [
                const Text(
                  '메모 작성',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            
            const SizedBox(height: 20),
            
            // 메모 입력 필드
            TextFormField(
              controller: _controller,
              autofocus: true,
              maxLines: 4,
              maxLength: 200,
              decoration: InputDecoration(
                hintText: '수선 부위나 요청사항을 입력하세요 (선택사항)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
                counterText: '${_controller.text.length}/200',
              ),
              validator: (value) {
                // 메모 선택사항으로 변경 (빈 값도 허용)
                return null;
              },
              onChanged: (value) {
                setState(() {}); // 글자 수 업데이트
              },
            ),
            
            const SizedBox(height: 20),
            
            // 버튼들
            Row(
              children: [
                // 삭제 버튼 (onDelete가 있을 때만)
                if (widget.onDelete != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: widget.onDelete,
                      icon: const Icon(Icons.delete_outline, size: 20),
                      label: const Text('삭제'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                if (widget.onDelete != null) const SizedBox(width: 12),
                
                // 저장 버튼
                Expanded(
                  flex: widget.onDelete != null ? 2 : 1,
                  child: ElevatedButton(
                    onPressed: _handleSave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00C896),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      '저장',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
