import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  // 카카오 REST API 키
  // 발급 방법: https://developers.kakao.com/ → 내 애플리케이션 → 앱 추가 → REST API 키 복사
  // .env 파일에 KAKAO_REST_API_KEY 추가 권장
  static const String kakaoApiKey = '009546eb1aca545ba309aabc78010bf7';

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

    // 카카오 주소 검색 API 호출
    try {
      final url = Uri.parse(
        'https://dapi.kakao.com/v2/local/search/address.json?query=${Uri.encodeComponent(query)}&size=15',
      );

      debugPrint('🔍 주소 검색 API 호출: $query');
      debugPrint('📡 URL: $url');
      debugPrint('🔑 API Key: ${kakaoApiKey.substring(0, 10)}...');

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'KakaoAK $kakaoApiKey',
        },
      );

      debugPrint('📥 응답 상태: ${response.statusCode}');
      debugPrint(
          '📥 응답 본문: ${response.body.length > 500 ? response.body.substring(0, 500) : response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final documents = data['documents'] as List;

        debugPrint('✅ 검색 결과: ${documents.length}건');

        setState(() {
          searchResults = documents
              .map<Map<String, String>>((doc) {
                final roadAddress = doc['road_address'];
                final address = doc['address'];

                // 우편번호 추출 (도로명 주소 우선, 지번 주소도 지원)
                String zipcode = '';
                String addressName = '';
                String detail = '';

                if (roadAddress != null) {
                  zipcode = (roadAddress['zone_no'] ?? '') as String;
                  addressName = (roadAddress['address_name'] ?? '') as String;
                  detail = (roadAddress['building_name'] ?? '') as String;
                } else if (address != null) {
                  // 지번 주소에서도 우편번호 가져오기 (zone_no 우선, 없으면 zip_no)
                  zipcode =
                      (address['zone_no'] ?? address['zip_no'] ?? '') as String;
                  addressName = (address['address_name'] ?? '') as String;
                }

                // 디버깅 로그
                if (zipcode.isEmpty || zipcode.trim().isEmpty) {
                  debugPrint('⚠️ 우편번호를 찾을 수 없습니다:');
                  debugPrint('  roadAddress: $roadAddress');
                  debugPrint('  address: $address');
                } else {
                  debugPrint('✅ 우편번호 추출 성공: $zipcode ($addressName)');
                }

                return {
                  'zipcode': zipcode,
                  'address': addressName,
                  'detail': detail,
                };
              })
              .where((item) =>
                      item['address']!.isNotEmpty &&
                      item['zipcode']!.isNotEmpty &&
                      item['zipcode']!.trim().isNotEmpty // 우편번호 있는 것만 표시
                  )
              .toList();
          isSearching = false;
        });
      } else {
        // API 응답 실패
        debugPrint('❌ API 응답 실패: ${response.statusCode}');
        debugPrint('❌ 에러 내용: ${response.body}');
        setState(() {
          searchResults = [];
          isSearching = false;
        });
      }
    } catch (e) {
      debugPrint('❌ 주소 검색 오류: $e');
      setState(() {
        searchResults = [];
        isSearching = false;
      });
    }
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
            child: searchResults.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            searchController.text.isEmpty
                                ? Icons.search
                                : Icons.warning_amber_rounded,
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
                          if (searchController.text.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              '💡 건물 번호까지 입력해주세요',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '예) 판교역로 166, 테헤란로 152',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '📍 도로명만 입력하면 우편번호가 없을 수 있습니다',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.blue.shade700,
                                ),
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
                      return ListTile(
                        title: Row(
                          children: [
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
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '도로명',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(
                              addr['address']!,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Colors.black87,
                              ),
                            ),
                            if (addr['detail']!.isNotEmpty) ...[
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
                        onTap: () {
                          widget.onAddressSelected({
                            'zonecode': addr['zipcode']!,
                            'address': addr['address']!,
                            'addressType': 'R',
                          });
                        },
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
