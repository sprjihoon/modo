import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:http/http.dart' as http;

/// Daum 우편번호 서비스 웹뷰 위젯
class DaumPostcodeWidget extends StatefulWidget {
  const DaumPostcodeWidget({super.key});

  @override
  State<DaumPostcodeWidget> createState() => _DaumPostcodeWidgetState();
}

class _DaumPostcodeWidgetState extends State<DaumPostcodeWidget> {
  WebViewController? _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    // WebView 방식은 비활성화 - 카카오 API 방식만 사용
    // _initWebView()를 호출하지 않음
  }

  void _initWebView() {
    debugPrint('🔧 _initWebView 호출됨');

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..enableZoom(false)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            debugPrint('📄 페이지 로드 시작: $url');
          },
          onPageFinished: (url) {
            setState(() => _isLoading = false);
            debugPrint('✅ 페이지 로드 완료: $url');

            // 로드 완료 후 JavaScript 테스트 실행
            _controller?.runJavaScript('''
              console.log('✅ WebView 로드 완료 - JavaScript 실행 가능');
              
              // Daum Postcode 라이브러리 확인
              if (typeof daum !== 'undefined') {
                console.log('✅ Daum Postcode 라이브러리 로드됨');
              } else {
                console.error('❌ Daum Postcode 라이브러리 없음!');
              }
              
              // AddressChannel 확인
              if (window.AddressChannel) {
                console.log('✅ AddressChannel 등록됨');
              } else {
                console.log('⚠️ AddressChannel 없음 - URL 방식 사용 예정');
              }
            ''');
          },
          onWebResourceError: (error) {
            debugPrint('WebView 오류: ${error.description}');
          },
          onNavigationRequest: (NavigationRequest request) {
            debugPrint('네비게이션 요청: ${request.url}');

            // Flutter 스키마로 데이터 전달 받기
            if (request.url.startsWith('flutter://address?')) {
              debugPrint('');
              debugPrint('====================================');
              debugPrint('🔗 Flutter URL 스키마 감지!');
              debugPrint('====================================');
              debugPrint('📥 URL: ${request.url}');

              try {
                final uri = Uri.parse(request.url);
                final zonecode = uri.queryParameters['zonecode'] ?? '';
                final address = uri.queryParameters['address'] ?? '';
                final addressType = uri.queryParameters['addressType'] ?? '';

                debugPrint('');
                debugPrint('✅ 주소 데이터 수신 성공!');
                debugPrint('  📮 우편번호: $zonecode');
                debugPrint('  🏠 주소: $address');
                debugPrint('  📝 타입: $addressType');
                debugPrint('');

                if (zonecode.isNotEmpty && address.isNotEmpty) {
                  debugPrint('🎉 다이얼로그 닫기 - 주소 반환');
                  debugPrint('====================================');
                  Navigator.of(context).pop({
                    'zonecode': zonecode,
                    'address': address,
                    'addressType': addressType,
                  });
                } else {
                  debugPrint('⚠️ 우편번호 또는 주소가 비어있음');
                  debugPrint('====================================');
                }
              } catch (e) {
                debugPrint('❌ 주소 파싱 오류: $e');
                debugPrint('====================================');
              }
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..addJavaScriptChannel(
        'AddressChannel',
        onMessageReceived: (JavaScriptMessage message) {
          debugPrint('');
          debugPrint('====================================');
          debugPrint('📨 JavaScript Channel 메시지 수신!');
          debugPrint('====================================');
          debugPrint('📥 메시지 내용: ${message.message}');

          try {
            final data = jsonDecode(message.message) as Map<String, dynamic>;
            final zonecode = data['zonecode'] as String? ?? '';
            final address = data['address'] as String? ?? '';
            final addressType = data['addressType'] as String? ?? '';

            debugPrint('');
            debugPrint('✅ 주소 파싱 성공!');
            debugPrint('  📮 우편번호: $zonecode');
            debugPrint('  🏠 주소: $address');
            debugPrint('  📝 타입: $addressType');
            debugPrint('');

            if (zonecode.isNotEmpty && address.isNotEmpty) {
              debugPrint('🎉 다이얼로그 닫기 - 주소 반환');
              debugPrint('====================================');
              Navigator.of(context).pop({
                'zonecode': zonecode,
                'address': address,
                'addressType': addressType,
              });
            } else {
              debugPrint('⚠️ 우편번호 또는 주소가 비어있음');
              debugPrint('====================================');
            }
          } catch (e) {
            debugPrint('❌ 주소 파싱 오류: $e');
            debugPrint('====================================');
          }
        },
      )
      ..loadHtmlString(_getDaumPostcodeHtml());

    debugPrint('🚀 WebView 초기화 완료');
  }

  String _getDaumPostcodeHtml() {
    return '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>주소 검색</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
            height: 100%; 
            width: 100%;
        }
        body {
            display: flex;
            flex-direction: column;
        }
        #layer { 
            flex: 1;
            width: 100%; 
            position: relative;
        }
        /* Daum Postcode iframe을 감지하고 클릭 이벤트 캡처 */
        #layer iframe {
            width: 100% !important;
            height: 100% !important;
            border: none;
        }
    </style>
