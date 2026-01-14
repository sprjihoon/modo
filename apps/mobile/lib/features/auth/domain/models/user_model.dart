import '../../../../core/enums/user_role.dart';

/// 사용자 모델
class UserModel {
  final String id;
  final String authId;
  final String email;
  final String name;
  final String phone;
  final UserRole role;
  final String? defaultAddress;
  final String? defaultAddressDetail;
  final String? defaultZipcode;
  final String? fcmToken;
  final int pointBalance;
  final int totalEarnedPoints;
  final int totalUsedPoints;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserModel({
    required this.id,
    required this.authId,
    required this.email,
    required this.name,
    required this.phone,
    required this.role,
    this.defaultAddress,
    this.defaultAddressDetail,
    this.defaultZipcode,
    this.fcmToken,
    this.pointBalance = 0,
    this.totalEarnedPoints = 0,
    this.totalUsedPoints = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  /// JSON에서 UserModel 생성
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      authId: json['auth_id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      role: json['role'] != null 
          ? UserRole.fromString(json['role'] as String)
          : UserRole.WORKER, // 기본값
      defaultAddress: json['default_address'] as String?,
      defaultAddressDetail: json['default_address_detail'] as String?,
      defaultZipcode: json['default_zipcode'] as String?,
      fcmToken: json['fcm_token'] as String?,
      pointBalance: json['point_balance'] as int? ?? 0,
      totalEarnedPoints: json['total_earned_points'] as int? ?? 0,
      totalUsedPoints: json['total_used_points'] as int? ?? 0,
      createdAt: json['created_at'] is String
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] is String
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }

  /// UserModel을 JSON으로 변환
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'auth_id': authId,
      'email': email,
      'name': name,
      'phone': phone,
      'role': role.toShortString(),
      'default_address': defaultAddress,
      'default_address_detail': defaultAddressDetail,
      'default_zipcode': defaultZipcode,
      'fcm_token': fcmToken,
      'point_balance': pointBalance,
      'total_earned_points': totalEarnedPoints,
      'total_used_points': totalUsedPoints,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  /// copyWith 메서드
  UserModel copyWith({
    String? id,
    String? authId,
    String? email,
    String? name,
    String? phone,
    UserRole? role,
    String? defaultAddress,
    String? defaultAddressDetail,
    String? defaultZipcode,
    String? fcmToken,
    int? pointBalance,
    int? totalEarnedPoints,
    int? totalUsedPoints,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      authId: authId ?? this.authId,
      email: email ?? this.email,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      defaultAddress: defaultAddress ?? this.defaultAddress,
      defaultAddressDetail: defaultAddressDetail ?? this.defaultAddressDetail,
      defaultZipcode: defaultZipcode ?? this.defaultZipcode,
      fcmToken: fcmToken ?? this.fcmToken,
      pointBalance: pointBalance ?? this.pointBalance,
      totalEarnedPoints: totalEarnedPoints ?? this.totalEarnedPoints,
      totalUsedPoints: totalUsedPoints ?? this.totalUsedPoints,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'UserModel(id: $id, email: $email, name: $name, role: ${role.displayName})';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
  
    return other is UserModel &&
      other.id == id &&
      other.authId == authId &&
      other.email == email &&
      other.name == name &&
      other.phone == phone &&
      other.role == role &&
      other.defaultAddress == defaultAddress &&
      other.defaultAddressDetail == defaultAddressDetail &&
      other.defaultZipcode == defaultZipcode &&
      other.fcmToken == fcmToken;
  }

  @override
  int get hashCode {
    return id.hashCode ^
      authId.hashCode ^
      email.hashCode ^
      name.hashCode ^
      phone.hashCode ^
      role.hashCode ^
      defaultAddress.hashCode ^
      defaultAddressDetail.hashCode ^
      defaultZipcode.hashCode ^
      fcmToken.hashCode;
  }
}

