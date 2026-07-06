/* 한자 시드 데이터 → Supabase SQL 생성기
 * 실행: node scripts/gen-sql.js > supabase/schema.sql
 */
const { SURNAME, HANJA } = require('../data/hanja.js');

const esc = (s) => String(s).replace(/'/g, "''");
const lines = [];

lines.push(`-- =====================================================================
-- 작명 앱 (naming-app) Supabase 스키마 + 시드 데이터
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. (1회)
-- 이 스크립트는 멱등(idempotent): 여러 번 실행해도 안전합니다.
-- =====================================================================

-- 성씨 사전
create table if not exists public.naming_surname (
  id        bigint generated always as identity primary key,
  hangul    text not null,
  hanja     text not null,
  strokes   int  not null,
  wuxing    text not null check (wuxing in ('목','화','토','금','수')),
  unique (hangul, hanja)
);
create index if not exists idx_surname_hangul on public.naming_surname (hangul);

-- 이름용 한자 사전
create table if not exists public.naming_hanja (
  id        bigint generated always as identity primary key,
  hangul    text not null,
  hanja     text not null,
  strokes   int  not null,
  wuxing    text not null check (wuxing in ('목','화','토','금','수')),
  unique (hangul, hanja)
);
create index if not exists idx_hanja_hangul on public.naming_hanja (hangul);

-- 작명 이력 (선택: 사용자가 저장한 결과)
create table if not exists public.naming_result (
  id          bigint generated always as identity primary key,
  surname     text not null,
  given_name  text not null,
  hanja       text,
  total_score numeric,
  scores      jsonb,
  saju        jsonb,
  created_at  timestamptz not null default now()
);

-- RLS: 사전은 누구나 읽기 가능(읽기 전용), 쓰기는 service_role만.
alter table public.naming_surname enable row level security;
alter table public.naming_hanja   enable row level security;
alter table public.naming_result  enable row level security;

drop policy if exists "read surname" on public.naming_surname;
create policy "read surname" on public.naming_surname for select using (true);

drop policy if exists "read hanja" on public.naming_hanja;
create policy "read hanja" on public.naming_hanja for select using (true);

drop policy if exists "read result" on public.naming_result;
create policy "read result" on public.naming_result for select using (true);
drop policy if exists "insert result" on public.naming_result;
create policy "insert result" on public.naming_result for insert with check (true);

-- 시드 데이터 (재실행 안전) -------------------------------------------------
`);

// 성씨
const sRows = [];
for (const [hangul, arr] of Object.entries(SURNAME)) {
  for (const [hanja, strokes, wuxing] of arr) {
    sRows.push(`('${esc(hangul)}','${esc(hanja)}',${strokes},'${esc(wuxing)}')`);
  }
}
lines.push(
  `insert into public.naming_surname (hangul, hanja, strokes, wuxing) values\n  ` +
  sRows.join(',\n  ') +
  `\non conflict (hangul, hanja) do update set strokes = excluded.strokes, wuxing = excluded.wuxing;\n`
);

// 이름 한자
const hRows = [];
for (const [hangul, arr] of Object.entries(HANJA)) {
  for (const [hanja, strokes, wuxing] of arr) {
    hRows.push(`('${esc(hangul)}','${esc(hanja)}',${strokes},'${esc(wuxing)}')`);
  }
}
lines.push(
  `insert into public.naming_hanja (hangul, hanja, strokes, wuxing) values\n  ` +
  hRows.join(',\n  ') +
  `\non conflict (hangul, hanja) do update set strokes = excluded.strokes, wuxing = excluded.wuxing;\n`
);

lines.push(`\n-- 완료. naming_surname / naming_hanja / naming_result 테이블이 생성되었습니다.`);

process.stdout.write(lines.join('\n'));
process.stderr.write(`\n[gen-sql] 성씨 ${sRows.length}행, 이름한자 ${hRows.length}행 생성\n`);
