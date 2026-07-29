# Supabase 아이디 로그인 및 기록 동기화 설정

## 1. 환경 변수

Supabase 대시보드의 **Project Settings → API**에서 Project URL과
Publishable key와 Secret key를 확인한 뒤 `.env.local`에 등록합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_server_only_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=관리자_비밀번호
ADMIN_SESSION_SECRET=충분히_긴_무작위_문자열
```

`SUPABASE_SECRET_KEY`는 회원 생성과 비밀번호 복구에 사용하는 서버 전용
키입니다. `NEXT_PUBLIC_` 접두사를 붙이거나 브라우저 코드에서 사용하면
안 됩니다.

## 2. 테이블과 보안 정책

Supabase SQL Editor에서 아래 마이그레이션 파일을 순서대로 실행합니다.

1. `supabase/migrations/20260728000000_create_user_reading_history.sql`
2. `supabase/migrations/20260728010000_create_username_accounts.sql`
3. `supabase/migrations/20260728020000_update_username_constraint.sql`
4. `supabase/migrations/20260729000000_create_pronunciation_skip_words.sql`

모든 테이블에 Row Level Security가 활성화됩니다. 말씀 기록은 로그인한
사용자 본인만 관리할 수 있고, 아이디·복구 답변 해시·복구 시도 기록은
서버 전용 Secret key로만 접근할 수 있습니다.

## 3. 아이디 로그인 방식

Supabase Auth는 아이디 로그인을 직접 지원하지 않으므로 서버에서 아이디를
내부 전용 주소로 변환하여 계정을 생성합니다.

- 사용자는 이메일을 입력하거나 확인하지 않습니다.
- 내부 식별자는 `{아이디}@users.bible4korea.app` 형식이며 화면에 노출하지
  않습니다.
- 회원은 아이디와 비밀번호로 로그인합니다.
- 비밀번호 찾기 답변은 `scrypt` 솔트 해시만 저장됩니다.
- 비밀번호 찾기 실패는 아이디와 접속 주소를 기준으로 15분간 제한됩니다.

## 4. Supabase Auth 설정

이 앱은 아이디·비밀번호 로그인을 위해 Supabase Auth의 **Email provider**를
사용합니다. 사용자에게 실제 이메일을 보내지 않지만, 로그인 API
(`signInWithPassword`) 자체는 Email provider가 **켜져 있어야** 동작합니다.

**Authentication → Providers → Email**

- Enable Email provider: **ON** (필수)
- Confirm email: **OFF**
- Secure email change: **OFF**
- Password recovery: **OFF** (이메일 재설정 메일 방지)

**Authentication → Settings**

- Allow new users to sign up: **OFF** (공개 회원가입 차단, 기존 사용자 로그인은
  계속 가능)

주의: Email provider 자체를 끄거나, Email signup만 꺼 두면 기존 사용자도
로그인하지 못하고 "아이디 또는 비밀번호가 일치하지 않습니다"처럼 보일 수
있습니다. 공개 가입만 막으려면 위 **Allow new users to sign up** 항목을
사용하세요.

회원가입·비밀번호 변경·비밀번호 찾기는 서버 API(`admin.createUser`,
`admin.updateUserById`)만 사용합니다.

## 5. 동작 방식

- 로그인 전 브라우저 기록은 첫 로그인 시 DB 기록과 합쳐집니다.
- 로그인 후 최근 본 말씀과 소리 내어 읽기 기록은 변경 시 DB에 저장됩니다.
- 세션은 자동 갱신되어 사용자가 로그아웃할 때까지 유지됩니다.
- 다른 기기에서 비밀번호가 변경되면 세션 보안 버전을 감지해 현재 기기에서
  자동으로 로그아웃됩니다. 앱이 열려 있을 때는 5분마다, 다시 화면을
  활성화할 때는 즉시 확인합니다.
- 로그아웃하면 이 기기의 로컬 기록만 비워지고 DB 기록은 유지됩니다.

## 6. 발음 평가 제외 단어 관리

`/admin`에서 서버 전용 관리자 계정으로 로그인하면 음성 인식 평가에서
제외할 단어나 문구를 추가하거나 삭제할 수 있습니다. 관리자 비밀번호와
세션 서명 키에는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
