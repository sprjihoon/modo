# 🔧 환경변수 업데이트 가이드

## ✅ 업데이트 완료된 파일

### Mobile 앱 (.env)
- ✅ `SUPABASE_URL` - 업데이트됨
- ✅ `SUPABASE_ANON_KEY` - 업데이트됨
- ⏳ `PORTONE_API_KEY` - 나중에 설정 (결제 기능 개발 시)
- ⏳ `CLOUDFLARE_ACCOUNT_ID` - 나중에 설정 (영상 기능 개발 시)
- ⏳ `EPOST_API_KEY` - 나중에 설정 (배송 기능 개발 시)

### Admin 웹 (.env.local)
- ⏳ Supabase 키 업데이트 필요
- ⏳ Service Role Key 추가 필요

## 📝 Admin 웹 환경변수 업데이트 방법

### 1. Supabase Dashboard에서 Service Role Key 확인
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `rzrwediccbamxluegnex`
3. **Settings** → **API** 메뉴
4. **service_role** 키 복사 (⚠️ 비밀!)

### 2. .env.local 파일 업데이트

`/Users/jangjihoon/modo/apps/admin/.env.local` 파일을 열어서:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rzrwediccbamxluegnex.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzY0NDUsImV4cCI6MjA3ODUxMjQ0NX0.FhehjJfpXDhIwOCn6Raq0wJ4TQ8TiT3AR2F_pS5XUYY
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_키_붙여넣기
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 터미널에서 직접 업데이트 (선택사항)

```bash
cd /Users/jangjihoon/modo/apps/admin

# 파일 편집
nano .env.local
# 또는
code .env.local  # VS Code로 열기
```

## ✅ 확인 방법

### Mobile 앱
```bash
cd /Users/jangjihoon/modo/apps/mobile
flutter run -d chrome
# 로그인/회원가입 테스트
```

### Admin 웹
```bash
cd /Users/jangjihoon/modo/apps/admin
npm run dev
# http://localhost:3000 접속
# 로그인 페이지 확인
```

## 📋 현재 설정 상태

| 항목 | Mobile | Admin | 상태 |
|------|--------|-------|------|
| Supabase URL | ✅ | ✅ | 완료 |
| Supabase Anon Key | ✅ | ✅ | 완료 |
| Service Role Key | - | ⏳ | 필요 |
| PortOne | ⏳ | - | 선택사항 |
| Cloudflare | ⏳ | ⏳ | 선택사항 |
| 우체국 API | ⏳ | ⏳ | 선택사항 |

## 🎯 다음 단계

1. **Admin 웹 .env.local 업데이트** (Service Role Key 추가)
2. **데이터베이스 스키마 설정** (Supabase Dashboard → SQL Editor)
3. **앱 실행 및 테스트**

## ⚠️ 주의사항

- `.env` 파일은 Git에 커밋되지 않습니다 (`.gitignore`에 포함)
- Service Role Key는 절대 클라이언트에 노출하지 마세요
- API 키는 공개 저장소에 업로드하지 마세요

