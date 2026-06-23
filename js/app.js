/* =========================================================================
 * app.js — UI 컨트롤러
 * 데이터는 Supabase에서 읽고, 실패하면 로컬 시드(data/hanja.js)로 폴백합니다.
 * ========================================================================= */

const CONFIG = {
  SUPABASE_URL: 'https://eepbqgcguyyikpsovsta.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcGJxZ2NndXl5aWtwc292c3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTgzMTgsImV4cCI6MjA5Nzc5NDMxOH0.WRkjrf942X8HvEWwvuPooJ1T_NwwVuXPv4ZRkSNdOgo',
};

let DICT = { surname: {}, pool: [] };
let radarChart = null;
let lastResults = [];

const $ = (id) => document.getElementById(id);

// 색상: 점수 → 배지 색
function scoreColor(n) {
  if (n >= 80) return '#2e7d52';
  if (n >= 65) return '#7a9a3a';
  if (n >= 50) return '#c9a36b';
  return '#c0492f';
}

/* ---------- 데이터 로딩 ---------- */
async function loadDictionary() {
  // 로컬 폴백 먼저 구성
  const local = window.HanjaDB;
  const localSurname = {};
  for (const [hangul, arr] of Object.entries(local.SURNAME)) {
    localSurname[hangul] = arr.map(([hanja, strokes, wuxing]) => ({ hangul, hanja, strokes, wuxing }));
  }
  const localPool = [];
  for (const [hangul, arr] of Object.entries(local.HANJA)) {
    arr.forEach(([hanja, strokes, wuxing]) => localPool.push({ hangul, hanja, strokes, wuxing }));
  }

  // Supabase 시도
  try {
    const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    const [s, h] = await Promise.all([
      sb.from('naming_surname').select('hangul,hanja,strokes,wuxing'),
      sb.from('naming_hanja').select('hangul,hanja,strokes,wuxing').limit(20000),
    ]);
    if (!s.error && !h.error && h.data && h.data.length) {
      const surname = {};
      s.data.forEach((r) => { (surname[r.hangul] ||= []).push(r); });
      Object.keys(localSurname).forEach((k) => { if (!surname[k]) surname[k] = localSurname[k]; });
      // Supabase + 로컬 시드 병합 (한자 기준 중복 제거) → 후보 대폭 확장
      const pool = h.data.slice();
      const have = new Set(pool.map((r) => r.hanja));
      localPool.forEach((r) => { if (!have.has(r.hanja)) { have.add(r.hanja); pool.push(r); } });
      DICT = { surname, pool };
      $('dataStatus').textContent = `한자 ${pool.length}자 (Supabase+로컬 병합)`;
      return;
    }
    throw new Error(s.error?.message || h.error?.message || '빈 데이터');
  } catch (e) {
    DICT = { surname: localSurname, pool: localPool };
    $('dataStatus').textContent = `로컬 데이터 사용 중 (Supabase 미연결: ${e.message})`;
  }
}

/* ---------- 사주 표시 ---------- */
function renderSaju(saju) {
  const KO = { year: '연주', month: '월주', day: '일주', time: '시주' };
  $('pillars').innerHTML = ['year', 'month', 'day', 'time']
    .map((p) => `<div class="pillar"><div class="ko">${KO[p]}</div><div class="gz">${saju.pillars[p]}</div></div>`)
    .join('');
  $('wxdist').innerHTML = window.Saju.WX_KO
    .map((o) => `<span class="wx-chip">${o} <b>${saju.count[o]}</b></span>`)
    .join('');
  $('yongsin-text').innerHTML =
    `${saju.reason}<br>→ <b>이름에 보충 권장 오행: ${saju.target.join(', ')}</b>` +
    (saju.offsetMin ? `<br><span class="muted">지방시 보정 ${saju.offsetMin}분 적용 (실제 적용 시각 ${saju.solarStr})</span>` : '');
  $('saju-card').classList.remove('hidden');
}

