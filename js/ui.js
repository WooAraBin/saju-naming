/* ============================================================
   ui.js — 사주앱 UI (점신 벤치마크). 계산은 window.Saju 재사용.
   ============================================================ */
'use strict';
const $ = (id) => document.getElementById(id);
const API = '/api/explain'; // 동일 오리진(배포)

const FEATURES = [
  { id: 'saju', emoji: '🔮', title: '사주팔자', sub: '타고난 기질·평생 운', pay: 'pay' },
  { id: 'couple', emoji: '💑', title: '부부 궁합', sub: '두 사람의 인연', pay: 'pay' },
  { id: 'child', emoji: '👶', title: '자식 사주', sub: '우리 아이 성향', pay: 'pay' },
  { id: 'teen', emoji: '🌱', title: '자식 사춘기', sub: '사춘기 주의점', pay: 'pay' },
  { id: 'daily', emoji: '☀️', title: '일일운세', sub: '오늘의 운세', pay: 'ad' },
  { id: 'newyear', emoji: '🎊', title: '신년운세', sub: '올해의 흐름', pay: 'pay' },
  { id: 'moving', emoji: '🏠', title: '이사 택일', sub: '이사·방위 길일', pay: 'pay' },
  { id: 'dream', emoji: '🌙', title: '꿈해몽', sub: '어젯밤 꿈 풀이', pay: 'ad' },
  { id: 'face', emoji: '👤', title: '관상', sub: '얼굴로 보는 운', pay: 'pay' },
  { id: 'name', emoji: '✍️', title: '이름점수', sub: '이름 획수·음오행', pay: 'pay' },
];
const featById = (id) => FEATURES.find((f) => f.id === id);
const WXHEX = { 목: '#4C9AFF', 화: '#FF6B6B', 토: '#FFC94D', 금: '#C9CED8', 수: '#2B2F3A' };
const GAN_KO = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계' };
const ZHI_KO = { 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const WX_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('on'));
  $('view-' + name).classList.add('on');
  document.querySelectorAll('.bottom-nav .nav-item').forEach((n) => n.classList.toggle('on', n.dataset.v === name));
  window.scrollTo(0, 0);
}
function renderNav() {
  const items = [['home', '🏠', '홈'], ['archive', '📂', '보관함'], ['me', '👤', '내 정보']];
  $('bottomNav').innerHTML = items.map(([v, i, l]) =>
    `<div class="nav-item ${v === 'home' ? 'on' : ''}" data-v="${v}" onclick="showView('${v}')"><div class="ico">${i}</div>${l}</div>`).join('');
}
const DONE = new Set(['saju', 'face', 'name']); // 제대로 구현+확인된 기능만 뱃지
const TINTS = { saju: '#EAF0FE', couple: '#FDEBF1', child: '#FFF3E0', teen: '#E9F7EC', daily: '#FFF6DE', newyear: '#EFEAFE', moving: '#E8F4FE', dream: '#EDEBFB', face: '#FCEEE8', name: '#EAF6F3' };
function renderHome() {
  const quick = ['📅 출석체크', '☀️ 오늘의 운세', '😎 관상', '🔮 정통사주', '🎊 신년운세'];
  const grid = FEATURES.map((f) => {
    const done = DONE.has(f.id);
    return `<div class="icon-item" onclick="openFeature('${f.id}')">
      <div class="icon-circle" style="background:${TINTS[f.id] || '#F0F2F6'}">${f.emoji}
        <span class="mini-badge ${done ? 'mb-done' : 'mb-todo'}">${done ? '구현' : '준비'}</span></div>
      <div class="icon-title">${f.title}</div>
    </div>`;
  }).join('');
  $('view-home').innerHTML = `
    <div class="hero">
      <div class="txt"><div class="kicker">🔮 오늘의 사주</div><h2>나를 읽는 시간</h2><p>생년월일시로 나를 깊이 풀어드려요</p></div>
      <div class="emoji">🔮</div>
    </div>
    <div class="report-tabs"><div class="rtab on">운세보고서</div><div class="rtab">인맥보고서</div><div class="rtab">행운보고서</div></div>
    <div class="quick-row">${quick.map((q) => `<div class="pill">${q}</div>`).join('')}</div>
    <div class="section"><div class="section-head"><h3>가장 정확한 사주 풀이</h3><span class="more">전체보기</span></div></div>
    <div class="icon-grid">${grid}</div>
    <div class="section" style="padding-bottom:20px">
      <div class="card" style="margin:0;display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#FFF7E4,#FFF0F0)">
        <div style="font-size:38px">🧧</div>
        <div style="flex:1"><div style="font-weight:800">오늘도 운세 보고 복주머니 챙겨요</div><div class="muted">출석체크 · 매일 크레딧 적립 (준비 중)</div></div>
      </div>
    </div>`;
}
function detailHead(title) {
  return `<div class="detail-head"><div class="back" onclick="showView('home')">‹</div><div class="title">${title}</div></div>`;
}
// 생일 입력 기반 기능(사주 엔진 파생)
const BIRTH_BTN = { saju: '사주 보기', daily: '오늘의 운세 보기', child: '자식 사주 보기', teen: '사춘기 분석 보기' };
const CHILD_SET = new Set(['child', 'teen']);

