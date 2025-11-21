# SEED128 암호화 구현 가이드

## 현재 상황

우체국 API는 `regData` 파라미터에 SEED128 ECB 모드로 암호화된 데이터를 요구합니다.

현재 구현은 기본 구조만 있고, 실제 SEED128 알고리즘이 완전히 구현되지 않았습니다.

## 해결 방안

### 옵션 1: 우체국 API 문서 확인
우체국 계약고객전용시스템([https://biz.epost.go.kr/ui/index.jsp](https://biz.epost.go.kr/ui/index.jsp))에서:
1. API 문서 다운로드
2. SEED128 암호화 샘플 코드 확인
3. 제공된 라이브러리 사용

### 옵션 2: npm 패키지 사용
Deno에서 npm 패키지를 사용할 수 있습니다:
```typescript
import { Seed } from "npm:seed-crypto@latest";
```

### 옵션 3: 완전한 SEED128 알고리즘 구현
KISA 표준 SEED128 알고리즘을 완전히 구현해야 합니다.
- 키 스케줄링
- 라운드 함수
- S-Box 변환
- 등등...

## 다음 단계

1. 우체국 API 문서에서 SEED128 암호화 샘플 코드 확인
2. 제공된 라이브러리 또는 샘플 코드 사용
3. 또는 완전한 SEED128 알고리즘 구현

## 참고 자료

- KISA SEED128: https://seed.kisa.or.kr
- 우체국 계약고객전용시스템: https://biz.epost.go.kr/ui/index.jsp

