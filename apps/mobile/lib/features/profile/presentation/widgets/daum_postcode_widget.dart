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
    if (!kIsWeb) {
      _initWebView();
    }
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            setState(() => _isLoading = false);
          },
        ),
      )
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (JavaScriptMessage message) {
          // Daum 우편번호 서비스에서 주소 선택 시 호출됨
          try {
            final data = jsonDecode(message.message) as Map<String, dynamic>;
            Navigator.of(context).pop({
              'zonecode': data['zonecode'] as String,
              'address': data['address'] as String,
              'addressType': data['addressType'] as String,
            });
          } catch (e) {
            debugPrint('주소 파싱 오류: \$e');
          }
        },
      )
      ..loadHtmlString(_getDaumPostcodeHtml());
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
        * { margin: 0; padding: 0; }
        body { height: 100vh; }
        #layer { width: 100%; height: 100%; }
    </style>
    <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
</head>
<body>
    <div id="layer"></div>
    <script>
        new daum.Postcode({
            oncomplete: function(data) {
                // 주소 선택 완료 시 Flutter로 데이터 전달
                FlutterChannel.postMessage(JSON.stringify({
                    zonecode: data.zonecode,
                    address: data.address,
                    addressType: data.addressType
                }));
            },
            width: '100%',
            height: '100%'
        }).embed(document.getElementById('layer'));
    </script>
</body>
</html>
    ''';
  }

  @override
  Widget build(BuildContext context) {
    // 웹에서는 WebView를 사용할 수 없으므로 간단한 입력 폼 제공
    if (kIsWeb) {
      return _buildSimpleAddressInput(context);
    }
    
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
  }
  
  /// 웹용 카카오 주소 검색 (iframe 사용)
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
  
  // 카카오 REST API 키 (발급 필요: https://developers.kakao.com/)
  static const String kakaoApiKey = 'YOUR_KAKAO_REST_API_KEY';

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

    // 샘플 데이터 (테스트용)
    final sampleAddresses = [
      {'zipcode': '13529', 'address': '경기도 성남시 분당구 판교역로 166', 'detail': '(카카오 판교아지트)'},
      {'zipcode': '13529', 'address': '경기도 성남시 분당구 백현동 532', 'detail': ''},
      {'zipcode': '06234', 'address': '서울특별시 강남구 테헤란로 123', 'detail': ''},
      {'zipcode': '06236', 'address': '서울특별시 강남구 테헤란로 152', 'detail': '(강남파이낸스센터)'},
      {'zipcode': '05551', 'address': '서울특별시 송파구 올림픽로 300', 'detail': '(롯데월드타워)'},
      {'zipcode': '04524', 'address': '서울특별시 중구 세종대로 110', 'detail': '(서울시청)'},
      {'zipcode': '03722', 'address': '서울특별시 서대문구 연세로 50', 'detail': '(연세대학교)'},
      {'zipcode': '08826', 'address': '서울특별시 관악구 관악로 1', 'detail': '(서울대학교)'},
      {'zipcode': '03080', 'address': '서울특별시 종로구 안심로 188', 'detail': ''},
    ];

    // 샘플 데이터로 검색
    await Future.delayed(const Duration(milliseconds: 300));
    
    setState(() {
      searchResults = sampleAddresses
          .where((addr) =>
              addr['address']!.contains(query) ||
              addr['zipcode']!.contains(query) ||
              (addr['detail']?.contains(query) ?? false))
          .toList();
      isSearching = false;
    });

    /* 실제 카카오 API 사용 시 (API 키 필요)
    try {
      final url = Uri.parse(
        'https://dapi.kakao.com/v2/local/search/address.json?query=${Uri.encodeComponent(query)}&size=15',
      );
      
      final response = await http.get(
        url,
        headers: {
          'Authorization': 'KakaoAK $kakaoApiKey',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final documents = data['documents'] as List;
        
        setState(() {
          searchResults = documents.map<Map<String, String>>((doc) {
            final roadAddress = doc['road_address'];
            final address = doc['address'];
            
            if (roadAddress != null) {
              return {
                'zipcode': (roadAddress['zone_no'] ?? '') as String,
                'address': (roadAddress['address_name'] ?? '') as String,
                'detail': (roadAddress['building_name'] ?? '') as String,
              };
            } else {
              return {
                'zipcode': (address['zip_code'] ?? '') as String,
                'address': (address['address_name'] ?? '') as String,
                'detail': '',
              };
            }
          }).toList();
          isSearching = false;
        });
      }
    } catch (e) {
      setState(() {
        searchResults = [];
        isSearching = false;
      });
    }
    */
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
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
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
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search, size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          searchController.text.isEmpty
                              ? '주소를 검색해주세요'
                              : '검색 결과가 없습니다',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
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