function openFeature(id) {
  const f = featById(id);
  if (id === 'newyear') return renderNewyearForm(f);
  if (BIRTH_BTN[id]) return renderBirthForm(id, f);
  if (id === 'face') return renderFaceForm(f);
  if (id === 'dream') return renderDreamForm(f);
  if (id === 'name') return renderNameForm(f);
  $('view-reading').innerHTML = detailHead(f.title) +
    `<div class="card" style="text-align:center;color:var(--ink-3);padding:40px 18px">${f.emoji}<br/><b>${f.title}</b>는 준비 중이에요<br/><span class="muted">곧 열려요.</span></div>`;
  showView('reading');
}
function birthFields(child) {
  return `<div class="card">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <label style="font-size:13px;font-weight:700;color:var(--ink-2)">${child ? '자녀 ' : ''}생년월일
        <input id="fBirth" type="date" value="${child ? '2015-01-01' : '1990-01-01'}" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px" /></label>
      <label style="font-size:13px;font-weight:700;color:var(--ink-2)">출생 시각
        <input id="fTime" type="time" value="12:00" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px" /></label>
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;align-items:center">
      <label style="font-size:13px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="fTimeUnknown" /> 시간 모름</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:6px">성별 <select id="fGender" style="padding:6px;border-radius:8px;border:1px solid var(--line)"><option value="M">남</option><option value="F">여</option></select></label>
      <label style="font-size:13px;display:flex;align-items:center;gap:6px">달력 <select id="fCal" style="padding:6px;border-radius:8px;border:1px solid var(--line)"><option value="solar">양력</option><option value="lunar">음력</option></select></label>
    </div>`;
}
function renderBirthForm(id, f) {
  $('view-reading').innerHTML = detailHead(f.title) + birthFields(CHILD_SET.has(id)) +
    `<button class="btn" style="margin-top:16px" onclick="runReading('${id}')">${BIRTH_BTN[id]}</button></div><div id="sajuResult"></div>`;
  showView('reading');
}
function getSaju() {
  const bd = $('fBirth').value, tm = $('fTime').value || '12:00';
  if (!bd) { alert('생년월일을 입력해주세요'); return null; }
  const [y, mo, d] = bd.split('-').map(Number), [h, mi] = tm.split(':').map(Number);
  return window.Saju.computeSaju({ year: y, month: mo, day: d, hour: h, minute: mi, gender: $('fGender').value, timeUnknown: $('fTimeUnknown').checked, isLunar: $('fCal').value === 'lunar' });
}
function callAI(prompt, image) {
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(image ? { prompt, image } : { prompt }) })
    .then((r) => r.json())
    .then((j) => { $('aiCard').innerHTML = j.text ? `<div class="md">${mdLite(j.text)}</div>` : '<div class="loading">잠시 후 다시 시도해주세요.</div>'; })
    .catch(() => { $('aiCard').innerHTML = '<div class="loading">분석 실패 — 다시 시도해주세요.</div>'; });
}
const aiLoading = (t) => `<div class="card" id="aiCard"><div class="loading"><span class="spinner"></span> ${t || '분석 생성 중…'}</div></div>`;
function compactSummary(s) {
  const chip = (t) => `<span class="pill" style="box-shadow:none;background:var(--surface-2);padding:6px 12px">${t}</span>`;
  const p = s.pillars;
  return `<div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap">
    ${chip(`${p.year}·${p.month}·${p.day}${s.timeUnknown ? '' : '·' + p.time}`)}
    ${chip(`일간 ${s.dayGan}(${s.dayWx})`)}${chip(s.isStrong ? '신강' : '신약')}${chip(`${s.tti}띠`)}</div></div>`;
}
function runReading(id) {
  const saju = getSaju(); if (!saju) return;
  window._saju = saju; window._manseTab = 'wonguk';
  if (id === 'saju') {
    $('sajuResult').innerHTML = `<div id="manseBox">${renderManse()}</div>${aiLoading('AI 심층분석 생성 중…')}`;
    callAI(deepPrompt(saju)); return;
  }
  const pr = id === 'daily' ? dailyPrompt(saju) : id === 'newyear' ? newyearPrompt(saju) : id === 'child' ? childPrompt(saju) : teenPrompt(saju);
  $('sajuResult').innerHTML = compactSummary(saju) + aiLoading();
  callAI(pr);
}
// 관상
window._faceImg = null;
function renderFaceForm(f) {
  $('view-reading').innerHTML = detailHead('관상') + `<div class="card">
    <p class="muted" style="margin:0 0 12px">얼굴 사진으로 관상을 봐요. 사진은 서버에 저장하지 않고 분석 후 폐기됩니다.</p>
    <label class="btn ghost" style="display:block;text-align:center">📁 얼굴 사진 선택<input type="file" accept="image/*" hidden onchange="onFacePhoto(event)"></label>
    <img id="fPreview" style="width:100%;border-radius:12px;margin-top:12px;display:none" alt="" />
    <button class="btn" style="margin-top:12px" onclick="runFace()">관상 분석</button>
  </div><div id="sajuResult"></div>`;
  showView('reading');
}
function onFacePhoto(e) {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  const img = new Image();
  img.onload = () => {
    const max = 640, sc = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const url = cv.toDataURL('image/jpeg', 0.85);
    window._faceImg = { data: url.split(',')[1], mime: 'image/jpeg' };
    const pv = $('fPreview'); pv.src = url; pv.style.display = 'block';
  };
  img.src = URL.createObjectURL(file);
}
function runFace() {
  if (!window._faceImg) { alert('얼굴 사진을 먼저 선택하세요'); return; }
  $('sajuResult').innerHTML = aiLoading('관상 분석 중… (20~40초)');
  callAI(gwansangPrompt(), window._faceImg);
}
// 꿈해몽
function renderDreamForm(f) {
  $('view-reading').innerHTML = detailHead('꿈해몽') + `<div class="card">
    <label style="font-size:13px;font-weight:700;color:var(--ink-2)">어젯밤 꿈
      <textarea id="fDream" rows="5" placeholder="꿈 내용을 자유롭게 적어주세요" style="width:100%;margin-top:6px;padding:12px;border:1px solid var(--line);border-radius:10px;font-size:15px;font-family:inherit"></textarea></label>
    <button class="btn" style="margin-top:12px" onclick="runDream()">꿈 풀이 보기</button>
  </div><div id="sajuResult"></div>`;
  showView('reading');
}
function runDream() {
  const t = ($('fDream').value || '').trim(); if (!t) { alert('꿈 내용을 입력해주세요'); return; }
  $('sajuResult').innerHTML = aiLoading('해몽 중…');
  callAI(dreamPrompt(t));
}

