import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import 'package:logger/logger.dart';

// 조건부 import: Mobile에서만 dart:io 사용

class ImageService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final ImagePicker _picker = ImagePicker();
  final Logger _logger = Logger();

  /// 이미지 선택 (카메라 또는 갤러리)
  Future<XFile?> pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1920,  // 최대 너비
        maxHeight: 1920, // 최대 높이
        imageQuality: 85, // 품질 (0-100)
      );

      if (pickedFile == null) {
        _logger.i('이미지 선택 취소');
        return null;
      }

      return pickedFile;
    } catch (e) {
      _logger.e('이미지 선택 실패', error: e);
      rethrow;
    }
  }

  /// Supabase Storage에 이미지 업로드 (Web/Mobile 호환)
  /// 
  /// [xFile]: 업로드할 이미지 파일 (XFile)
  /// [bucket]: Storage 버킷 이름 (기본값: 'order-images')
  /// [folder]: 폴더 경로 (예: 'orders', 'repairs')
  /// 
  /// Returns: 업로드된 이미지의 공개 URL
  Future<String> uploadImage({
    required XFile xFile,
    String bucket = 'order-images',
    String? folder,
  }) async {
    try {
      // 고유한 파일명 생성 (UUID + 타임스탬프)
      final uuid = const Uuid().v4();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final extension = xFile.name.split('.').last.toLowerCase();
      final fileName = '${uuid}_$timestamp.$extension';
      
      // 폴더 경로가 있으면 포함
      final filePath = folder != null ? '$folder/$fileName' : fileName;

      _logger.i('이미지 업로드 시작: $filePath');

      // 항상 bytes로 업로드 (Web/Mobile 모두 호환)
      final Uint8List bytes = await xFile.readAsBytes();
      
      await _supabase.storage.from(bucket).uploadBinary(
        filePath,
        bytes,
        fileOptions: FileOptions(
          cacheControl: '3600',
          upsert: false,
          contentType: _getContentType(extension),
        ),
      );

      // 공개 URL 가져오기
      final publicUrl = _supabase.storage.from(bucket).getPublicUrl(filePath);

      _logger.i('이미지 업로드 성공: $publicUrl');
      return publicUrl;
    } catch (e) {
      _logger.e('이미지 업로드 실패', error: e);
      rethrow;
    }
  }

  /// 파일 확장자로 Content-Type 결정
  String _getContentType(String extension) {
    switch (extension.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      default:
        return 'image/jpeg';
    }
  }

  /// 이미지 선택 및 업로드 (한 번에 처리)
  /// 
  /// [source]: 이미지 소스 (카메라 또는 갤러리)
  /// [bucket]: Storage 버킷 이름
  /// [folder]: 폴더 경로
  /// 
  /// Returns: 업로드된 이미지의 공개 URL
  Future<String?> pickAndUploadImage({
    required ImageSource source,
    String bucket = 'order-images',
    String? folder,
  }) async {
    try {
      // 1. 이미지 선택
      final xFile = await pickImage(source);
      if (xFile == null) return null;

      // 2. 업로드
      final url = await uploadImage(
        xFile: xFile,
        bucket: bucket,
        folder: folder,
      );

      return url;
    } catch (e) {
      _logger.e('이미지 선택 및 업로드 실패', error: e);
      rethrow;
    }
  }

  /// 여러 이미지 선택 (갤러리에서만 가능)
  Future<List<XFile>> pickMultipleImages({int? maxImages}) async {
    try {
      final List<XFile> pickedFiles = await _picker.pickMultiImage(
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (pickedFiles.isEmpty) {
        _logger.i('이미지 선택 취소');
        return [];
      }

      // maxImages가 지정되면 제한
      final filesToProcess = maxImages != null && pickedFiles.length > maxImages
          ? pickedFiles.take(maxImages).toList()
          : pickedFiles;

      return filesToProcess;
    } catch (e) {
      _logger.e('여러 이미지 선택 실패', error: e);
      rethrow;
    }
  }

  /// 여러 이미지 업로드
  Future<List<String>> uploadMultipleImages({
    required List<XFile> xFiles,
    String bucket = 'order-images',
    String? folder,
  }) async {
    final List<String> urls = [];

    for (final xFile in xFiles) {
      try {
        final url = await uploadImage(
          xFile: xFile,
          bucket: bucket,
          folder: folder,
        );
        urls.add(url);
      } catch (e) {
        _logger.e('이미지 업로드 실패 (계속 진행)', error: e);
        // 실패해도 계속 진행
      }
    }

    return urls;
  }

  /// Storage에서 이미지 삭제
  Future<void> deleteImage({
    required String url,
    String bucket = 'order-images',
  }) async {
    try {
      // URL에서 파일 경로 추출
      final uri = Uri.parse(url);
      final path = uri.pathSegments.last;

      await _supabase.storage.from(bucket).remove([path]);
      _logger.i('이미지 삭제 성공: $path');
    } catch (e) {
      _logger.e('이미지 삭제 실패', error: e);
      rethrow;
    }
  }
}
