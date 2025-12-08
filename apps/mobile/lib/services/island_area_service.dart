/// 도서산간지역 확인 서비스
/// 데이터 출처: 우정사업본부 2024.11.10 기준 주소별집배코드 데이터
class IslandAreaService {
  // 싱글톤 패턴
  static final IslandAreaService _instance = IslandAreaService._internal();
  factory IslandAreaService() => _instance;
  IslandAreaService._internal();

  /// 도서산간 추가 배송비 (왕복 기준)
  static const int additionalFee = 1000;

  /// 도서산간지역 우편번호 목록 (231개)
  /// 데이터 기준일: 2024.11.10
  static const Set<String> _islandZipcodes = {
    // 경기도 안산시 단원구 (풍도, 육도 등 섬 지역)
    '15654',
    
    // 경기도 옹진군
    '18557',
    
    // 인천광역시 강화군, 옹진군 (섬 지역)
    '23008', '23010', '23100', '23101', '23102', '23103', '23104', '23105',
    '23106', '23107', '23108', '23109', '23110', '23111', '23112', '23113',
    '23114', '23115', '23116', '23117', '23118', '23119', '23120', '23121',
    '23122', '23123', '23124', '23125', '23126', '23127', '23128', '23129',
    '23130', '23131', '23132', '23133', '23134', '23135', '23136',
    
    // 충청남도 (태안, 서산, 보령 등 섬 지역)
    '31700', '31708', '31724', '31913', '31926', '31933',
    '32030', '32133', '32207',
    '33411', '33663',
    
    // 충청북도 (도서지역)
    '36900', '36901', '36902', '36903', '36904',
    
    // 강원도 (도서지역)
    '38010', '38019',
    
    // 경상북도 울릉군
    '40200', '40201', '40202', '40203', '40204', '40205', '40206', '40207',
    '40208', '40209', '40210', '40211', '40212', '40213', '40214', '40215',
    '40216', '40217', '40218', '40219', '40220', '40221', '40222', '40223',
    '40224', '40225', '40226', '40227', '40228', '40229', '40230', '40231',
    '40232', '40233', '40234', '40235', '40236', '40237', '40238', '40239',
    '40240',
    
    // 경상남도 (통영, 거제, 사천 등 섬 지역)
    '51783', '51794',
    '52352', '52439', '52442', '52570', '52571',
    '52956', '52959',
    '53004', '53009', '53011', '53031', '53032', '53033',
    '53082', '53088', '53089', '53090', '53091', '53092', '53093', '53094',
    '53095', '53096', '53097', '53098', '53099', '53100', '53101', '53102',
    '53103', '53104', '53202', '53274', '53279', '53328', '53329',
    '54000',
    
    // 전라북도 (군산 등 섬 지역)
    '56347', '56348', '56349', '56418',
    '57068', '57069', '57313', '57393',
    
    // 전라남도 (신안군, 진도군, 완도군, 여수, 고흥 등 섬 지역)
    '58618', '58760', '58761', '58810', '58816',
    '58843', '58844', '58845', '58846', '58847', '58848', '58849', '58850',
    '58851', '58852', '58853', '58854', '58855', '58856', '58857', '58858',
    '58859', '58860', '58861', '58862', '58863', '58864', '58865', '58866',
    '58911', '58930', '58953', '58954', '58955', '58956', '58957', '58958',
    '59137', '59138', '59139', '59140', '59141', '59142', '59143', '59144',
    '59149', '59150', '59151', '59153', '59154', '59155', '59156', '59157',
    '59158', '59159', '59160', '59161', '59162', '59163', '59164', '59165',
    '59166', '59170',
    '59602', '59650', '59747', '59766', '59777',
    '59781', '59782', '59783', '59784', '59785', '59786', '59787', '59788',
    '59789', '59790',
    
    // 제주특별자치도
    '63000', '63001', '63033', '63365', '63514', '63515',
  };

  /// 주어진 우편번호가 도서산간지역인지 확인
  /// [zipcode] 5자리 우편번호 (하이픈 포함/미포함 모두 가능)
  /// Returns: 도서산간지역이면 true, 아니면 false
  bool isIslandArea(String? zipcode) {
    if (zipcode == null || zipcode.isEmpty) return false;
    
    // 하이픈 제거 및 공백 제거
    final cleanZipcode = zipcode.replaceAll('-', '').trim();
    
    // 5자리가 아니면 false
    if (cleanZipcode.length != 5) return false;
    
    return _islandZipcodes.contains(cleanZipcode);
  }

  /// 도서산간지역 정보 조회
  /// Returns: 도서산간지역이면 지역 정보 Map, 아니면 null
  Map<String, dynamic>? getIslandAreaInfo(String? zipcode) {
    if (!isIslandArea(zipcode)) return null;
    
    final cleanZipcode = zipcode!.replaceAll('-', '').trim();
    
    // 우편번호 앞 2자리로 대략적인 지역 구분
    final prefix = cleanZipcode.substring(0, 2);
    
    String region;
    String estimatedDays;
    
    switch (prefix) {
      case '15':
      case '18':
        region = '경기도 섬 지역';
        estimatedDays = '2~4일 추가';
        break;
      case '23':
        region = '인천광역시 섬 지역 (강화군, 옹진군)';
        estimatedDays = '2~4일 추가';
        break;
      case '31':
      case '32':
      case '33':
        region = '충청남도 섬 지역';
        estimatedDays = '2~4일 추가';
        break;
      case '36':
        region = '충청북도 도서 지역';
        estimatedDays = '2~4일 추가';
        break;
      case '38':
        region = '강원도 도서 지역';
        estimatedDays = '2~4일 추가';
        break;
      case '40':
        region = '경상북도 울릉군';
        estimatedDays = '3~5일 추가';
        break;
      case '51':
      case '52':
      case '53':
      case '54':
        region = '경상남도 섬 지역 (통영, 거제, 사천 등)';
        estimatedDays = '2~4일 추가';
        break;
      case '56':
      case '57':
        region = '전라북도 섬 지역';
        estimatedDays = '2~4일 추가';
        break;
      case '58':
      case '59':
        region = '전라남도 섬 지역 (신안군, 진도군, 완도군 등)';
        estimatedDays = '2~5일 추가';
        break;
      case '63':
        region = '제주특별자치도';
        estimatedDays = '2~3일 추가';
        break;
      default:
        region = '도서산간 지역';
        estimatedDays = '2~4일 추가';
    }
    
    return {
      'zipcode': cleanZipcode,
      'region': region,
      'estimatedDays': estimatedDays,
      'isIsland': true,
    };
  }

  /// 도서산간 추가 배송비 계산
  /// 수거지 또는 배송지 중 하나라도 도서산간 지역이면 1,000원 추가
  /// [pickupZipcode] 수거지 우편번호
  /// [deliveryZipcode] 배송지 우편번호 (없으면 수거지와 동일하다고 간주)
  /// Returns: 추가 배송비 (원)
  int calculateAdditionalFee({
    String? pickupZipcode,
    String? deliveryZipcode,
  }) {
    // 수거지 또는 배송지 중 하나라도 도서산간이면 1,000원 추가
    final isPickupIsland = isIslandArea(pickupZipcode);
    final isDeliveryIsland = isIslandArea(deliveryZipcode ?? pickupZipcode);
    
    return (isPickupIsland || isDeliveryIsland) ? additionalFee : 0;
  }

  /// 전체 도서산간 우편번호 개수
  int get totalIslandZipcodes => _islandZipcodes.length;
}

