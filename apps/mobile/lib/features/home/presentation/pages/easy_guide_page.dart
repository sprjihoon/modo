import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/content_service.dart';

class _NonRepairableItem {
  final IconData icon;
  final String title;
  final String desc;
  const _NonRepairableItem(this.icon, this.title, this.desc);
}

/// 쉬운가이드(이용 방법) 페이지
/// app_contents.easy_guide.metadata.steps 에서 단계 데이터를 동적으로 로드합니다.
/// 웹(`/guide/easy`) 및 admin(앱 컨텐츠 관리)와 동일한 데이터 소스를 사용합니다.
class EasyGuidePage extends StatefulWidget {
  const EasyGuidePage({super.key});

  @override
  State<EasyGuidePage> createState() => _EasyGuidePageState();
}

class _EasyGuidePageState extends State<EasyGuidePage> {
  static const Color _brand = Color(0xFF00C896);

  /// 웹의 FALLBACK_STEPS와 동일 (DB 비어있을 때 표시)
  static const List<EasyGuideStep> _fallbackSteps = [
    EasyGuideStep(
      emoji: '📦',
      title: '수선 접수',
      desc: '앱에서 의류 종류와 수선 항목을 선택하고 수거 신청합니다.',
    ),
    EasyGuideStep(
      emoji: '🚚',
      title: '택배 수거',
      desc: '지정하신 날짜에 택배 기사님이 의류를 수거합니다.',
    ),
    EasyGuideStep(
      emoji: '✂️',
      title: '수선 작업',
      desc: '전문 수선사가 꼼꼼하게 수선합니다.',
    ),
    EasyGuideStep(
      emoji: '📬',
      title: '배송 완료',
      desc: '수선이 완료된 의류를 택배로 배송해드립니다.',
    ),
  ];

  static const List<_NonRepairableItem> _nonRepairableItems = [
    _NonRepairableItem(
      Icons.checkroom,
      '의류',
      '니트, 밍크, 특수복(등산복, 스키복, 속옷, 수영복, 한복, 의사가운, 열처리복 등)',
    ),
    _NonRepairableItem(
      Icons.local_mall,
      '잡화류',
      '넥타이, 머플러, 모자, 지갑 등',
    ),
    _NonRepairableItem(
      Icons.directions_walk,
      '신발류',
      '운동화, 구두, 천연 가죽 신발 등',
    ),
    _NonRepairableItem(
      Icons.bed,
      '침구, 리빙류',
      '이불, 러그, 커튼 등',
    ),
    _NonRepairableItem(
      Icons.luggage,
      '가방류',
      '가죽 가방, 세무(스웨이드) 가방, 에코백 등',
    ),
    _NonRepairableItem(
      Icons.open_in_full,
      '늘림 수선',
      '기장/길이 늘림, 전체폼 늘림, 팔통 늘림 등',
    ),
  ];

  final ContentService _contentService = ContentService();
  bool _isLoading = true;
  String _intro = '';
  List<EasyGuideStep> _steps = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final content = await _contentService.getContent('easy_guide');
    final steps = await _contentService.getEasyGuideSteps();

    if (!mounted) return;
    setState(() {
      _intro = content?.text.trim() ?? '';
      _steps = steps.isNotEmpty ? steps : _fallbackSteps;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const ModoAppBar(
        title: Text(
          '이용 방법',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _brand))
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_intro.isNotEmpty) ...[
                  Text(
                    _intro,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                ..._steps.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final step = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _buildStepCard(idx + 1, step),
                  );
                }),
                const SizedBox(height: 8),
                _buildNonRepairableSection(),
              ],
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: () => context.push('/create-order'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _brand,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '지금 수거 신청하기',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(Icons.chevron_right, size: 18),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNonRepairableSection() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F7),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Text(
              '수선 불가 품목',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Color(0xFF333333),
              ),
            ),
          ),
          ..._nonRepairableItems.map(
            (item) => Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildProhibitedIcon(item.icon),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF333333),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.desc,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[500],
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 2),
        ],
      ),
    );
  }

  Widget _buildProhibitedIcon(IconData icon) {
    return SizedBox(
      width: 44,
      height: 44,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFEEEEEE)),
            ),
            child: Icon(icon, size: 22, color: Colors.grey[400]),
          ),
          Transform.rotate(
            angle: -0.7854,
            child: Container(
              width: 52,
              height: 2.5,
              decoration: BoxDecoration(
                color: Colors.orange[600],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepCard(int stepNumber, EasyGuideStep step) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFF1F1F1)),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _brand.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              step.emoji,
              style: const TextStyle(fontSize: 18),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'STEP $stepNumber',
                  style: const TextStyle(
                    fontSize: 11,
                    color: _brand,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  step.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                  ),
                ),
                if (step.desc.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    step.desc,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                      height: 1.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
