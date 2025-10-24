# 🚀 빠른 시작 가이드

## 현재 프로젝트 상태

```
✅ 프로젝트 구축 완료 (85%)
✅ GitHub 저장 완료
✅ 모든 코드 작성 완료
```

---

## 🎯 Admin 웹 실행 (권장)

### 새 PowerShell 터미널 열고:

```powershell
# 1. Admin 디렉토리로
cd C:\Users\one\Documents\modo\apps\admin

# 2. 실행
npm run dev
```

**접속**: http://localhost:3000

---

## 📱 Mobile 앱 실행

### Flutter PATH 설정 (1회만)

**PowerShell 관리자 권한으로**:

```powershell
# 시스템 환경변수에 추가
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Users\one\flutter\bin",
    "User"
)
```

**또는 수동**:
1. 시작 → "환경 변수" 검색
2. "사용자 변수" → Path 편집
3. "새로 만들기" → `C:\Users\one\flutter\bin`
4. 확인

### 실행 (PowerShell 재시작 후)

```powershell
# 1. Mobile 디렉토리로
cd C:\Users\one\Documents\modo\apps\mobile

# 2. Chrome으로 실행
flutter run -d chrome
```

---

## ⚠️ 주의사항

### 올바른 디렉토리에서 실행

❌ **잘못된 예**:
```powershell
C:\Users\one\Documents\modo> npm run dev
→ 에러! (package.json 없음)
```

✅ **올바른 예**:
```powershell
C:\Users\one\Documents\modo\apps\admin> npm run dev
→ 성공!
```

---

## 🎯 지금 바로 실행

### 1. Cursor에서 새 터미널 열기
```
Ctrl + Shift + `
```

### 2. Admin 실행
```powershell
cd C:\Users\one\Documents\modo\apps\admin
npm run dev
```

**대기**: 서버 시작 (10~20초)

**접속**: http://localhost:3000

---

## 🎨 확인할 화면

### Admin 로그인
- 이메일: test@test.com
- 비밀번호: 123456
- 로그인 클릭

### 대시보드
- 통계 4개
- 최근 주문 5개

### 주문 관리
- 왼쪽 메뉴 "주문 관리"
- 주문 목록 20개
- 첫 번째 주문 클릭

### 주문 상세 ⭐
- tracking_no Badge
- 5단계 타임라인
- 상태 변경 버튼
- 송장 복사/다운로드

---

## 📞 도움말

**Admin이 안 열리면**:
- apps/admin 디렉토리 확인
- node_modules 폴더 있는지 확인
- npm install 다시 실행

**Flutter가 안되면**:
- Admin만 확인해도 충분합니다!
- Flutter는 선택사항

---

**Admin 웹부터 확인해보세요!** 🌐

http://localhost:3000

