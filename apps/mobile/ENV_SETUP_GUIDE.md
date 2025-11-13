# Supabase 환경 변수 설정 가이드

## 📝 .env 파일 설정

`apps/mobile/.env` 파일을 생성하거나 수정하여 다음 내용을 추가하세요:

```env
# Supabase Project URL
SUPABASE_URL=https://rzrwediccbamxluegnex.supabase.co

# Supabase Anon Key (Public API Key)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzY0NDUsImV4cCI6MjA3ODUxMjQ0NX0.FhehjJfpXDhIwOCn6Raq0wJ4TQ8TiT3AR2F_pS5XUYY

# Supabase Service Role Key (Optional - 서버 사이드에서만 사용)
# 주의: 이 키는 절대 클라이언트에 노출되면 안 됩니다!
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 🔧 설정 방법

### 방법 1: 파일 직접 생성
1. `apps/mobile/` 디렉토리로 이동
2. `.env` 파일 생성
3. 위의 내용을 복사하여 붙여넣기

### 방법 2: PowerShell 명령어 사용
```powershell
cd apps/mobile
@"
SUPABASE_URL=https://rzrwediccbamxluegnex.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzY0NDUsImV4cCI6MjA3ODUxMjQ0NX0.FhehjJfpXDhIwOCn6Raq0wJ4TQ8TiT3AR2F_pS5XUYY
"@ | Out-File -FilePath .env -Encoding utf8
```

## ✅ 확인 방법

앱을 실행한 후 로그인/회원가입이 정상적으로 작동하는지 확인하세요.

## ⚠️ 주의사항

1. `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.
2. API 키는 절대 공개 저장소에 업로드하지 마세요.
3. Service Role Key는 서버 사이드에서만 사용하세요.