// ── 신년운세 ──
let nyChart = null;
function renderNewyearForm() {
  const y = new Date().getFullYear();
  const years = [y, y + 1].map((yy) => `<option value="${yy}">${yy}년</option>`).join('');
  $('view-reading').innerHTML = detailHead('신년운세') + birthFields(false) +
    `<label style="font-size:13px;font-weight:700;color:var(--ink-2);display:block;margin-top:12px">운세 볼 해
      <select id="nyYear" style="margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;width:130px;font-size:15px">${years}</select></label>
     <button class="btn" style="margin-top:16px" onclick="runNewyear()">신년운세 보기</button></div><div id="sajuResult"></div>`;
  showView('reading');
}
function runNewyear() {
  const saju = getSaju(); if (!saju) return;
  const year = parseInt($('nyYear').value) || new Date().getFullYear();
  let yGz = ''; try { yGz = Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhi(); } catch (e) {}
  const ysip = yGz ? window.Saju.sipsin(saju.dayGan, yGz[0]) : '';
  $('sajuResult').innerHTML = aiLoading(`${year} 신년운세 생성 중… (10~30초)`);
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: newyearPrompt2(saju, year, yGz, ysip) }) })
    .then((r) => r.json())
    .then((j) => renderNewyearResult(j.text || '', year, yGz, ysip))
    .catch(() => { $('sajuResult').innerHTML = '<div class="card"><div class="loading">분석 실패 — 다시 시도해주세요.</div></div>'; });
}
function newyearPrompt2(s, year, yGz, ysip) {
  return `너는 20년 경력 자평명리 상담가이자 MZ 카피라이터다. ${year}년 신년운세를 아래 사주로 깊이 있게, 위트 있게 써라. 마크다운.
반드시 **첫 줄**에 아래 형식으로 5개 점수(0~100 정수)만 출력하고 줄바꿈:
SCORES 총운=?? 재물=?? 애정=?? 직업=?? 건강=??
그 다음 섹션(각 2문단, 세운·대운 간지·십신 근거 인용):
## ${year}년 한줄 요약
## 전체 흐름 (상반기 · 하반기)
## 💰 재물운
## ❤️ 애정·결혼운
## 💼 직업·학업운
## 🩺 건강운
## ⚠️ 조심할 것 & 조언
- 불행·질병·사망 단정 금지, '~할 수 있어요' 톤. 데이터에 없는 것 지어내지 말 것.
[데이터] ${year} 세운 ${yGz}(${ysip}) / 현재대운 ${s.daewoon ? s.daewoon.ganzhi + '(' + s.daewoon.sipsin + ')' : '-'} / ${sajuLine(s)}`;
}
function renderNewyearResult(text, year, yGz, ysip) {
  const m = text.match(/SCORES[^\n]*/i);
  let sc = null;
  if (m) { const g = (k) => { const r = m[0].match(new RegExp(k + '\\s*=\\s*(\\d+)')); return r ? +r[1] : null; }; sc = { 총운: g('총운'), 재물: g('재물'), 애정: g('애정'), 직업: g('직업'), 건강: g('건강') }; }
  const body = text.replace(/SCORES[^\n]*\n?/i, '').trim();
  const header = `<div class="card" style="background:linear-gradient(135deg,#EFEAFE,#E8F0FF)"><div style="font-weight:800;font-size:17px">🎊 ${year}년 신년운세</div><div class="muted" style="margin-top:2px">세운 ${yGz} (${ysip})</div></div>`;
  const hasScore = sc && sc.총운 != null;
  const radar = hasScore ? `<div class="card"><div style="text-align:center"><div style="font-size:12px;color:var(--ink-3)">올해 총운</div><div style="font-size:40px;font-weight:900;color:var(--primary)">${sc.총운}<span style="font-size:15px;color:var(--ink-3)">점</span></div></div><div style="max-width:280px;margin:4px auto"><canvas id="nyRadar" height="240"></canvas></div></div>` : '';
  $('sajuResult').innerHTML = header + radar + `<div class="card md">${mdLite(body)}</div>`;
  if (hasScore) {
    const labels = ['총운', '재물', '애정', '직업', '건강'], data = labels.map((k) => sc[k] || 0);
    if (nyChart) nyChart.destroy();
    nyChart = new Chart($('nyRadar'), { type: 'radar', data: { labels, datasets: [{ data, fill: true, backgroundColor: 'rgba(124,107,231,.16)', borderColor: '#7C6BE7', pointBackgroundColor: '#7C6BE7' }] }, options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }, plugins: { legend: { display: false } } } });
  }
}