</head>
<body>
    <div id="layer"></div>
    
    <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    <script>
        // 주소 전송 함수
        function sendAddressToFlutter(zonecode, address, addressType) {
            console.log('====================');
            console.log('📤 Flutter로 주소 전송 시작');
            console.log('  📮 우편번호:', zonecode);
            console.log('  🏠 주소:', address);
            console.log('  📝 타입:', addressType);
            console.log('====================');
            
            // 두 가지 방식 모두 시도
            try {
                // 방법 1: JavaScript Channel
                if (window.AddressChannel) {
                    console.log('✅ AddressChannel 사용');
                    var result = JSON.stringify({
                        zonecode: zonecode,
                        address: address,
                        addressType: addressType
                    });
                    window.AddressChannel.postMessage(result);
                    console.log('✅ Channel 전송 완료');
                } else {
                    console.log('⚠️ AddressChannel 없음');
                }
                
                // 방법 2: URL 스키마 (항상 시도)
                var url = 'flutter://address?zonecode=' + encodeURIComponent(zonecode) + 
                          '&address=' + encodeURIComponent(address) + 
                          '&addressType=' + encodeURIComponent(addressType);
                console.log('🔗 URL 스키마 사용:', url);
                window.location.href = url;
                console.log('✅ URL 전송 완료');
            } catch (e) {
                console.error('전송 오류:', e);
            }
        }
        
        // 페이지 로드 시 Daum Postcode 초기화
        // 즉시 실행 (DOMContentLoaded 대신)
        (function() {
            // Postcode 객체 생성 및 embed
            var element_layer = document.getElementById('layer');
            
            if (!element_layer) {
                console.error('layer 엘리먼트를 찾을 수 없습니다');
                return;
            }
            
            if (typeof daum === 'undefined') {
                console.error('Daum 라이브러리가 로드되지 않았습니다');
                return;
            }
            
            new daum.Postcode({
                oncomplete: function(data) {
                    // Flutter로 전송
                    sendAddressToFlutter(data.zonecode, data.address, data.addressType);
                },
                onresize: function(size) {
                    // 크기 변경
                },
                onclose: function() {
                    // 창 닫힘
                },
                width: '100%',
                height: '100%'
            }).embed(element_layer);
        })();
    </script>
