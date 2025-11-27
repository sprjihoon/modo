import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/repair_items_provider.dart';

final supabase = Supabase.instance.client;

/// 수선 상세 정보 입력 페이지
class RepairDetailInputPage extends ConsumerStatefulWidget {
  final String repairPart;
  final String? priceRange; // 가격 범위 (legacy)
  final int? price; // 단일 가격
  final List<String> imageUrls;
  final List<Map<String, dynamic>>? imagesWithPins; // 이 의류의 핀 정보
  final bool? hasAdvancedOptions; // 고급 옵션 여부
  final bool? requiresMultipleInputs; // 여러 입력값 필요 여부
  final List<String>? inputLabels; // 입력 필드 라벨 배열
  final String? repairTypeId; // 수선 종류 ID (세부 부위 조회용)
  final bool? allowMultipleSubParts; // 세부 부위 다중 선택 허용 여부
  
  const RepairDetailInputPage({
    required this.repairPart, required this.imageUrls, super.key,
    this.priceRange,
    this.price,
    this.imagesWithPins,
    this.hasAdvancedOptions,
    this.requiresMultipleInputs,
    this.inputLabels,
    this.repairTypeId,
    this.allowMultipleSubParts,
  });

  @override
  ConsumerState<RepairDetailInputPage> createState() => _RepairDetailInputPageState();
}

class _RepairDetailInputPageState extends ConsumerState<RepairDetailInputPage> {
  final List<TextEditingController> _measurementControllers = [];
  String _selectedScope = '전체'; // '전체' 또는 '특정 부위 선택'
  List<Map<String, dynamic>> _selectedSubParts = []; // 선택한 세부 부위들
  List<Map<String, dynamic>> _availableSubParts = []; // 사용 가능한 세부 부위들
  
  @override
  void initState() {
    super.initState();
    
    // 세부 부위 로드
    if (widget.hasAdvancedOptions == true && widget.repairTypeId != null) {
      _loadSubParts();
    }
    
    // 초기 입력 필드 생성 (전체 선택인 경우)
    _initializeControllers();
  }
  
  // 입력 필드 컨트롤러 초기화
  void _initializeControllers() {
    // 기존 컨트롤러 정리
    for (var controller in _measurementControllers) {
      controller.dispose();
    }
    _measurementControllers.clear();
    
    // 새 컨트롤러 생성
    int fieldCount;
    if (_selectedScope == '특정 부위 선택' && _selectedSubParts.isNotEmpty) {
      // 선택한 세부 부위 개수 × 입력 필드 개수
      final inputCountPerPart = widget.inputLabels?.length ?? 1;
      fieldCount = _selectedSubParts.length * inputCountPerPart;
    } else {
      // 전체 선택인 경우
      fieldCount = widget.inputLabels?.length ?? 1;
    }
    
    for (int i = 0; i < fieldCount; i++) {
      final controller = TextEditingController();
      controller.addListener(() {
        setState(() {}); // TextField 입력 시 UI 업데이트
      });
      _measurementControllers.add(controller);
    }
  }
  
  @override
  void dispose() {
    for (var controller in _measurementControllers) {
      controller.dispose();
    }
    super.dispose();
  }
  
  // 모든 입력 필드가 채워졌는지 확인
  bool get _allFieldsFilled {
    if (_selectedScope == '특정 부위 선택' && _selectedSubParts.isEmpty) {
      return false;
    }
    return _measurementControllers.every((controller) => controller.text.isNotEmpty);
  }
  
  // 세부 부위 로드
  Future<void> _loadSubParts() async {
    if (widget.repairTypeId == null) return;
    
    try {
      final response = await supabase
          .from('repair_sub_parts')
          .select('*')
          .eq('repair_type_id', widget.repairTypeId!)
          .eq('part_type', 'sub_part')
          .order('display_order');
      
      setState(() {
        _availableSubParts = List<Map<String, dynamic>>.from(response);
      });
    } catch (e) {
      debugPrint('세부 부위 로드 실패: $e');
    }
  }
  
