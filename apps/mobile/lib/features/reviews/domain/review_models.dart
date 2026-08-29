import 'package:flutter/material.dart';

const int kStarMin = 1;
const int kStarMax = 5;
const int kReviewPhotoMax = 5;
const Color kReviewBrand = Color(0xFF00C896);
const Color kReviewStarGold = Color(0xFFFFB800);

class PublicReview {
  const PublicReview({
    required this.id,
    required this.rating,
    required this.content,
    required this.photoUrls,
    required this.displayName,
    required this.reviewedAt,
    this.repairSummary,
    this.clothingType,
    this.pointsType,
  });

  final String id;
  final int rating;
  final String content;
  final List<String> photoUrls;
  final String displayName;
  final String? repairSummary;
  final String? clothingType;
  final String? pointsType;
  final DateTime reviewedAt;

  bool get isPhoto => photoUrls.isNotEmpty;

  factory PublicReview.fromJson(Map<String, dynamic> json) {
    return PublicReview(
      id: json['id'] as String,
      rating: (json['rating'] as num).toInt(),
      content: json['content'] as String? ?? '',
      photoUrls: (json['photo_urls'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      displayName: json['display_name'] as String? ?? '고**',
      repairSummary: json['repair_summary'] as String?,
      clothingType: json['clothing_type'] as String?,
      pointsType: json['points_type'] as String?,
      reviewedAt: DateTime.tryParse(json['reviewed_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class MyReview extends PublicReview {
  const MyReview({
    required super.id,
    required super.rating,
    required super.content,
    required super.photoUrls,
    required super.displayName,
    required super.reviewedAt,
    required this.orderId,
    required this.status,
    required this.pointsAwarded,
    super.repairSummary,
    super.clothingType,
    super.pointsType,
  });

  final String orderId;
  final String status;
  final int pointsAwarded;

  String get statusLabel {
    if (status == 'approved') return '공개';
    if (status == 'hidden') return '비공개 · 나만 보임';
    return '검수 중 · 나만 보임';
  }

  factory MyReview.fromJson(Map<String, dynamic> json) {
    return MyReview(
      id: json['id'] as String,
      orderId: json['order_id'] as String? ?? '',
      rating: (json['rating'] as num).toInt(),
      content: json['content'] as String? ?? '',
      photoUrls: (json['photo_urls'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      displayName: json['display_name'] as String? ?? '고**',
      repairSummary: json['repair_summary'] as String?,
      clothingType: json['clothing_type'] as String?,
      pointsType: json['points_type'] as String?,
      reviewedAt: DateTime.tryParse(json['reviewed_at'] as String? ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? 'pending',
      pointsAwarded: (json['points_awarded'] as num?)?.toInt() ?? 0,
    );
  }
}

class ReviewSettings {
  const ReviewSettings({
    this.textReviewPoints = 200,
    this.photoReviewPoints = 500,
    this.isActive = true,
    this.minContentLength = 10,
  });

  final int textReviewPoints;
  final int photoReviewPoints;
  final bool isActive;
  final int minContentLength;

  factory ReviewSettings.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const ReviewSettings();
    return ReviewSettings(
      textReviewPoints: (json['text_review_points'] as num?)?.toInt() ?? 200,
      photoReviewPoints: (json['photo_review_points'] as num?)?.toInt() ?? 500,
      isActive: json['is_active'] as bool? ?? true,
      minContentLength: (json['min_content_length'] as num?)?.toInt() ?? 10,
    );
  }
}

class ReviewListResult {
  const ReviewListResult({
    required this.reviews,
    required this.mine,
    required this.count,
    required this.average,
    this.categories = const [],
  });

  final List<PublicReview> reviews;
  final List<MyReview> mine;
  final int count;
  final double average;
  final List<String> categories;
}

class OrderReviewInfo {
  const OrderReviewInfo({
    required this.canWrite,
    required this.itemName,
    this.review,
    this.settings = const ReviewSettings(),
  });

  final bool canWrite;
  final String itemName;
  final MyReview? review;
  final ReviewSettings settings;
}

String formatReviewDate(DateTime date) {
  final local = date.toLocal();
  final m = local.month.toString().padLeft(2, '0');
  final d = local.day.toString().padLeft(2, '0');
  return '${local.year}.$m.$d';
}

String formatPoints(int points) {
  return '${points.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}P';
}
