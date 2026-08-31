# 📸 카메라/갤러리 이미지 업로드 기능 구현 완료

## ✅ 완료된 작업

### 1. 이미지 업로드 서비스 생성
- ✅ `lib/services/image_service.dart` 생성
- 기능:
  - 카메라/갤러리에서 이미지 선택
  - Supabase Storage에 자동 업로드
  - 고유한 파일명 생성 (UUID + timestamp)
  - 이미지 압축 (최대 1920x1920, 품질 85%)
  - 여러 이미지 동시 업로드
  - 이미지 삭제

### 2. 실제 이미지 선택 구현
- ✅ `select_clothing_type_page.dart` 수정
  - Mock 데이터 제거
  - 실제 이미지 선택 및 업로드 구현
  
- ✅ `order_detail_page.dart` 수정
  - `_addPhoto()` 함수: 실제 이미지 추가
  - `_changePhoto()` 함수: 실제 이미지 변경

### 3. Android 권한 설정
- ✅ `AndroidManifest.xml` 수정
  - 카메라 권한 추가
  - 저장소 읽기/쓰기 권한 추가
  - Android 13+ 미디어 권한 추가

### 4. 패키지 확인
- ✅ `image_picker: ^1.0.5` 이미 설치됨
- ✅ `uuid: ^4.2.2` 이미 설치됨

## 📋 Supabase 설정 필요

### Storage 버킷 생성
1. Supabase 대시보드 접속
2. **Storage** → **Create bucket**
3. 버킷 설정:
   - Name: `order-images`
   - Public: ✅ 체크
   - Create

## 🎯 사용 방법

### 기본 사용
```dart
final imageService = ImageService();

// 이미지 선택 및 업로드
final imageUrl = await imageService.pickAndUploadImage(
  source: ImageSource.camera, // 또는 ImageSource.gallery
  bucket: 'order-images',
  folder: 'repairs',
);
```

### 여러 이미지 선택
```dart
final files = await imageService.pickMultipleImages(maxImages: 5);
final urls = await imageService.uploadMultipleImages(
  files: files,
  bucket: 'order-images',
);
```

### 이미지 삭제
```dart
await imageService.deleteImage(
  url: imageUrl,
  bucket: 'order-images',
);
```

## 🔒 권한

### Android (AndroidManifest.xml에 추가됨)
- `CAMERA`: 카메라 촬영
- `READ_EXTERNAL_STORAGE`: 갤러리 읽기 (Android 12 이하)
- `WRITE_EXTERNAL_STORAGE`: 저장소 쓰기 (Android 10 이하)
- Android 13+: `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` 없음. 시스템 사진 선택 도구 사용

### iOS (Info.plist에 추가됨)
- `NSCameraUsageDescription`: 카메라 권한 설명
  - "의류 사진을 촬영하여 수선 부위를 표시하기 위해 카메라 접근이 필요합니다."
- `NSPhotoLibraryUsageDescription`: 사진 라이브러리 권한 설명
  - "갤러리에서 의류 사진을 선택하여 수선 부위를 표시하기 위해 사진 접근이 필요합니다."
- `NSPhotoLibraryAddUsageDescription`: 사진 저장 권한 (iOS 14+)
  - "수선 사진을 저장하기 위해 사진 라이브러리 접근이 필요합니다."

### Web
- 브라우저 파일 선택 API 사용 (별도 권한 불필요)

## 📁 저장 구조

```
order-images/
  └── repairs/
      ├── uuid1_timestamp1.jpg
      ├── uuid2_timestamp2.jpg
      └── ...
```

## 🔄 흐름

1. 사용자가 카메라/갤러리 선택
2. `image_picker`로 이미지 선택
3. 이미지 압축 (최대 1920x1920, 85% 품질)
4. Supabase Storage에 업로드
5. 공개 URL 반환
6. URL을 사용하여 이미지 표시
7. 핀 표시 페이지로 이동
8. 핀 정보와 함께 저장

## 🧪 테스트

### 테스트 항목
- ✅ 카메라로 사진 촬영
- ✅ 갤러리에서 사진 선택
- ✅ 이미지 업로드 확인
- ✅ 업로드된 이미지 표시
- ✅ 핀 표시 기능 연동
- ✅ 에러 처리

## 🐛 알려진 이슈

없음

## 📝 향후 개선 사항

1. 이미지 편집 기능 (회전, 크롭)
2. 오프라인 지원 (로컬 캐싱)
3. 업로드 진행률 표시
4. 이미지 최적화 옵션 추가
5. WebP 포맷 지원

## 📚 참고 자료

- [image_picker 패키지](https://pub.dev/packages/image_picker)
- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)

