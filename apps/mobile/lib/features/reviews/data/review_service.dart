import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/review_models.dart';

class ReviewApiException implements Exception {
  ReviewApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class ReviewService {
  ReviewService();

  static const apiBase = 'https://modo.io.kr';

  Future<Map<String, String>> _headers() async {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> _json(http.Response res) async {
    final body = res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body);
    if (body is! Map<String, dynamic>) {
      throw ReviewApiException('응답을 읽지 못했습니다.');
    }
    if (res.statusCode >= 400) {
      throw ReviewApiException(body['error'] as String? ?? '요청에 실패했습니다.');
    }
    return body;
  }

  Future<ReviewListResult> fetchReviews({
    bool home = false,
    String sort = 'rating',
    bool photoOnly = false,
    int limit = 20,
  }) async {
    final params = <String, String>{
      'sort': sort,
      'limit': '$limit',
      if (home) 'home': '1',
      if (photoOnly) 'photo': '1',
    };
    final uri = Uri.parse('$apiBase/api/reviews').replace(queryParameters: params);
    final res = await http.get(uri, headers: await _headers());
    final json = await _json(res);
    final reviews = (json['reviews'] as List? ?? [])
        .whereType<Map>()
        .map((e) => PublicReview.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    final mine = (json['mine'] as List? ?? [])
        .whereType<Map>()
        .map((e) => MyReview.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return ReviewListResult(
      reviews: reviews,
      mine: mine,
      count: (json['count'] as num?)?.toInt() ?? reviews.length,
      average: (json['average'] as num?)?.toDouble() ?? 0,
    );
  }

  Future<List<MyReview>> fetchMine() async {
    final uri = Uri.parse('$apiBase/api/reviews/mine');
    final res = await http.get(uri, headers: await _headers());
    final json = await _json(res);
    return (json['reviews'] as List? ?? [])
        .whereType<Map>()
        .map((e) => MyReview.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<OrderReviewInfo> fetchOrderReview(String orderId) async {
    final uri = Uri.parse('$apiBase/api/orders/$orderId/review');
    final res = await http.get(uri, headers: await _headers());
    final json = await _json(res);
    final reviewJson = json['review'];
    return OrderReviewInfo(
      canWrite: json['canWrite'] == true,
      itemName: (json['order'] as Map?)?['item_name'] as String? ?? '수선',
      review: reviewJson is Map ? MyReview.fromJson(Map<String, dynamic>.from(reviewJson)) : null,
      settings: ReviewSettings.fromJson(json['settings'] as Map<String, dynamic>?),
    );
  }

  Future<({MyReview review, String itemName, ReviewSettings settings})> fetchReview(String id) async {
    final uri = Uri.parse('$apiBase/api/reviews/$id');
    final res = await http.get(uri, headers: await _headers());
    final json = await _json(res);
    return (
      review: MyReview.fromJson(json['review'] as Map<String, dynamic>),
      itemName: (json['order'] as Map?)?['item_name'] as String? ?? '수선',
      settings: ReviewSettings.fromJson(json['settings'] as Map<String, dynamic>?),
    );
  }

  Future<ReviewSettings> fetchSettings() async {
    final uri = Uri.parse('$apiBase/api/reviews/settings');
    final res = await http.get(uri, headers: await _headers());
    final json = await _json(res);
    return ReviewSettings.fromJson(json);
  }

  Future<MyReview> createReview({
    required String orderId,
    required int rating,
    required String content,
    required List<String> photoUrls,
  }) async {
    final uri = Uri.parse('$apiBase/api/reviews');
    final res = await http.post(
      uri,
      headers: await _headers(),
      body: jsonEncode({
        'order_id': orderId,
        'rating': rating,
        'content': content,
        'photo_urls': photoUrls,
      }),
    );
    final json = await _json(res);
    return MyReview.fromJson(json['review'] as Map<String, dynamic>);
  }

  Future<MyReview> updateReview({
    required String reviewId,
    required int rating,
    required String content,
    required List<String> photoUrls,
  }) async {
    final uri = Uri.parse('$apiBase/api/reviews/$reviewId');
    final res = await http.patch(
      uri,
      headers: await _headers(),
      body: jsonEncode({
        'rating': rating,
        'content': content,
        'photo_urls': photoUrls,
      }),
    );
    final json = await _json(res);
    return MyReview.fromJson(json['review'] as Map<String, dynamic>);
  }

  Future<void> deleteReview(String reviewId) async {
    final uri = Uri.parse('$apiBase/api/reviews/$reviewId');
    final res = await http.delete(uri, headers: await _headers());
    await _json(res);
  }
}
