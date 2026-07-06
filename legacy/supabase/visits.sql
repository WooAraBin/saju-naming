-- 오늘 방문자 수용 테이블 (기기 client_id 기준 하루 1명)
-- Supabase 대시보드 → SQL Editor 에서 실행.
create table if not exists public.visits (
  client_id  text not null,
  day        date not null,
  created_at timestamptz default now(),
  primary key (client_id, day)
);
alter table public.visits enable row level security;
drop policy if exists visits_anon_all on public.visits;
create policy visits_anon_all on public.visits
  for all to anon using (true) with check (true);
