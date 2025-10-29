import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 수선 상세 정보 입력 페이지
class RepairDetailInputPage extends ConsumerStatefulWidget {
  final String repairPart;
  final String priceRange;
  final List<String> imageUrls;
  
  const RepairDetailInputPage({
    super.key,
    required this.repairPart,
    required this.priceRange,
    required this.imageUrls,
  });

  @override
  ConsumerState<RepairDetailInputPage> createState() => _RepairDetailInputPageState();
}

class _RepairDetailInputPageState extends ConsumerState<RepairDetailInputPage> {
  final _measurementController = TextEditingController();
  String _selectedScope = '전체'; // '전체' 또는 '특정 부위 선택'
  
  @override
  void initState() {
    super.initState();
    _measurementController.addListener(() {
      setState(() {}); // TextField 입력 시 UI 업데이트
    });
  }
  
  @override
  void dispose() {
    _measurementController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '수선',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: () {
              // 모든 페이지 닫고 홈으로
              context.go('/home');
            },
            child: const Text(
              '나가기',
              style: TextStyle(
                color: Colors.black54,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 헤더
                    const Text(
                      '상세 수선 부위를 선택해주세요.',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // 선택한 수선 부위 표시
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF6B6B).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.checkroom_rounded,
                              color: Color(0xFFFF6B6B),
                              size: 30,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.repairPart,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.priceRange,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // 세부 부위 선택
                    const Text(
                      '세부 부위를 선택해주세요',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    Row(
                      children: [
                        Expanded(
                          child: _buildScopeOption('전체'),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildScopeOption('특정 부위 선택'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    
                    // 치수 입력
                    const Text(
                      '줄이고자 하는 단면 치수를 입력해주세요.',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    TextField(
                      controller: _measurementController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                        signed: true,
                      ),
                      decoration: InputDecoration(
                        hintText: '(예) -3 cm',
                        hintStyle: TextStyle(
                          color: Colors.grey.shade400,
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.grey.shade200,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF00C896),
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // 안내 메시지
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00C896).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: const Color(0xFF00C896),
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '톨러가 아닌 단면 기준의 cm를 알려주세요.',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // 도움말 링크
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton(
                          onPressed: () {
                            // TODO: 단면치수란? 설명 보여주기
                          },
                          child: const Text(
                            '단면치수란?',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.black54,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 12,
                          color: Colors.grey.shade300,
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                        TextButton(
                          onPressed: () {
                            // TODO: 길이 측정 방법 보여주기
                          },
                          child: const Text(
                            '길이 측정 방법',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.black54,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    
                    // 하단 안내
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '* 팔 통 줄임 단면 수치가 클 경우 의류 디자인에 따라 알솜/가슴통까지 자연스럽게 줄어듭게 됩니다.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // 확인 버튼 (하단 고정)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: SafeArea(
              child: ElevatedButton(
                onPressed: _measurementController.text.isEmpty 
                    ? null 
                    : () {
                        // 최종 확인 페이지로 이동
                        final repairItem = {
                          'repairPart': widget.repairPart,
                          'priceRange': widget.priceRange,
                          'scope': _selectedScope,
                          'measurement': _measurementController.text,
                        };
                        
                        context.push('/repair-confirmation', extra: {
                          'repairItems': [repairItem],
                          'imageUrls': widget.imageUrls,
                        });
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _measurementController.text.isEmpty 
                      ? Colors.grey.shade300 
                      : const Color(0xFF00C896),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  '확인',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScopeOption(String option) {
    final isSelected = _selectedScope == option;
    
    return InkWell(
      onTap: () {
        setState(() {
          _selectedScope = option;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isSelected 
              ? const Color(0xFF00C896).withOpacity(0.05)
              : Colors.white,
          border: Border.all(
            color: isSelected 
                ? const Color(0xFF00C896)
                : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected 
                  ? Icons.radio_button_checked 
                  : Icons.radio_button_unchecked,
              color: isSelected 
                  ? const Color(0xFF00C896)
                  : Colors.grey.shade400,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              option,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected 
                    ? const Color(0xFF00C896)
                    : Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