// ── 이름점수 (기존 naming.js 로직 이식) ──
let DICT = null;
function buildDict() {
  if (DICT) return DICT;
  const db = window.HanjaDB || { SURNAME: {}, SURNAME_COMPOUND: {}, HANJA: {} };
  const surname = {};
  for (const [hangul, arr] of Object.entries(db.SURNAME || {}))
    surname[hangul] = arr.map(([hanja, strokes, wuxing]) => ({ hangul, hanja, strokes, wuxing }));
  for (const [hangul, variants] of Object.entries(db.SURNAME_COMPOUND || {})) {
    const syl = [...hangul];
    surname[hangul] = variants.map((parts) => {
      const ps = parts.map(([hanja, strokes, wuxing], i) => ({ hangul: syl[i], hanja, strokes, wuxing }));
      return { hangul, hanja: ps.map((p) => p.hanja).join(''), strokes: ps.reduce((a, p) => a + p.strokes, 0), wuxing: ps[ps.length - 1].wuxing, parts: ps };
    });
  }
  const pool = [];
  for (const [hangul, arr] of Object.entries(db.HANJA || {}))
    arr.forEach(([hanja, strokes, wuxing]) => pool.push({ hangul, hanja, strokes, wuxing }));
  DICT = { surname, pool };
  return DICT;
}
function birthInline() {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
    <label style="font-size:12px;color:var(--ink-2)">생년월일<input id="fBirth" type="date" style="width:100%;margin-top:4px;padding:10px;border:1px solid var(--line);border-radius:10px;font-size:14px"/></label>
    <label style="font-size:12px;color:var(--ink-2)">시각<input id="fTime" type="time" value="12:00" style="width:100%;margin-top:4px;padding:10px;border:1px solid var(--line);border-radius:10px;font-size:14px"/></label>
    </div><div style="display:flex;gap:14px;margin-top:8px;flex-wrap:wrap">
    <label style="font-size:12px;display:flex;gap:5px;align-items:center"><input type="checkbox" id="fTimeUnknown"/> 시간 모름</label>
    <label style="font-size:12px;display:flex;gap:5px;align-items:center">성별<select id="fGender" style="padding:5px;border-radius:8px;border:1px solid var(--line)"><option value="M">남</option><option value="F">여</option></select></label>
    <label style="font-size:12px;display:flex;gap:5px;align-items:center">달력<select id="fCal" style="padding:5px;border-radius:8px;border:1px solid var(--line)"><option value="solar">양력</option><option value="lunar">음력</option></select></label></div>`;
}
function renderNameForm() {
  buildDict();
  $('view-reading').innerHTML = detailHead('이름점수') + `<div class="card">
    <p class="muted" style="margin:0 0 12px">이름이 사주와 얼마나 어울리는지 채점해요. <b>한자를 고르면 사주 반영 6항목</b>, 없으면 한글 4항목.</p>
    <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:10px">
      <label style="font-size:13px;font-weight:700;color:var(--ink-2)">성(한글)<input id="nSeong" maxlength="2" placeholder="김" oninput="nPopSeong()" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px"/></label>
      <label style="font-size:13px;font-weight:700;color:var(--ink-2)">성 한자<select id="nSeongHanja" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:14px"><option value="">한자 없음</option></select></label>
    </div>
    <label style="font-size:13px;font-weight:700;color:var(--ink-2);display:block;margin-top:12px">이름(한글)<input id="nName" maxlength="4" placeholder="서연" oninput="nPopName()" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px"/></label>
    <div id="nNameHanjaWrap" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"></div>
    <details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;color:var(--primary);font-weight:700">＋ 생년월일시 (한자 6항목 채점용, 선택)</summary>${birthInline()}</details>
    <button class="btn" style="margin-top:14px" onclick="runName()">이름 채점</button>
  </div><div id="sajuResult"></div>`;
  showView('reading');
}
function nPopSeong() {
  const seong = ($('nSeong').value || '').trim(), arr = DICT.surname[seong] || [];
  $('nSeongHanja').innerHTML = '<option value="">한자 없음</option>' + arr.map((a) => `<option value="${a.hanja}">${a.hanja} (${a.strokes}획·${a.wuxing})</option>`).join('');
}
function nPopName() {
  const name = ($('nName').value || '').trim();
  $('nNameHanjaWrap').innerHTML = [...name].map((h) => {
    const cands = DICT.pool.filter((p) => p.hangul === h);
    const opts = '<option value="">한자 없음</option>' + cands.map((c) => `<option value="${c.hanja}">${c.hanja} (${c.strokes}획·${c.wuxing})</option>`).join('');
    return `<label style="font-size:12px;color:var(--ink-2)">${h} 한자<select class="nNameHanja" style="width:100%;margin-top:4px;padding:10px;border:1px solid var(--line);border-radius:10px;font-size:13px">${opts}</select></label>`;
  }).join('');
}
const NAXIS_LABELS = { nature: '자연스러움', saju: '사주보완', sugri: '수리길흉', eum: '발음오행', jawon: '자원조화', eumyang: '음양조화', call: '발음편의' };
const NAXIS_ORDER = ['nature', 'saju', 'sugri', 'eum', 'jawon', 'eumyang', 'call'];
let nChart = null;
function runName() {
  const seong = ($('nSeong').value || '').trim(), name = ($('nName').value || '').trim();
  if (!seong || !name) { alert('성과 이름을 입력하세요'); return; }
  const sHanja = $('nSeongHanja').value;
  const nameSels = [...document.querySelectorAll('.nNameHanja')].map((s) => s.value);
  const chars2 = [...name];
  const fullHanja = sHanja && chars2.length === 2 && nameSels.length === 2 && nameSels.every((v) => v);
  let r;
  if (fullHanja) {
    const bd = $('fBirth') && $('fBirth').value;
    if (!bd) { alert('한자 6항목 채점은 생년월일시가 필요해요 (아래 펼쳐 입력)'); return; }
    const saju = getSaju(); if (!saju) return;
    const surnameObj = (DICT.surname[seong] || []).find((x) => x.hanja === sHanja) || { hangul: seong, hanja: sHanja, strokes: 0, wuxing: '토' };
    const chars = chars2.map((h, i) => (DICT.pool.find((p) => p.hangul === h && p.hanja === nameSels[i])) || { hangul: h, hanja: nameSels[i], strokes: 0, wuxing: '토' });
    r = window.Naming.scoreName(saju, surnameObj, chars);
  } else {
    r = window.Naming.scoreNameHangul(seong, name);
  }
  renderNameResult(r);
}
function renderNameResult(r) {
  const order = NAXIS_ORDER.filter((k) => r.axes[k] != null);
  const detail = order.map((k) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)"><span class="muted">${NAXIS_LABELS[k]}</span><b>${r.axes[k]}</b></div>`).join('');
  const gyeok = r.gyeok ? `<div style="display:flex;justify-content:space-between;padding:7px 0"><span class="muted">인격·지격·외격·총격</span><b>${r.gyeok.in.num}·${r.gyeok.ji.num}·${r.gyeok.oe.num}·${r.gyeok.chong.num}</b></div>` : '';
  $('sajuResult').innerHTML = `<div class="card">
    <div style="text-align:center"><div style="font-weight:800;font-size:16px">${r.hangul}</div>
      <div style="font-size:40px;font-weight:900;color:var(--primary)">${r.total}<span style="font-size:16px;color:var(--ink-3)">점</span></div></div>
    <div style="max-width:280px;margin:6px auto"><canvas id="nRadar" height="240"></canvas></div>
    <div style="margin-top:6px">${detail}${gyeok}</div></div>`;
  const labels = order.map((k) => NAXIS_LABELS[k]), data = order.map((k) => r.axes[k]);
  if (nChart) nChart.destroy();
  nChart = new Chart($('nRadar'), { type: 'radar', data: { labels, datasets: [{ data, fill: true, backgroundColor: 'rgba(75,123,245,.15)', borderColor: '#4B7BF5', pointBackgroundColor: '#4B7BF5' }] }, options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }, plugins: { legend: { display: false } } } });
}