</body>
</html>
    ''';
  }

  @override
  Widget build(BuildContext context) {
    // 카카오 API 방식 사용 (안정적)
    return _buildSimpleAddressInput(context);

    /* WebView 방식은 iOS 시뮬레이터에서 JavaScript 실행 문제가 있어 비활성화
    debugPrint('🏗️ DaumPostcodeWidget build - kIsWeb: $kIsWeb, _controller: ${_controller != null}');
    
    // WebView 방식 사용 (Daum 우편번호 서비스 - 가장 정확함)
    if (kIsWeb) {
      debugPrint('🌐 웹 환경 감지 - 간단한 검색 UI 사용');
      return _buildSimpleAddressInput(context);
    }
    
    if (_controller == null) {
      debugPrint('⚠️ WebView Controller가 null입니다!');
      return const Center(
        child: CircularProgressIndicator(),
      );
    }
    
    debugPrint('✅ WebView 렌더링');
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          // 헤더
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '주소 검색',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
          
          // 웹뷰
          Expanded(
            child: _controller == null
                ? const Center(child: Text('WebView 초기화 중...'))
                : Stack(
                    children: [
                      WebViewWidget(controller: _controller!),
                      if (_isLoading)
                        const Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Color(0xFF00C896),
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
    */
  }

  /// 간단한 주소 검색 UI (샘플 주소 제공)
  Widget _buildSimpleAddressInput(BuildContext context) {
    return _KakaoAddressSearchWeb(
      onAddressSelected: (result) {
        Navigator.of(context).pop(result);
      },
    );
  }
}

/// 웹용 카카오 주소 검색 위젯
class _KakaoAddressSearchWeb extends StatefulWidget {
  final Function(Map<String, String>) onAddressSelected;

  const _KakaoAddressSearchWeb({required this.onAddressSelected});

  @override
  State<_KakaoAddressSearchWeb> createState() => _KakaoAddressSearchWebState();
}

class _KakaoAddressSearchWebState extends State<_KakaoAddressSearchWeb> {
  final searchController = TextEditingController();
  List<Map<String, String>> searchResults = [];
  bool isSearching = false;

  // 카카오 REST API 키 - .env 파일의 KAKAO_REST_API_KEY에서 로드
  static String get kakaoApiKey => dotenv.env['KAKAO_REST_API_KEY'] ?? '';

  Future<void> _searchAddress(String query) async {
    if (query.isEmpty) {
      setState(() {
        searchResults = [];
      });
      return;
    }

    setState(() {
      isSearching = true;
    });

    // API 키가 설정되어 있는지 확인 (실 서비스에서는 반드시 설정되어 있어야 함)
    final hasApiKey = kakaoApiKey.isNotEmpty;
    if (!hasApiKey) {
      debugPrint('❌ 카카오 API 키가 비어 있습니다.');
      setState(() {
        isSearching = false;
      });
      return;
    }

    debugPrint('🔍 주소 검색 시작: $query');

    try {
      // 주소 검색 API와 키워드 검색 API를 병렬로 호출
      final addressUrl = Uri.parse(
        'https://dapi.kakao.com/v2/local/search/address.json?query=${Uri.encodeComponent(query)}&size=10',
      );
      final keywordUrl = Uri.parse(
        'https://dapi.kakao.com/v2/local/search/keyword.json?query=${Uri.encodeComponent(query)}&size=10',
      );

      final headers = {'Authorization': 'KakaoAK $kakaoApiKey'};

      // 병렬 호출
      final responses = await Future.wait([
        http.get(addressUrl, headers: headers),
        http.get(keywordUrl, headers: headers),
      ]);

      final addressResponse = responses[0];
      final keywordResponse = responses[1];

      debugPrint('📥 주소 검색 응답: ${addressResponse.statusCode}');
      debugPrint('📥 키워드 검색 응답: ${keywordResponse.statusCode}');

      final List<Map<String, String>> combinedResults = [];
      final Set<String> addedAddresses = {}; // 중복 제거용

      // 1. 주소 검색 API 결과 처리 (정확한 주소)
      if (addressResponse.statusCode == 200) {
        final data = jsonDecode(addressResponse.body);
        final documents = data['documents'] as List;
        debugPrint('✅ 주소 검색 결과: ${documents.length}건');

        for (final doc in documents) {
          final result = _parseAddressDocument(doc);
          if (result != null && !addedAddresses.contains(result['address'])) {
            combinedResults.add(result);
            addedAddresses.add(result['address']!);
          }
        }
      }

      // 2. 키워드 검색 API 결과 처리 (장소/건물명 검색)
      if (keywordResponse.statusCode == 200) {
        final data = jsonDecode(keywordResponse.body);
        final documents = data['documents'] as List;
        debugPrint('✅ 키워드 검색 결과: ${documents.length}건');

        for (final doc in documents) {
          final result = _parseKeywordDocument(doc);
          if (result != null && !addedAddresses.contains(result['address'])) {
            combinedResults.add(result);
            addedAddresses.add(result['address']!);
          }
        }
      }

      debugPrint('📊 총 검색 결과: ${combinedResults.length}건');

      setState(() {
        searchResults = combinedResults;
        isSearching = false;
      });
    } catch (e) {
      debugPrint('❌ 주소 검색 오류: $e');
      setState(() {
        searchResults = [];
        isSearching = false;
      });
    }
  }

  /// 주소 검색 API 결과 파싱
  Map<String, String>? _parseAddressDocument(Map<String, dynamic> doc) {
    final roadAddress = doc['road_address'];
    final address = doc['address'];

    String zipcode = '';
    String addressName = '';
    String detail = '';

    if (roadAddress != null) {
      zipcode = (roadAddress['zone_no'] ?? '') as String;
      addressName = (roadAddress['address_name'] ?? '') as String;
      detail = (roadAddress['building_name'] ?? '') as String;
    } else if (address != null) {
      zipcode = (address['zone_no'] ?? address['zip_no'] ?? '') as String;
      addressName = (address['address_name'] ?? '') as String;
    }

    if (addressName.isEmpty) {
      return null;
    }

    // 우편번호가 없으면 선택 시 별도 조회 (keyword 타입으로 처리)
    if (zipcode.trim().isEmpty) {
      return {
        'zipcode': '',
        'address': addressName,
        'detail': detail,
        'type': 'keyword',
      };
    }

    return {
      'zipcode': zipcode,
      'address': addressName,
      'detail': detail,
      'type': 'address', // 주소 검색 결과 표시용
    };
  }

  /// 키워드 검색 API 결과 파싱
  Map<String, String>? _parseKeywordDocument(Map<String, dynamic> doc) {
    final roadAddressName = doc['road_address_name'] as String? ?? '';
    final addressName = doc['address_name'] as String? ?? '';
    final placeName = doc['place_name'] as String? ?? '';
    final categoryName = doc['category_name'] as String? ?? '';

    // 도로명 주소 우선, 없으면 지번 주소 사용
    final finalAddress =
        roadAddressName.isNotEmpty ? roadAddressName : addressName;

    if (finalAddress.isEmpty) {
      return null;
    }

    // 키워드 검색은 우편번호가 없으므로, 주소로 다시 검색하여 우편번호 획득 필요
    // 일단 빈 우편번호로 표시하고, 선택 시 우편번호 조회
    return {
      'zipcode': '', // 선택 시 조회
      'address': finalAddress,
      'detail': placeName,
      'placeName': placeName,
      'category': categoryName,
      'type': 'keyword', // 키워드 검색 결과 표시용
    };
  }

  /// 키워드 검색 결과 선택 시 우편번호 조회
  Future<String> _fetchZipcodeForAddress(String address) async {
    try {
      final url = Uri.parse(
        'https://dapi.kakao.com/v2/local/search/address.json?query=${Uri.encodeComponent(address)}&size=1',
      );

      final response = await http.get(
        url,
        headers: {'Authorization': 'KakaoAK $kakaoApiKey'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final documents = data['documents'] as List;

        if (documents.isNotEmpty) {
          final doc = documents.first;
          final roadAddress = doc['road_address'];
          final addr = doc['address'];

          if (roadAddress != null) {
            return (roadAddress['zone_no'] ?? '') as String;
          } else if (addr != null) {
            return (addr['zone_no'] ?? addr['zip_no'] ?? '') as String;
          }
        }
      }
    } catch (e) {
      debugPrint('❌ 우편번호 조회 실패: $e');
    }
    return '';
  }

  /// 주소 선택 처리
  Future<void> _onAddressSelected(Map<String, String> addr) async {
    String zipcode = addr['zipcode'] ?? '';
    final address = addr['address'] ?? '';
    final isKeywordResult = addr['type'] == 'keyword';

    // 키워드 검색 결과이고 우편번호가 없으면 조회
    if (isKeywordResult && zipcode.isEmpty) {
      // 로딩 표시
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(
                    valueColor:
                        AlwaysStoppedAnimation<Color>(Color(0xFF00C896)),
                  ),
                  SizedBox(height: 16),
                  Text('우편번호 조회 중...'),
                ],
              ),
            ),
          ),
        ),
      );

      zipcode = await _fetchZipcodeForAddress(address);

      if (mounted) {
        Navigator.of(context).pop(); // 로딩 다이얼로그 닫기
      }

      // 우편번호를 찾지 못한 경우
      if (zipcode.isEmpty) {
        if (mounted) {
          final shouldProceed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Text('우편번호 확인'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('이 주소의 우편번호를 자동으로 찾을 수 없습니다.'),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      address,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    '주소를 선택하고 우편번호를 직접 입력하시겠습니까?',
                    style: TextStyle(fontSize: 13),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('취소'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00C896),
                  ),
                  child: const Text('선택'),
                ),
              ],
            ),
          );

          if (shouldProceed != true) {
            return;
          }
        }
      }
    }

    widget.onAddressSelected({
      'zonecode': zipcode,
      'address': address,
      'addressType': 'R',
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          // 헤더
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: searchController,
                    decoration: InputDecoration(
                      hintText: '예) 판교역로 166, 분당 주공, 백현동 532',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.search),
                        onPressed: () => _searchAddress(searchController.text),
                      ),
                    ),
                    onChanged: _searchAddress,
                    onSubmitted: _searchAddress,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          // 검색 결과
          Expanded(
            child: isSearching
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor:
                          AlwaysStoppedAnimation<Color>(Color(0xFF00C896)),
                    ),
                  )
                : searchResults.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                searchController.text.isEmpty
                                    ? Icons.search
                                    : Icons.location_searching,
                                size: 64,
                                color: searchController.text.isEmpty
                                    ? Colors.grey.shade300
                                    : Colors.orange.shade300,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                searchController.text.isEmpty
                                    ? '주소를 검색해주세요'
                                    : '검색 결과가 없습니다',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                              if (searchController.text.isEmpty) ...[
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    children: [
                                      Text(
                                        '💡 이렇게 검색해보세요',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey.shade700,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        '• 도로명 + 건물번호: 판교역로 166\n'
                                        '• 건물/장소명: 카카오판교아지트\n'
                                        '• 동/읍/면 + 번지: 백현동 532\n'
                                        '• 아파트명: 분당 주공아파트',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey.shade600,
                                          height: 1.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              if (searchController.text.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(
                                  '다른 검색어로 시도해보세요',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        itemCount: searchResults.length,
                        separatorBuilder: (context, index) => Divider(
                          height: 1,
                          color: Colors.grey.shade200,
                        ),
                        itemBuilder: (context, index) {
                          final addr = searchResults[index];
                          final isKeywordResult = addr['type'] == 'keyword';
                          final hasZipcode =
                              addr['zipcode']?.isNotEmpty == true;

                          return ListTile(
                            title: Row(
                              children: [
                                if (hasZipcode)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.blue.shade50,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      addr['zipcode']!,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.blue.shade700,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.shade50,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '장소',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.orange.shade700,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    isKeywordResult
                                        ? (addr['category'] ?? '')
                                        : '도로명',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade600,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                // 장소명이 있으면 먼저 표시
                                if (isKeywordResult &&
                                    addr['placeName']?.isNotEmpty == true) ...[
                                  Text(
                                    addr['placeName']!,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                ],
                                Text(
                                  addr['address']!,
                                  style: TextStyle(
                                    fontSize: isKeywordResult ? 13 : 14,
                                    fontWeight: isKeywordResult
                                        ? FontWeight.normal
                                        : FontWeight.w500,
                                    color: isKeywordResult
                                        ? Colors.grey.shade700
                                        : Colors.black87,
                                  ),
                                ),
                                if (!isKeywordResult &&
                                    addr['detail']?.isNotEmpty == true) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    addr['detail']!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            onTap: () => _onAddressSelected(addr),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
