-- 내 정보: 구글 로그인 사용자별 저장된 사주 풀이 + 정액권/크레딧
-- Supabase SQL Editor에서 실행. (구글 OAuth는 Authentication > Providers > Google 활성화 필요)

-- 저장된 사주 풀이 ------------------------------------------------------------
create table if not exists public.saju_readings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'saju',   -- saju / newyear / couple ...
  title       text,
  saju_line   text,                            -- 팔자 요약 한 줄
  birth       text,                            -- 생년월일·시각·도시 표시용
  body_md     text,                            -- AI 풀이 본문(마크다운)
  created_at  timestamptz not null default now()
);
create index if not exists saju_readings_user_idx on public.saju_readings(user_id, created_at desc);

alter table public.saju_readings enable row level security;
drop policy if exists "readings_select_own" on public.saju_readings;
drop policy if exists "readings_insert_own" on public.saju_readings;
drop policy if exists "readings_delete_own" on public.saju_readings;
create policy "readings_select_own" on public.saju_readings for select using (auth.uid() = user_id);
create policy "readings_insert_own" on public.saju_readings for insert with check (auth.uid() = user_id);
create policy "readings_delete_own" on public.saju_readings for delete using (auth.uid() = user_id);

-- 정액권 / 크레딧 ------------------------------------------------------------
-- 잔여 크레딧·정액권 상태. 실제 충전/구매는 결제(PG) 연동 후 서버(서비스 롤)에서만 갱신.
create table if not exists public.user_credits (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  credits         int not null default 0,      -- 잔여 이용 횟수
  plan            text,                          -- 예: '월 정액권'
  plan_expires_at timestamptz,                   -- 정액권 만료 시각
  updated_at      timestamptz not null default now()
);

alter table public.user_credits enable row level security;
-- 본인 것만 조회. 갱신(구매)은 클라이언트 금지 → PG 웹훅/Edge Function(service_role)에서만.
drop policy if exists "credits_select_own" on public.user_credits;
create policy "credits_select_own" on public.user_credits for select using (auth.uid() = user_id);