/* ---------- 추천 목록 ---------- */
const AXIS_LABELS = {
  saju: '사주보완', sugri: '수리길흉', eum: '발음오행',
  jawon: '자원조화', eumyang: '음양조화', call: '발음편의',
};
const AXIS_ORDER = ['saju', 'sugri', 'eum', 'jawon', 'eumyang', 'call'];

function renderList(results) {
  $('name-list').innerHTML = results
    .map((r, i) => `
      <li data-idx="${i}" class="${i === 0 ? 'active' : ''}">
        <span><span class="nm">${r.hangul}</span><span class="hj">${r.hanja}</span></span>
        <span class="score-badge" style="background:${scoreColor(r.total)}">${r.total}</span>
      </li>`)
    .join('');
  $('name-list').querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => {
      $('name-list').querySelectorAll('li').forEach((x) => x.classList.remove('active'));
      li.classList.add('active');
      renderRadar(results[+li.dataset.idx]);
    });
  });
  $('result-card').classList.remove('hidden');
}

/* ---------- 육각형(레이더) ---------- */
function renderRadar(r) {
  $('hex-title').innerHTML = `${r.hangul} <span class="hj">${r.hanja}</span> — 총점 ${r.total}`;
  const data = AXIS_ORDER.map((k) => r.axes[k]);
  const labels = AXIS_ORDER.map((k) => AXIS_LABELS[k]);

  if (radarChart) radarChart.destroy();
  radarChart = new Chart($('radar'), {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: r.hangul,
        data,
        fill: true,
        backgroundColor: 'rgba(139,94,52,.18)',
        borderColor: '#8b5e34',
        pointBackgroundColor: '#8b5e34',
      }],
    },
    options: {
      responsive: false,
      scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, showLabelBackdrop: false } } },
      plugins: { legend: { display: false } },
    },
  });

  $('hex-detail').innerHTML = AXIS_ORDER
    .map((k) => `<div><span>${AXIS_LABELS[k]}</span><b>${r.axes[k]}</b></div>`)
    .join('') +
    `<div><span>인격/지격/외격/총격</span><b>${r.gyeok.in.num}·${r.gyeok.ji.num}·${r.gyeok.oe.num}·${r.gyeok.chong.num}</b></div>`;
}

/* ---------- 실행 ---------- */
async function analyze() {
  const seong = $('seong').value.trim();
  if (!seong) { alert('성(姓)을 입력하세요'); return; }
  const surnameArr = DICT.surname[seong];
  if (!surnameArr || !surnameArr.length) {
    alert(`'${seong}' 성씨 한자 데이터가 없습니다. (현재 시드에 등록된 성씨만 가능)`);
    return;
  }
  const surname = surnameArr[0]; // 대표 한자

  const [y, m, d] = $('birthdate').value.split('-').map(Number);
  const [hh, mm] = $('birthtime').value.split(':').map(Number);

  const saju = window.Saju.computeSaju({
    year: y, month: m, day: d, hour: hh, minute: mm,
    lon: parseFloat($('lon').value) || 127.0,
    applyLocalTime: $('useLocal').checked,
  });
  renderSaju(saju);

  const btn = $('analyze');
  btn.disabled = true; btn.textContent = '추천 계산 중...';
  await new Promise((r) => setTimeout(r, 10));
  lastResults = window.Naming.suggest(saju, surname, DICT.pool, { limit: 20, excludeHyung: false });
  btn.disabled = false; btn.textContent = '사주 분석 + 이름 추천';

  if (!lastResults.length) { alert('후보를 만들지 못했습니다.'); return; }
  renderList(lastResults);
  renderRadar(lastResults[0]);
}

window.addEventListener('DOMContentLoaded', async () => {
  $('dataStatus').textContent = '데이터 불러오는 중...';
  await loadDictionary();
  $('analyze').addEventListener('click', analyze);
});
