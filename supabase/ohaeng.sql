-- 오행 그래프 저장/비교용 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
-- (로그인 전 단계: 기기별 client_id로 구분. 로그인 붙이면 user_id로 교체 예정)

create table if not exists public.ohaeng_profiles (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,            -- 기기 식별자(localStorage). 로그인 후 user_id로 대체
  name       text,                     -- 이름/별명
  birth      text,                     -- 생년월일(문자열)
  scores     jsonb,                    -- { 목:{count,idx}, 화:{...}, ... }
  created_at timestamptz default now()
);

create index if not exists ohaeng_profiles_client_idx on public.ohaeng_profiles (client_id, created_at desc);

alter table public.ohaeng_profiles enable row level security;

-- 로그인 전이라 anon 키로 읽기/쓰기 허용 (앱이 client_id로 필터).
-- ⚠️ 로그인 도입 시: auth.uid() = user_id 로 정책을 좁힐 것.
drop policy if exists ohaeng_anon_all on public.ohaeng_profiles;
create policy ohaeng_anon_all on public.ohaeng_profiles
  for all to anon
  using (true) with check (true);