/* ── 만세력 ── */
function wxOf(ch, isGan) { return (isGan ? window.Saju.GAN_WX : window.Saju.ZHI_WX)[ch] || ''; }
function tile(ch, isGan, sz) {
  const w = wxOf(ch, isGan), s = sz || 46;
  return `<div class="wx-tile wx-${w}" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.46)}px">${ch}</div>`;
}
const TABS = [['wonguk', '사주원국'], ['ohaeng', '오행과 십성'], ['shin', '신강신약'], ['daewoon', '대운수']];
function switchManseTab(t) { window._manseTab = t; $('manseBox').innerHTML = renderManse(); }
function renderManse() {
  const cur = window._manseTab || 'wonguk';
  const tabs = `<div class="tabs">${TABS.map(([k, l]) => `<div class="tab ${k === cur ? 'on' : ''}" onclick="switchManseTab('${k}')">${l}</div>`).join('')}</div>`;
  const body = cur === 'wonguk' ? manseWonguk() : cur === 'ohaeng' ? manseOhaeng() : cur === 'shin' ? manseShin() : manseDaewoon();
  return `<div class="card">${tabs}${body}</div>`;
}
// 점신 스타일 큰 타일: 한자 + (한글·오행)
function tileFull(ch, isGan) {
  const w = wxOf(ch, isGan), ko = (isGan ? GAN_KO : ZHI_KO)[ch] || '';
  const dark = (w === '토' || w === '금');
  return `<div class="wx-tile wx-${w}" style="width:100%;height:auto;aspect-ratio:1;flex-direction:column;border-radius:13px;gap:1px">
    <div style="font-size:22px;line-height:1;font-weight:900">${ch}</div>
    <div style="font-size:9px;font-weight:700;opacity:${dark ? '.7' : '.9'};letter-spacing:-.3px">${ko}·${w}${WX_HANJA[w] || ''}</div></div>`;
}
function manseWonguk() {
  const s = window._saju;
  const cols = [['시', 'time', '말년운'], ['일', 'day', '장년운'], ['월', 'month', '청년운'], ['년', 'year', '초년운']];
  const tu = s.timeUnknown, p = s.pillars, dt = s.detail || {}, sp = s.sip.pillars;
  const q = (k, i) => p[k] ? p[k][i] : '';
  const row = (lbl, fn) => `<div class="rowlbl">${lbl}</div>` + cols.map(([, k]) => fn(k)).join('');
  const cell = (v) => `<div class="cell">${v}</div>`;
  const unk = `<div class="wx-tile" style="width:100%;height:auto;aspect-ratio:1;border-radius:13px;background:var(--surface-2);color:var(--ink-3);font-size:20px">?</div>`;
  return `<div class="saju-grid saju-grid-big">
    <div class="rowlbl"></div>${cols.map(([l, , sub]) => `<div class="colhead"><b>${l}주</b><br><span style="font-weight:500;color:var(--ink-3);font-size:10px">${sub}</span></div>`).join('')}
    ${row('십성', (k) => cell(k === 'day' ? '<b>일간</b>' : (sp[k] ? sp[k].gan : '')))}
    ${row('천간', (k) => `<div class="tilecell">${(k === 'time' && tu) ? unk : tileFull(q(k, 0), true)}</div>`)}
    ${row('지지', (k) => `<div class="tilecell">${(k === 'time' && tu) ? unk : tileFull(q(k, 1), false)}</div>`)}
    ${row('십성', (k) => cell(sp[k] ? sp[k].zhi : ''))}
    ${row('지장간', (k) => cell(`<span style="font-size:11px;letter-spacing:1px">${(k === 'time' && tu) ? '-' : ((dt[k] || {}).hideGan || '')}</span>`))}
    ${row('12운성', (k) => cell(`<span style="font-size:11.5px">${(k === 'time' && tu) ? '-' : ((dt[k] || {}).unseong || '')}</span>`))}
    ${row('공망', (k) => cell(`<span style="font-size:11px;color:var(--ink-3)">${(k === 'time' && tu) ? '-' : ((dt[k] || {}).gongmang || '-')}</span>`))}
  </div>`;
}
function manseOhaeng() {
  const s = window._saju, cx = 150, cy = 150, R = 100, r = 30;
  const order = ['금', '수', '목', '화', '토'];
  const pos = order.map((o, i) => { const a = (-90 + i * 72) * Math.PI / 180; return { o, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  const pct = (o) => Math.round((s.count[o] / (s.total || 8)) * 100);
  const arrow = (p1, p2, dash) => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const x1 = p1.x + ux * r, y1 = p1.y + uy * r, x2 = p2.x - ux * (r + 6), y2 = p2.y - uy * (r + 6);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#C4C9D4" stroke-width="2" ${dash ? 'stroke-dasharray="4 4"' : ''} marker-end="url(#ah)"/>`;
  };
  let saeng = '', geuk = '';
  for (let i = 0; i < 5; i++) saeng += arrow(pos[i], pos[(i + 1) % 5], false);
  for (let i = 0; i < 5; i++) geuk += arrow(pos[i], pos[(i + 2) % 5], true);
  const circles = pos.map((pp) => {
    const dark = (pp.o === '토' || pp.o === '금') ? '#3a3a3a' : '#fff';
    return `<circle cx="${pp.x}" cy="${pp.y}" r="${r}" fill="${WXHEX[pp.o]}" opacity="${s.count[pp.o] ? 1 : 0.28}"/>
      <text x="${pp.x}" y="${pp.y - 3}" text-anchor="middle" font-size="15" font-weight="800" fill="${dark}">${pp.o}</text>
      <text x="${pp.x}" y="${pp.y + 14}" text-anchor="middle" font-size="11" font-weight="700" fill="${dark}">${pct(pp.o)}%</text>`;
  }).join('');
  const svg = `<svg viewBox="0 0 300 300" style="width:100%;max-width:300px;display:block;margin:6px auto 4px">
    <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#C4C9D4"/></marker></defs>
    ${geuk}${saeng}${circles}</svg>`;
  const legend = `<div style="display:flex;justify-content:center;gap:14px;font-size:11px;color:var(--ink-3);margin-bottom:8px"><span>실선 → 상생</span><span>점선 ⇢ 상극</span></div>`;
  const gc = s.sip.groupCount || {};
  const gcRows = Object.keys(gc).filter((k) => gc[k]).map((k) => `<span class="pill" style="box-shadow:none;background:var(--surface-2);padding:6px 12px">${k} ${gc[k]}</span>`).join('');
  return svg + legend + `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px">${gcRows}</div>`;
}
function manseShin() {
  const s = window._saju;
  const gb = (o) => Object.keys(window.Saju.SAENG).find((k) => window.Saju.SAENG[k] === o);
  const support = s.count[s.dayWx] + s.count[gb(s.dayWx)];
  const score = Math.max(4, Math.min(96, Math.round((support / (s.total || 8)) * 100)));
  const band = score >= 61 ? '신강' : score >= 40 ? '중화' : '신약';
  const bandColor = score >= 61 ? '#4B7BF5' : score >= 40 ? '#FF8A5B' : '#FFC94D';
  const cx = 150, cy = 150, R = 110;
  const ang = Math.PI - (score / 100) * Math.PI;
  const px = cx + R * Math.cos(ang), py = cy - R * Math.sin(ang);
  const arc = (col, from, to) => {
    const a1 = Math.PI - from / 100 * Math.PI, a2 = Math.PI - to / 100 * Math.PI;
    const x1 = cx + R * Math.cos(a1), y1 = cy - R * Math.sin(a1), x2 = cx + R * Math.cos(a2), y2 = cy - R * Math.sin(a2);
    return `<path d="M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}" stroke="${col}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  };
  const svg = `<svg viewBox="0 0 300 175" style="width:100%;max-width:320px;display:block;margin:0 auto">
    ${arc('#FFE08A', 0, 39)}${arc('#FFB27A', 40, 60)}${arc('#8FB0FF', 61, 100)}
    <circle cx="${px}" cy="${py}" r="10" fill="${bandColor}" stroke="#fff" stroke-width="3"/>
    <text x="150" y="120" text-anchor="middle" font-size="46" font-weight="900" fill="${bandColor}">${score}</text>
    <text x="150" y="145" text-anchor="middle" font-size="14" fill="#8A8FA3">${band}한 사주입니다</text></svg>`;
  const legend = `<div style="display:flex;justify-content:center;gap:18px;margin:6px 0 4px;font-size:12px"><span>🟡 신약 <span class="muted">0~39</span></span><span>🟠 중화 <span class="muted">40~60</span></span><span>🔵 신강 <span class="muted">61~</span></span></div>`;
  const info = `<div class="muted" style="text-align:center;line-height:1.6;margin-top:6px">${s.reason}<br/>일간 ${s.dayGan}(${s.dayWx}) · ${s.tti}띠 · 신살 ${(s.sinsal || []).join(', ') || '없음'}</div>`;
  return svg + legend + info;
}
function manseDaewoon() {
  const s = window._saju;
  const cell = (d, cur) => `<div style="flex:0 0 auto;text-align:center;padding:6px 4px;${cur ? 'background:var(--primary-soft);border-radius:12px' : ''}">
    <div class="muted" style="font-size:11px">${d.startAge}세</div>
    <div style="font-size:10px;color:var(--ink-3);margin-bottom:3px">${d.sipsin || ''}</div>
    ${tile(d.gan, true, 40)}<div style="height:4px"></div>${tile(d.zhi, false, 40)}</div>`;
  const dw = (s.daewoonList || []).slice(0, 9).map((d) => cell(d, s.daewoon && s.daewoon.startAge === d.startAge)).join('');
  const sw = s.sewoon ? `<div class="muted" style="margin-top:12px;text-align:center">올해 세운 <b style="color:var(--ink)">${s.sewoon.year} ${s.sewoon.ganzhi}</b> (${s.sewoon.sipsin})</div>` : '';
  return `<div class="section-head" style="margin:0 0 10px"><h3 style="font-size:15px">대운</h3></div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px">${dw}</div>${sw}`;
}

/* ── 프롬프트 ── */
function relLines(s) {
  const g = s.ganRel || {}, j = s.jiRel || {}, gan = [], ji = [];
  if (g.hap && g.hap.length) gan.push('천간합 ' + g.hap.join(', '));
  if (g.chung && g.chung.length) gan.push('천간충 ' + g.chung.join(', '));
  const push = (l, a) => { if (a && a.length) ji.push(l + ' ' + a.join(', ')); };
  push('육합', j.yukhap); push('삼합', j.samhap); push('반합', j.banhap); push('방합', j.banghap);
  push('충', j.chung); push('형', j.hyeong); push('파', j.pa); push('해', j.hae);
  return { gan: gan.length ? gan.join(' / ') : '없음', ji: ji.length ? ji.join(' / ') : '없음', sinsal: (s.sinsal && s.sinsal.length) ? s.sinsal.join(', ') : '없음' };
}
function deepPrompt(s) {
  const p = s.pillars, sp = s.sip.pillars, dt = s.detail || {}, tu = s.timeUnknown;
  const pKeys = tu ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'time'];
  const nm = (k) => k === 'year' ? '연' : k === 'month' ? '월' : k === 'day' ? '일' : '시';
  const sipLine = `연주 ${p.year[0]}=${sp.year.gan}/${p.year[1]}=${sp.year.zhi}, 월주 ${p.month[0]}=${sp.month.gan}/${p.month[1]}=${sp.month.zhi}, 일주 ${p.day[0]}=일간/${p.day[1]}=${sp.day.zhi}` + (tu ? '' : `, 시주 ${p.time[0]}=${sp.time.gan}/${p.time[1]}=${sp.time.zhi}`);
  const hide = pKeys.map((k) => `${nm(k)} ${p[k][1]}(${(dt[k] || {}).hideGan || ''})`).join(', ');
  const dwList = (s.daewoonList || []).map((d) => `${d.startAge}세~ ${d.ganzhi}(${d.sipsin})`).join(', ');
  const dw = s.daewoon, sw = s.sewoon, R = relLines(s);
  return `너는 20년 경력의 자평명리 상담가이자 MZ 감성 카피라이터다. 아래 사주를 정확한 명리 위에 위트 있게, 깊고 길게 "심층 캐릭터 리포트"로 써라.

[규칙]
1. 인사말 없이 첫 줄부터 일간(${s.dayGan}${s.dayWx})과 오행을 의인화한 캐릭터/물상 비유로 시작, 끝까지 유지.
2. 아래 ## 섹션들을 만든다. 제목은 신조어·밈·구어로 후킹(명리용어 직접노출 금지). 본문 2~3문단 — 구어체 공감 + 데이터 근거(간지·십신 한자병기 예 편인(偏印), 신살, OO충/반합, 십이운성) 인용 + 행동처방.
   ## (한 줄 비유) ## 타고난 성격 ## 오행과 용신 ## 십신 적성 ## 천간지지 관계 ## 신살 풀이 ## 숨은 약점 ## 강점·귀인 ## 직업·재물 ## 연애·인간관계 ## 대운 흐름 ## 올해 운세 ## 방향·마무리
3. 단정+긍정, 재치. 불행·질병·사망 단정 금지. 데이터에 없는 합충·신살 지어내지 말 것.${tu ? '\n4. 출생시각 미상 — 시주 기반 해석 금지.' : ''}

[사주 데이터]
사주팔자: 연 ${p.year} / 월 ${p.month} / 일 ${p.day}${tu ? ' / 시 미상' : ` / 시 ${p.time}`}
일간: ${s.dayGan}(${s.dayWx}), ${s.isStrong ? '신강' : '신약'}, ${s.tti}띠
오행: ${window.Saju.WX_KO.map((o) => o + s.count[o]).join(' ')}
십신 배치: ${sipLine}
지장간: ${hide}
십이운성: ${pKeys.map((k) => `${nm(k)}${(dt[k] || {}).unseong || ''}`).join(' ')}
천간관계: ${R.gan} / 지지관계: ${R.ji} / 신살: ${R.sinsal}
용신: ${(s.yongsin || []).join('·') || '-'} / 부족오행: ${(s.lacking || []).join('·') || '없음'}
대운: ${dwList}
현재대운: ${dw ? `${dw.ganzhi}(${dw.sipsin}, ${dw.startAge}세~)` : '-'} / 올해세운: ${sw ? `${sw.year} ${sw.ganzhi}(${sw.sipsin})` : '-'}`;
}
function sajuLine(s) {
  return `일간 ${s.dayGan}(${s.dayWx}) ${s.isStrong ? '신강' : '신약'} · ${s.tti}띠 · 오행 ${window.Saju.WX_KO.map((o) => o + s.count[o]).join(' ')} · 용신 ${(s.yongsin || []).join('·') || '-'} · 팔자 ${s.pillars.year}/${s.pillars.month}/${s.pillars.day}${s.timeUnknown ? '' : '/' + s.pillars.time}`;
}
function dailyPrompt(s) {
  const t = new Date();
  let gz = ''; try { gz = Solar.fromYmd(t.getFullYear(), t.getMonth() + 1, t.getDate()).getLunar().getDayInGanZhi(); } catch (e) {}
  return `너는 사주명리 상담가다. 아래 사주와 오늘 일진을 엮어 "오늘의 운세"를 가볍고 친근하게 써라. 마크다운(## 제목, **굵게**). 단정·불행 단정 금지, '~하면 좋아요' 톤. 짧고 명료하게.
## 오늘 한줄
## 총운
## 재물·일
## 애정·관계
## 건강·컨디션
## 오늘의 팁 (행운 색·시간·방향)
[데이터] 오늘 ${t.getFullYear()}.${t.getMonth() + 1}.${t.getDate()} 일진 ${gz} / ${sajuLine(s)} / 올해세운 ${s.sewoon ? s.sewoon.ganzhi : ''} / 현재대운 ${s.daewoon ? s.daewoon.ganzhi : ''}`;
}
function newyearPrompt(s) {
  return `너는 사주명리 상담가다. 아래 사주와 올해 세운을 엮어 "올해의 운세"를 깊이 있게, 위트 있게 써라. 마크다운(## 제목). 불행 단정 금지.
## 올해 한줄 요약
## 전체 흐름 (상반기·하반기)
## 재물운
## 애정·결혼운
## 직업·학업운
## 건강운
## 조심할 것 & 조언
[데이터] 올해 ${s.sewoon ? s.sewoon.year + ' 세운 ' + s.sewoon.ganzhi + '(' + s.sewoon.sipsin + ')' : ''} / 현재대운 ${s.daewoon ? s.daewoon.ganzhi + '(' + s.daewoon.sipsin + ')' : ''} / ${sajuLine(s)}`;
}
function childPrompt(s) {
  return `너는 사주명리 상담가다. 아래 자녀 사주로 아이의 타고난 기질을 따뜻하게 풀고, 부모에게 도움이 되는 양육 조언을 줘라. 마크다운(## 제목). 아이를 규정짓지 말고 '~한 기질이 있어요' 톤.
## 우리 아이 한마디
## 타고난 기질·성격
## 재능·적성
## 학습·집중 스타일
## 주의하면 좋은 점
## 부모 양육 팁
[자녀 사주] ${sajuLine(s)} / 현재대운 ${s.daewoon ? s.daewoon.ganzhi + '(' + s.daewoon.sipsin + ')' : ''}`;
}
function teenPrompt(s) {
  const dw = (s.daewoonList || []).filter((d) => d.startAge <= 19).slice(-2).map((d) => `${d.startAge}세~ ${d.ganzhi}(${d.sipsin})`).join(', ');
  return `너는 사주명리와 청소년 심리를 함께 보는 상담가다. 아래 자녀 사주와 10대 대운으로 "사춘기 예상"을 부모 관점에서 써라. 마크다운(## 제목). 겁주지 말고 대비·소통 중심.
## 사춘기 한마디
## 이 시기 성향 변화
## 부딪히기 쉬운 지점 (갈등 포인트)
## 부모의 대처법 (소통 팁)
## 아이의 강점 살리기
## 이 시기 응원
[자녀 사주] ${sajuLine(s)} / 10대 대운 ${dw || (s.daewoon ? s.daewoon.ganzhi : '')}`;
}
function dreamPrompt(text) {
  return `너는 전통 꿈해몽과 상징 해석에 능한 상담가다. 아래 꿈을 풀이해줘. 마크다운(## 제목). 단정적 흉몽 규정은 피하고 '~을 뜻할 수 있어요' 톤, 마지막은 긍정 조언.
## 꿈의 핵심 상징
## 해몽 (상징별 의미)
## 길흉·흐름
## 조언 한마디
[꿈 내용] ${text}`;
}
function gwansangPrompt() {
  return `너는 관상(觀相) 전문가다. 첨부된 얼굴 사진만으로 관상을 풀이해줘. 마크다운(## 제목, **굵게**, - 목록).
[어조] 잘생김/못생김 미추 평가 금지. 관상학적 특징을 구체 관찰(예 "눈썹이 짧은 편이라 ~", "코가 곧고 콧방울이 단단해 ~") → 의미 해석. 단정 운세 피하고 '~한 편이에요' 톤, 재미·참고용 전제.
## 얼굴 오행
## 삼정(三停) — 초년·중년·말년
## 오관(五官) — 눈썹·눈·코·입·귀
## 더 좋게 — 보완 포인트 (관리·표정·헤어 등, 강요 금지 '참고만' 톤, 의료조언 아님)
## 종합 — 인상이 말해주는 성향과 조언`;
}
function mdLite(t) {
  const esc = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (v) => v.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return esc(t).split('\n').map((line) => {
    const L = line.trim(); if (!L) return '';
    if (L.startsWith('## ')) return `<div class="mdh">${inline(L.slice(3))}</div>`;
    if (L.startsWith('# ')) return `<div class="mdh" style="font-size:18px;color:var(--ink)">${inline(L.slice(2))}</div>`;
    return `<p>${inline(L)}</p>`;
  }).join('');
}

// ── 비밀번호 게이트 (1212) ──
function passwordGate() {
  if (sessionStorage.getItem('sj_auth') === '1') return;
  const ov = document.createElement('div');
  ov.id = 'pwGate';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px';
  ov.innerHTML = `<div style="font-size:44px">🔒</div>
    <div style="font-weight:800;font-size:17px">비밀번호를 입력하세요</div>
    <input id="pwIn" type="password" inputmode="numeric" onkeydown="if(event.key==='Enter')pwCheck()" style="width:200px;padding:13px;text-align:center;font-size:18px;letter-spacing:4px;border:1px solid var(--line);border-radius:12px" />
    <button class="btn" style="width:200px" onclick="pwCheck()">입력</button>`;
  document.body.appendChild(ov);
  setTimeout(() => { const i = document.getElementById('pwIn'); if (i) i.focus(); }, 100);
}
function pwCheck() {
  if (document.getElementById('pwIn').value === '1212') {
    sessionStorage.setItem('sj_auth', '1');
    const g = document.getElementById('pwGate'); if (g) g.remove();
  } else { alert('비밀번호가 틀렸어요'); document.getElementById('pwIn').value = ''; }
}

renderNav(); renderHome(); passwordGate();
Object.assign(window, { showView, openFeature, runReading, onFacePhoto, runFace, runDream, switchManseTab, pwCheck, nPopSeong, nPopName, runName, runNewyear });