  // 세부 부위 선택 바텀시트
  Future<void> _showSubPartsSelectionSheet() async {
    if (_availableSubParts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('선택 가능한 세부 부위가 없습니다')),
      );
      return;
    }
    
    final allowMultiple = widget.allowMultipleSubParts ?? false;
    final tempSelected = List<Map<String, dynamic>>.from(_selectedSubParts);
    
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            height: MediaQuery.of(context).size.height * 0.75,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              children: [
                // 핸들
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 16),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                
                // 제목
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              '수선할 부위를 선택해주세요',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          Text(
                            allowMultiple ? '(다중 선택 가능)' : '(단일 선택)',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (tempSelected.isNotEmpty)
                        Text(
                          '${tempSelected.length}개 선택됨',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF00C896),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                
                // 세부 부위 그리드
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: _availableSubParts.length,
                      itemBuilder: (context, index) {
                        final part = _availableSubParts[index];
                        final partId = part['id'] as String;
                        final partName = part['name'] as String;
                        final isSelected = tempSelected.any((p) => p['id'] == partId);
                        
                        return InkWell(
                          onTap: () {
                            setModalState(() {
                              if (allowMultiple) {
                                // 다중 선택
                                if (isSelected) {
                                  tempSelected.removeWhere((p) => p['id'] == partId);
                                } else {
                                  tempSelected.add(part);
                                }
                              } else {
                                // 단일 선택
                                tempSelected.clear();
                                tempSelected.add(part);
                              }
                            });
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF00C896).withOpacity(0.05)
                                  : Colors.grey.shade50,
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF00C896)
                                    : Colors.grey.shade200,
                                width: isSelected ? 2 : 1,
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // 아이콘
                                Container(
                                  width: 50,
                                  height: 50,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? const Color(0xFF00C896)
                                        : Colors.grey.shade300,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    isSelected
                                        ? Icons.check_circle
                                        : Icons.checkroom,
                                    color: isSelected
                                        ? Colors.white
                                        : Colors.grey.shade600,
                                    size: 28,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                // 부위명
                                Text(
                                  partName,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected
                                        ? FontWeight.bold
                                        : FontWeight.normal,
                                    color: isSelected
                                        ? const Color(0xFF00C896)
                                        : Colors.black87,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                
                // 확인 버튼
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
                      onPressed: tempSelected.isEmpty
                          ? null
                          : () {
                              setState(() {
                                _selectedSubParts = tempSelected;
                                // 선택한 부위에 따라 입력 필드 재생성
                                _initializeControllers();
                              });
                              Navigator.pop(context);
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: tempSelected.isEmpty
                            ? Colors.grey.shade300
                            : const Color(0xFF00C896),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            tempSelected.isEmpty
                                ? '부위를 선택해주세요'
                                : '${tempSelected.length}개 부위 선택 완료',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
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
                                  widget.price != null 
                                    ? '${widget.price.toString().replaceAllMapped(
                                        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                        (Match m) => '${m[1]},',
                                      )}원'
                                    : widget.priceRange ?? '가격 미정',
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
                    
                    // 세부 부위 선택 (고급 옵션이 있을 때만 표시)
                    if (widget.hasAdvancedOptions == true) ...[
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
                    ],
                    
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
                    
                    // 동적으로 입력 필드 생성
                    ...(_selectedScope == '특정 부위 선택' && _selectedSubParts.isNotEmpty
                        ? _buildSubPartInputFields()
                        : _buildDefaultInputFields()),
                    
                    // 안내 메시지
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00C896).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.info_outline,
                            color: Color(0xFF00C896),
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
          SafeArea(
            child: Container(
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
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                onPressed: !_allFieldsFilled 
                    ? null 
                    : () {
                        // 최종 확인 페이지로 이동
                        String measurements;
                        final List<Map<String, dynamic>> detailedMeasurements = [];
                        
                        if (_selectedScope == '특정 부위 선택' && _selectedSubParts.isNotEmpty) {
                          // 세부 부위별 측정값 생성
                          final inputCountPerPart = widget.inputLabels?.length ?? 1;
                          final parts = <String>[];
                          
                          for (int partIndex = 0; partIndex < _selectedSubParts.length; partIndex++) {
                            final part = _selectedSubParts[partIndex];
                            final partName = part['name'] as String;
                            
                            if (inputCountPerPart > 1) {
                              // 입력값이 여러 개인 경우
                              final values = <String>[];
                              for (int inputIndex = 0; inputIndex < inputCountPerPart; inputIndex++) {
                                final controllerIndex = partIndex * inputCountPerPart + inputIndex;
                                final label = widget.inputLabels![inputIndex];
                                final value = _measurementControllers[controllerIndex].text;
                                values.add('$label: ${value}cm');
                              }
                              parts.add('$partName (${values.join(', ')})');
                              
                              detailedMeasurements.add({
                                'part': partName,
                                'values': List.generate(inputCountPerPart, (i) {
                                  final idx = partIndex * inputCountPerPart + i;
                                  return {
                                    'label': widget.inputLabels![i],
                                    'value': _measurementControllers[idx].text,
                                  };
                                }),
                              });
                            } else {
                              // 입력값이 하나인 경우
                              final value = _measurementControllers[partIndex].text;
                              parts.add('$partName: ${value}cm');
                              
                              detailedMeasurements.add({
                                'part': partName,
                                'value': value,
                              });
                            }
                          }
                          measurements = parts.join(', ');
                        } else {
                          // 전체 선택인 경우
                          final inputCount = widget.inputLabels?.length ?? 1;
                          if (inputCount > 1) {
                            final values = <String>[];
                            for (int i = 0; i < inputCount; i++) {
                              final label = widget.inputLabels![i];
                              final value = _measurementControllers[i].text;
                              values.add('$label: ${value}cm');
                            }
                            measurements = values.join(', ');
                          } else {
                            measurements = '${_measurementControllers[0].text}cm';
                          }
                        }
                        
                        // 고유 ID 생성
                        final itemId = '${widget.repairPart}_${DateTime.now().millisecondsSinceEpoch}';
                        
                        // 이미지 데이터를 명시적 필드 추출로 저장 (순환 참조 완전 차단)
                        final List<Map<String, dynamic>> imageDataCopy = [];
                        if (widget.imagesWithPins != null) {
                          for (var img in widget.imagesWithPins!) {
                            final imagePath = img['imagePath'] as String;
                            final pinsData = img['pins'] as List?;
                            
                            // pins를 완전히 새로운 List로 생성
                            final pins = <Map<String, dynamic>>[];
                            if (pinsData != null) {
                              for (var pin in pinsData) {
                                if (pin is Map) {
                                  // 각 필드를 primitive 값으로 추출
                                  pins.add({
                                    'id': pin['id']?.toString() ?? '',
                                    'relative_x': (pin['relative_x'] as num?)?.toDouble() ?? 0.5,
                                    'relative_y': (pin['relative_y'] as num?)?.toDouble() ?? 0.5,
                                    'memo': pin['memo']?.toString() ?? '',
                                    'created_at': pin['created_at']?.toString() ?? DateTime.now().toIso8601String(),
                                    'updated_at': pin['updated_at']?.toString() ?? DateTime.now().toIso8601String(),
                                  });
                                }
                              }
                            }
                            
                            imageDataCopy.add({
                              'imagePath': imagePath,
                              'pins': pins,
                            });
                          }
                        }
                        
                        debugPrint('📸 이미지 데이터 복사 완료: ${imageDataCopy.length}장');
                        
                        final repairItem = {
                          'id': itemId,
                          'repairPart': widget.repairPart,
                          'priceRange': widget.price != null 
                            ? '${widget.price.toString().replaceAllMapped(
                                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                (Match m) => '${m[1]},',
                              )}원'
                            : widget.priceRange ?? '가격 미정',
                          'price': widget.price,
                          'scope': _selectedScope,
                          'measurement': measurements,
                          'selectedParts': _selectedSubParts.map((p) => p['name']).toList(),
                          'detailedMeasurements': detailedMeasurements,
                          // 이미지 데이터 복사본 저장 (순환 참조 없음)
                          'itemImages': imageDataCopy,
                        };
                        
                        // 현재 Provider의 항목을 가져와서 새 항목 추가 (중복 방지)
                        final currentItems = ref.read(repairItemsProvider);
                        
                        debugPrint('🔍 현재 항목 수: ${currentItems.length}');
                        
                        // 이미 같은 항목이 있는지 확인 (repairPart로 체크)
                        final existingIndex = currentItems.indexWhere(
                          (item) => item['repairPart'] == repairItem['repairPart'] &&
                                    item['measurement'] == repairItem['measurement']
                        );
                        
                        List<Map<String, dynamic>> allItems;
                        if (existingIndex >= 0) {
                          // 이미 존재하면 교체
                          allItems = List.from(currentItems);
                          allItems[existingIndex] = repairItem;
                          debugPrint('🔄 기존 항목 교체: index $existingIndex');
                        } else {
                          // 새 항목 추가
                          allItems = [...currentItems, repairItem];
                          debugPrint('➕ 새 항목 추가');
                        }
                        
                        debugPrint('📝 수치 입력 완료! 항목 수: ${allItems.length}');
                        
                        try {
                          // Provider에 저장 (JSON 깊은 복사 적용)
                          ref.read(repairItemsProvider.notifier).setItems(allItems);
                          debugPrint('✅ Provider 저장 성공');
                        } catch (e, stackTrace) {
                          debugPrint('❌ Provider 저장 실패: $e');
                          debugPrint('❌ Stack: $stackTrace');
                          
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('데이터 저장 실패: $e'),
                                backgroundColor: Colors.red,
                                duration: const Duration(seconds: 5),
                              ),
                            );
                          }
                          return;
                        }
                        
                        debugPrint('🔄 등록 확인 페이지로 이동 중...');
                        
                        // RepairConfirmationPage로 직접 이동
                        if (mounted) {
                          context.push('/repair-confirmation', extra: {
                            'repairItems': allItems,
                            'imageUrls': widget.imageUrls,
                          },);
                        } else {
                          debugPrint('⚠️ mounted가 false입니다!');
                        }
                      },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: !_allFieldsFilled 
                        ? Colors.grey.shade300 
                        : const Color(0xFF00C896),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                    minimumSize: const Size(double.infinity, 54),
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
          ),
        ],
      ),
    );
  }

  // 세부 부위별 입력 필드 생성
  List<Widget> _buildSubPartInputFields() {
    final widgets = <Widget>[];
    final inputCountPerPart = widget.inputLabels?.length ?? 1;
    
    for (int partIndex = 0; partIndex < _selectedSubParts.length; partIndex++) {
      final part = _selectedSubParts[partIndex];
      final partName = part['name'] as String;
      
      // 부위명 헤더
      widgets.add(
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF00C896).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.location_on,
                size: 16,
                color: Color(0xFF00C896),
              ),
              const SizedBox(width: 8),
              Text(
                partName,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF00C896),
                ),
              ),
            ],
          ),
        ),
      );
      widgets.add(const SizedBox(height: 12));
      
      // 해당 부위의 입력 필드들
      for (int inputIndex = 0; inputIndex < inputCountPerPart; inputIndex++) {
        final controllerIndex = partIndex * inputCountPerPart + inputIndex;
        final label = widget.inputLabels != null && inputIndex < widget.inputLabels!.length
            ? widget.inputLabels![inputIndex]
            : '치수';
        
        widgets.add(_buildInputField(
          controller: _measurementControllers[controllerIndex],
          label: inputCountPerPart > 1 ? label : null,
          hint: '(예) -3',
        ),);
        widgets.add(const SizedBox(height: 12));
      }
      
      // 부위 간 구분선
      if (partIndex < _selectedSubParts.length - 1) {
        widgets.add(Divider(color: Colors.grey.shade200, height: 24));
      }
    }
    
    return widgets;
  }
  
  // 기본 입력 필드 생성 (전체 선택)
  List<Widget> _buildDefaultInputFields() {
    final widgets = <Widget>[];
    final inputCount = widget.inputLabels?.length ?? 1;
    
    for (int index = 0; index < inputCount; index++) {
      final label = widget.inputLabels != null && index < widget.inputLabels!.length
          ? widget.inputLabels![index]
          : null;
      
      widgets.add(_buildInputField(
        controller: _measurementControllers[index],
        label: inputCount > 1 ? label : null,
        hint: '(예) -3',
      ),);
      widgets.add(const SizedBox(height: 12));
    }
    
    return widgets;
  }
  
  // 입력 필드 위젯 생성
  Widget _buildInputField({
    required TextEditingController controller,
    required String hint, String? label,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
        ],
        TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(
            decimal: true,
            signed: true,
          ),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^-?\d*\.?\d*')),
          ],
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: Colors.grey.shade400,
            ),
            suffixText: 'cm',
            suffixStyle: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
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
      ],
    );
  }

  Widget _buildScopeOption(String option) {
    final isSelected = _selectedScope == option;
    
    return InkWell(
      onTap: () async {
        setState(() {
          _selectedScope = option;
        });
        
        // "특정 부위 선택" 선택 시 바텀시트 표시
        if (option == '특정 부위 선택' && widget.hasAdvancedOptions == true) {
          await _showSubPartsSelectionSheet();
        }
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

