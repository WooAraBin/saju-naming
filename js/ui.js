/* ============================================================
   ui.js — 사주앱 UI (점신 벤치마크). 계산은 window.Saju 재사용.
   ============================================================ */
'use strict';
const $ = (id) => document.getElementById(id);
const API = '/api/explain'; // 동일 오리진(배포)

/* ── i18n (KO/EN) ── */
let LANG = localStorage.getItem('lang') || 'ko';
const I18N = {
  ko: {
    appName: '운명 리더기',
    nav_home: '홈', nav_archive: '보관함', nav_me: '내 정보',
    tab1: '운세보고서', tab2: '인맥보고서', tab3: '행운보고서',
    hero_k: '오늘의 사주', hero_h: '나를 읽는 시간', hero_p: '생년월일시로 나를 깊이 풀어드려요',
    sasin_k: '동서남북을 지키는 사방신', sasin_h: '사신 (四神)',
    oh_h: '오행 (五行) 그래프', oh_p: '내 오행이 얼마나 찼는지 오각형으로 · 저장·비교',
    predict_k: '소름 돋는 미래 예측', predict_h: '가장 정확한 사주 풀이', viewall: '전체보기',
    attend_h: '오늘도 운세 보고 복주머니 챙겨요', attend_p: '출석체크 · 매일 크레딧 적립 (준비 중)',
    archive_h: '보관함', archive_empty: '보관한 결과가 없어요.', archive_sub: '본 결과는 여기 저장돼 다시 볼 수 있어요.',
    me_h: '내 정보', me_p: '로그인 · 프로필 · 크레딧 (준비 중)',
    dir_e: '동', dir_w: '서', dir_s: '남', dir_n: '북',
    pw_h: '비밀번호를 입력하세요', pw_btn: '입력', pw_wrong: '비밀번호가 틀렸어요',
    wel_enter: '들어가기', wel_tagline: '운명을 읽어주는 리더기',
    visit: (n) => `오늘 <b>${n}</b>명이 다녀갔어요`, visit_first: '첫 방문을 환영합니다',
    quick: ['☀️ 오늘의 운세', '😎 관상', '🔮 정통사주', '🎊 신년운세', '✍️ 이름점수'],
  },
  en: {
    appName: 'Destiny Reader',
    nav_home: 'Home', nav_archive: 'Archive', nav_me: 'Me',
    tab1: 'Fortune', tab2: 'Network', tab3: 'Luck',
    hero_k: 'Today’s Saju', hero_h: 'Time to read yourself', hero_p: 'A deep reading from your birth date & time',
    sasin_k: 'Four guardians of the directions', sasin_h: 'Four Gods (四神)',
    oh_h: 'Five Elements (五行) Chart', oh_p: 'See how full each element is · save & compare',
    predict_k: 'Uncannily accurate', predict_h: 'The most precise Saju reading', viewall: 'See all',
    attend_h: 'Check in daily for a lucky pouch', attend_p: 'Attendance · daily credits (coming soon)',
    archive_h: 'Archive', archive_empty: 'No saved results yet.', archive_sub: 'Your readings are saved here to revisit.',
    me_h: 'Me', me_p: 'Login · profile · credits (coming soon)',
    dir_e: 'E', dir_w: 'W', dir_s: 'S', dir_n: 'N',
    pw_h: 'Enter password', pw_btn: 'Enter', pw_wrong: 'Wrong password',
    wel_enter: 'Enter', wel_tagline: 'A reader that reads your destiny',
    visit: (n) => `<b>${n}</b> ${n === 1 ? 'person' : 'people'} visited today`, visit_first: 'Welcome, our first visitor!',
    quick: ['☀️ Daily', '😎 Face', '🔮 Saju', '🎊 New Year', '✍️ Name'],
  },
};
function t(k) { const d = I18N[LANG] || I18N.ko; return (k in d) ? d[k] : (k in I18N.ko ? I18N.ko[k] : k); }
// 기능 타일 영문명 [title, sub]
const FT_EN = {
  saju: ['Saju · Four Pillars', 'Nature & lifelong fortune'], couple: ['Compatibility', 'Two people’s bond'],
  child: ['Child Saju', 'Your child’s nature'], teen: ['Teen Phase', 'Adolescence tips'],
  daily: ['Daily Reading', 'Today’s fortune'], newyear: ['New Year', 'This year’s flow'],
  moving: ['Moving Date', 'Auspicious day & direction'], dream: ['Dream Reading', 'Last night’s dream'],
  face: ['Face Reading', 'Fortune in your face'], name: ['Name Score', 'Strokes & sound elements'],
};
const featTitle = (f) => (LANG === 'en' && FT_EN[f.id]) ? FT_EN[f.id][0] : f.title;
const featSub = (f) => (LANG === 'en' && FT_EN[f.id]) ? FT_EN[f.id][1] : f.sub;
// AI 해설 언어 지시 (프롬프트 끝에 붙임)
function aiLang() {
  return LANG === 'en'
    ? '\n\n[LANGUAGE] Write the ENTIRE response in natural, fluent English. Explain every Four Pillars term in plain words (no Chinese characters). Polite, warm tone. No slang, no self-introduction.'
    : TONE;
}
// 모든 AI 해설 공통 말투 규칙 (한국어)
const TONE = `

[말투·표현 규칙 — 꼭 지킬 것]
- 존댓말(해요·합니다체)로 쓰세요. 반말 금지.
- 인사·자기소개("안녕", "제가 풀어드릴게요" 등) 금지. 바로 본론부터.
- 한자를 출력하지 마세요. 간지·명리 용어는 모두 한글로만(예: 계수·을축·정관·상관·화개살). 괄호 안 한자도 금지.
- 명리 용어는 그냥 쓰지 말고, 쉬운 뜻과 "그래서 현실에서 어떤 모습·결과인지"를 함께 풀어 설명하세요.
- MZ 유행어·밈·신조어 제목 금지. 담백하고 쉽게(가벼운 일상어는 허용).`;
function setLang(l) {
  LANG = (l === 'en') ? 'en' : 'ko';
  localStorage.setItem('lang', LANG);
  document.documentElement.lang = LANG;
  syncLangChrome();
  renderNav(); renderHome();
  showView('home');
}
function toggleLang() { setLang(LANG === 'en' ? 'ko' : 'en'); }
function syncLangChrome() {
  const an = $('appName'); if (an) an.textContent = t('appName');
  const lt = $('langTog'); if (lt) lt.textContent = (LANG === 'en') ? '한' : 'EN';
  const me = $('view-me'); if (me) me.querySelector('.section-head h3') && (me.querySelector('.section-head h3').textContent = t('me_h'));
}

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
/* ── 라인 아이콘(SVG) — 이모지 금지, 점신 톤 ── */
const _svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const ICONS = {
  saju: _svg('<circle cx="12" cy="10.5" r="6.2"/><path d="M8.5 19.5h7M10 19.5v-1.8M14 19.5v-1.8"/><path d="M9.5 8.7c.6-1.2 1.8-2 3.2-2"/>'),
  couple: _svg('<path d="M9.2 14.5C6.8 12.6 4.5 10.8 4.5 8.4 4.5 6.7 5.8 5.5 7.3 5.5c1 0 1.7.5 2.2 1.2.5-.7 1.3-1.2 2.2-1.2 1.5 0 2.8 1.2 2.8 2.9 0 2.4-2.3 4.2-5.3 6.1z"/><path d="M16.2 18.8c-1.9-1.5-3.7-2.9-3.7-4.8 0-1.3 1-2.3 2.2-2.3.8 0 1.4.4 1.8 1 .4-.6 1-1 1.8-1 1.2 0 2.2 1 2.2 2.3 0 1.9-1.8 3.3-4.3 4.8z"/>'),
  child: _svg('<circle cx="12" cy="13" r="6.5"/><path d="M12 6.5c0-1.5 1-2.5 2.3-2.5"/><circle cx="9.8" cy="12.5" r="0.4" fill="currentColor"/><circle cx="14.2" cy="12.5" r="0.4" fill="currentColor"/><path d="M10.3 15.5c.9.8 2.5.8 3.4 0"/>'),
  teen: _svg('<path d="M12 20v-8"/><path d="M12 12C12 8.5 9.5 6.5 6 6.5c0 3.5 2.5 5.5 6 5.5z"/><path d="M12 14c0-2.8 2-4.5 5-4.5 0 2.8-2 4.5-5 4.5z"/>'),
  daily: _svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18"/>'),
  newyear: _svg('<path d="M12 3l1.2 4.2L17.5 8l-4.3 1.4L12 14l-1.2-4.6L6.5 8l4.3-.8z"/><path d="M18 14l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6zM6 15l.5 1.6 1.6.5-1.6.5L6 19.2l-.5-1.6-1.6-.5 1.6-.5z"/>'),
  moving: _svg('<path d="M4.5 11.5L12 5l7.5 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10.5 19v-5h3v5"/>'),
  dream: _svg('<path d="M19 13.5A7.5 7.5 0 0 1 10.5 5 7.5 7.5 0 1 0 19 13.5z"/><path d="M17 5l.5 1.5L19 7l-1.5.5L17 9l-.5-1.5L15 7l1.5-.5z"/>'),
  face: _svg('<circle cx="12" cy="12" r="8"/><path d="M9 10.2h.01M15 10.2h.01M11 12v2h1.6"/><path d="M9.5 16.3c1.4 1 3.6 1 5 0" stroke-width="1.4"/>'),
  name: _svg('<path d="M5 19l1.2-4L15.5 5.7a1.8 1.8 0 0 1 2.6 0l.2.2a1.8 1.8 0 0 1 0 2.6L9 17.8z"/><path d="M13.5 7.7l2.8 2.8"/>'),
  home: _svg('<path d="M4.5 11L12 4.5 19.5 11"/><path d="M6.5 9.5V19h11V9.5"/>'),
  archive: _svg('<path d="M4 8.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18V8.5"/><path d="M3.5 5h17v3.5h-17z"/><path d="M10 12h4"/>'),
  me: _svg('<circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 19.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/>'),
  share: _svg('<circle cx="6.5" cy="12" r="2.2"/><circle cx="17" cy="6" r="2.2"/><circle cx="17" cy="18" r="2.2"/><path d="M8.5 11L15 7M8.5 13.2L15 17"/>'),
};
function renderNav() {
  const items = [['home', 'home', t('nav_home')], ['archive', 'archive', t('nav_archive')], ['me', 'me', t('nav_me')]];
  $('bottomNav').innerHTML = items.map(([v, ic, l]) =>
    `<div class="nav-item ${v === 'home' ? 'on' : ''}" data-v="${v}" onclick="showView('${v}')"><div class="ico">${ICONS[ic]}</div>${l}</div>`).join('');
  syncStaticViews();
}
// 정적 뷰(보관함·내정보) 텍스트도 언어 반영
function syncStaticViews() {
  const ar = $('view-archive'); if (ar) ar.innerHTML = `<div class="section" style="padding-top:20px"><div class="section-head"><h3>${t('archive_h')}</h3></div>
    <div class="card" style="text-align:center;color:var(--ink-3);padding:40px 18px">📂<br/>${t('archive_empty')}<br/><span class="muted">${t('archive_sub')}</span></div></div>`;
  const me = $('view-me'); if (me) me.innerHTML = `<div class="section" style="padding-top:20px"><div class="section-head"><h3>${t('me_h')}</h3></div>
    <div class="card">${t('me_p')}</div></div>`;
}
// 구현 완료 기능(전부 작동). 준비중이면 여기서 빼면 '준비' 뱃지.
const DONE = new Set(['saju', 'daily', 'newyear', 'couple', 'child', 'teen', 'moving', 'dream', 'face', 'name']);
// 홈 탭 그룹: 0 운세 / 1 인맥 / 2 행운
let homeTab = 0;
const TAB_GROUPS = [['saju', 'couple', 'child', 'teen', 'daily', 'newyear'], [], ['moving', 'dream', 'face', 'name']];
const CARD_IDS = new Set(['saju', 'couple', 'child', 'teen', 'daily', 'newyear']);
function setHomeTab(i) { homeTab = i; renderHome(); }
function renderHome() {
  const tiles = TAB_GROUPS[homeTab].map((id) => {
    const f = featById(id), done = DONE.has(id);
    const badge = LANG === 'en' ? (done ? 'Live' : 'Soon') : (done ? '구현' : '준비');
    const badgeEl = `<span class="mini-badge ${done ? 'mb-done' : 'mb-todo'} card-badge">${badge}</span>`;
    if (CARD_IDS.has(id) && LANG !== 'en') {
      return `<div class="card-tile" onclick="openFeature('${id}')"><img src="img/cards/${id}.png?v=1" alt="${featTitle(f)}" />${badgeEl}</div>`;
    }
    return `<div class="card-tile ico-tile" onclick="openFeature('${id}')"><div class="ico-emoji">${f.emoji}</div><div class="ico-name">${featTitle(f)}</div>${badgeEl}</div>`;
  }).join('');
  const tabs = [t('tab1'), t('tab2'), t('tab3')].map((nm, i) => `<div class="rtab ${i === homeTab ? 'on' : ''}" onclick="setHomeTab(${i})">${nm}</div>`).join('');
  const body = TAB_GROUPS[homeTab].length
    ? `<div class="card-grid">${tiles}</div>`
    : `<div class="empty-tab">${LANG === 'en' ? 'Coming soon' : '준비 중이에요'}</div>`;
  $('view-home').innerHTML = `
    <div class="home-hd"><div class="home-title">${t('appName')} <span class="hcompass">✦</span></div></div>
    <div class="report-tabs">${tabs}</div>
    ${body}`;
}
function detailHead(title) {
  return `<div class="detail-head"><div class="back" onclick="showView('home')">‹</div><div class="title">${title}</div><div class="share">${ICONS.share}</div></div>`;
}
// 생일 입력 기반 기능(사주 엔진 파생)
const BIRTH_BTN = { saju: '사주 보기', daily: '오늘의 운세 보기', child: '자식 사주 보기', teen: '사춘기 분석 보기' };
const CHILD_SET = new Set(['child', 'teen']);

function openFeature(id) {
  const f = featById(id);
  if (id === 'newyear') return renderNewyearForm(f);
  if (id === 'couple') return renderCoupleForm(f);
  if (id === 'moving') return renderMovingForm(f);
  if (BIRTH_BTN[id]) return renderBirthForm(id, f);
  if (id === 'face') return renderFaceForm(f);
  if (id === 'dream') return renderDreamForm(f);
  if (id === 'name') return renderNameForm(f);
  $('view-reading').innerHTML = detailHead(f.title) +
    `<div class="card" style="text-align:center;color:var(--ink-3);padding:40px 18px">${f.emoji}<br/><b>${f.title}</b>는 준비 중이에요<br/><span class="muted">곧 열려요.</span></div>`;
  showView('reading');
}
function birthFields(child) {
  return `<div class="card" id="birthFormCard">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <label class="field-label">${child ? '자녀 ' : ''}생년월일
        <input id="fBirth" type="date" value="${child ? '2015-01-01' : '1990-01-01'}" class="input" /></label>
      <label class="field-label">출생 시각
        <input id="fTime" type="time" value="12:00" class="input" /></label>
    </div>
    <div class="check-row">
      <label><input type="checkbox" id="fTimeUnknown" /> 시간 모름</label>
      <label>성별 <select id="fGender"><option value="M">남</option><option value="F">여</option></select></label>
      <label>달력 <select id="fCal"><option value="solar">양력</option><option value="lunar">음력</option></select></label>
    </div>`;
}
function renderBirthForm(id, f) {
  const banner = (id === 'saju') ? `<img class="detail-banner" src="img/head_saju.jpg?v=1" alt="사주팔자" />` : '';
  $('view-reading').innerHTML = detailHead(f.title) + banner + `<div id="profileMini"></div>` + birthFields(CHILD_SET.has(id)) +
    `<button class="btn" style="margin-top:16px" onclick="runReading('${id}')">${BIRTH_BTN[id]}</button></div><div id="sajuResult"></div>`;
  showView('reading');
}
/* 입력 접힘 → 프로필 요약 카드 (점신의 프로필+변경 패턴) */
function collapseForm(s) {
  const card = $('birthFormCard'); if (!card) return;
  card.classList.add('hidden');
  const g = s.gender === 'M' ? '남성' : '여성';
  const bi = window._birthInput || {};
  const cal = bi.cal === 'lunar' ? '음력' : '양력';
  $('profileMini').innerHTML = `<div class="profile-mini">
    <div class="who"><div class="name">내 사주</div>
      <div class="birth">${(bi.bd || '').replaceAll('-', '.')} (${cal}) · ${s.timeUnknown ? '시간 모름' : bi.tm} · ${g}</div></div>
    <span class="pill-btn" onclick="expandForm()">변경</span></div>`;
}
function expandForm() {
  const card = $('birthFormCard'); if (card) card.classList.remove('hidden');
  $('profileMini').innerHTML = '';
  $('sajuResult').innerHTML = '';
}
function getSaju() {
  const bd = $('fBirth').value, tm = $('fTime').value || '12:00';
  if (!bd) { alert('생년월일을 입력해주세요'); return null; }
  window._birthInput = { bd, tm, cal: $('fCal').value };
  const [y, mo, d] = bd.split('-').map(Number), [h, mi] = tm.split(':').map(Number);
  return window.Saju.computeSaju({ year: y, month: mo, day: d, hour: h, minute: mi, gender: $('fGender').value, timeUnknown: $('fTimeUnknown').checked, isLunar: $('fCal').value === 'lunar' });
}
function callAI(prompt, image) {
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(image ? { prompt: prompt + aiLang(), image } : { prompt: prompt + aiLang() }) })
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
  window._saju = saju; window._manseTab = 'wonguk'; window._relTab = 'ganji';
  collapseForm(saju);
  if (id === 'saju') {
    $('sajuResult').innerHTML = `<div id="manseBox">${renderManse()}</div>
      <div class="section"><div class="section-head"><h3>${LANG === 'en' ? 'Your Saju Reading' : '나의 사주 풀이'}</h3></div></div>${aiLoading(LANG === 'en' ? 'Starting your reading…' : '리딩을 시작하겠습니다…')}`;
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
// ── 꿈해몽 ──
const DREAM_CHIPS = ['🐍 뱀 꿈', '💧 물·바다 꿈', '🦷 이빨 빠지는 꿈', '💰 돈 줍는 꿈', '🏃 쫓기는 꿈', '⚰️ 죽음 꿈', '🤰 임신 꿈', '🔥 불나는 꿈', '📝 시험 꿈', '💩 똥 꿈'];
const DREAM_EMOTIONS = ['무서웠어요', '불안했어요', '편안했어요', '통쾌했어요', '슬펐어요', '얼떨떨했어요'];
function renderDreamForm(f) {
  const chips = DREAM_CHIPS.map((c) => `<span class="pill" style="cursor:pointer" onclick="dreamChip('${c.replace(/^\S+ /, '')}')">${c}</span>`).join('');
  const emos = DREAM_EMOTIONS.map((e) => `<span class="pill dream-emo" style="cursor:pointer" onclick="dreamEmo(this,'${e}')">${e}</span>`).join('');
  $('view-reading').innerHTML = detailHead('꿈해몽') + `<div class="card" id="birthFormCard">
    <div class="sec-kicker">자주 찾는 꿈</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0 14px">${chips}</div>
    <label class="field-label">어젯밤 꿈
      <textarea id="fDream" rows="5" class="input" placeholder="꿈 내용을 꾸미지 말고 기억나는 그대로 적어주세요.&#10;예) 큰 구렁이가 집 안으로 들어와서 나를 물었어요"></textarea></label>
    <div class="field-label" style="margin-top:14px">꿈속에서 기분이 어땠나요? <span class="muted">(선택)</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0 2px">${emos}</div>
    <label class="field-label" style="margin-top:12px">요즘 마음에 걸리는 일 <span class="muted">(선택 — 풀이가 더 깊어져요)</span>
      <input id="fResidue" class="input" placeholder="예) 이직 고민 중이에요" /></label>
    <button class="btn" style="margin-top:16px" onclick="runDream()">꿈 풀이 보기</button>
  </div><div id="profileMini"></div><div id="sajuResult"></div>`;
  showView('reading');
}
function dreamEmo(el, e) {
  const on = el.classList.contains('on');
  document.querySelectorAll('.dream-emo').forEach((x) => { x.classList.remove('on'); x.style.cssText = 'cursor:pointer'; });
  if (!on) { el.classList.add('on'); el.style.cssText = 'cursor:pointer;background:var(--ink);color:#fff;border-color:var(--ink)'; }
  window._dreamEmo = on ? '' : e;
}
function dreamChip(t) {
  const ta = $('fDream');
  ta.value = (ta.value ? ta.value.trim() + '\n' : '') + t.replace(' 꿈', '') + ' 꿈을 꿨어요. ';
  ta.focus();
}
const DREAM_MOOD = { 길몽: ['길몽', 'ok'], 중립: ['중립', 'neutral'], 주의: ['참고', 'warn'] };
function runDream() {
  const t = ($('fDream').value || '').trim(); if (!t) { alert('꿈 내용을 입력해주세요'); return; }
  const m = window.DreamDB.match(t);
  window._dreamMatches = m;
  $('sajuResult').innerHTML = aiLoading('전통 해몽 근거 대조 중…');
  const emo = window._dreamEmo || '', residue = ($('fResidue') && $('fResidue').value || '').trim();
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: dreamPrompt(t, window.DreamDB.evidence(m), emo, residue) + aiLang() }) })
    .then((r) => r.json())
    .then((j) => renderDreamResult(j.text || '', t))
    .catch(() => { $('sajuResult').innerHTML = '<div class="card"><div class="loading">분석 실패 — 다시 시도해주세요.</div></div>'; });
}
/* 근거 카드: 어떤 전통 근거로 풀이했는지 표시 (검수·신뢰용) */
function dreamEvidenceCard(m) {
  if (!m || (!m.combos.length && !m.symbols.length && !m.situations.length)) return '';
  const tag = (t, cls) => `<span class="bdg ${cls}" style="font-size:10px">${t}</span>`;
  const row = (title, mean, zg, fk) => `<div style="padding:11px 0;border-bottom:1px dotted var(--line-2)">
    <div style="font-size:13.5px;font-weight:800;margin-bottom:3px">${title}</div>
    <div style="font-size:12.5px;color:var(--ink-mid);line-height:1.65">${mean}</div>
    ${zg ? `<div class="muted" style="margin-top:5px;line-height:1.6">『주공해몽』 ${zg}</div>` : ''}
    ${fk ? `<div class="muted" style="margin-top:3px;line-height:1.6">민속대백과 · ${fk}</div>` : ''}</div>`;
  const DB = window.DreamDB;
  let rows = '';
  m.combos.forEach((c) => {
    const s = DB.symbols.find((x) => x.id === c.sym), t = DB.situations.find((x) => x.id === c.sit);
    rows += row(`${s.name} + ${t.name} ${tag(c.pol === '길' ? '길몽' : c.pol === '주의' ? '참고' : '중립', c.pol === '길' ? 'ok' : c.pol === '주의' ? 'warn' : 'neutral')}`, c.mean, c.zg, c.fk);
  });
  m.symbols.forEach((s) => { if (!m.combos.some((c) => c.sym === s.id)) rows += row(s.name, s.mean, s.zg, s.fk); });
  m.situations.forEach((s) => { if (!m.combos.some((c) => c.sit === s.id)) rows += row(s.name, s.mean, s.zg, ''); });
  return `<div class="card">
    <div class="section-head" style="margin:0 0 4px"><h3 style="font-size:15px">해몽 근거</h3></div>
    <div class="muted" style="margin-bottom:4px">『주공해몽』(원문)과 한국민속대백과사전의 전통 해몽을 기준으로 풀이했어요.</div>
    ${rows}</div>`;
}
function renderDreamResult(text, dreamText) {
  const card = $('birthFormCard'); if (card) card.classList.add('hidden');
  const mm = text.match(/MOOD\s+(길몽|중립|주의)/);
  const km = text.match(/KEYWORDS\s+([^\n]+)/);
  const body = text.replace(/MOOD[^\n]*\n?/, '').replace(/KEYWORDS[^\n]*\n?/, '').trim();
  const mood = mm ? DREAM_MOOD[mm[1]] : null;
  const kws = km ? km[1].split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4) : [];
  const header = `<div class="card">
    <div style="display:flex;align-items:center;gap:8px">
      <div style="width:34px;height:34px;color:var(--ink)">${ICONS.dream}</div>
      <div style="flex:1;font-weight:800;font-size:16px">꿈해몽 결과</div>
      ${mood ? `<span class="bdg ${mood[1]}" style="font-size:12px;padding:5px 11px">${mood[0]}</span>` : ''}</div>
    ${kws.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">${kws.map((k) => `<span class="pill" style="padding:7px 13px;font-size:12.5px">#${k}</span>`).join('')}</div>` : ''}
    <div class="divider"></div>
    <div style="display:flex;align-items:center;gap:10px">
      <div class="muted" style="flex:1;line-height:1.6">"${dreamText.length > 80 ? dreamText.slice(0, 80) + '…' : dreamText}"</div>
      <span class="pill-btn" onclick="expandForm()">다시 풀기</span></div>
  </div>`;
  $('sajuResult').innerHTML = header + `<div class="card md">${mdLite(body)}</div>` + dreamEvidenceCard(window._dreamMatches);
  window.scrollTo(0, 0);
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
  const sw = window.Saju.sewoonForYear(saju, year);
  const yGz = sw.ganzhi, ysip = sw.sipsin;
  $('sajuResult').innerHTML = aiLoading(`${year} 신년운세 생성 중… (10~30초)`);
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: newyearPrompt2(saju, year, sw) + aiLang() }) })
    .then((r) => r.json())
    .then((j) => renderNewyearResult(j.text || '', year, yGz, ysip))
    .catch(() => { $('sajuResult').innerHTML = '<div class="card"><div class="loading">분석 실패 — 다시 시도해주세요.</div></div>'; });
}
function sewoonFlags(sw) {
  const f = [];
  if (sw.samjae) f.push(`삼재(${sw.samjae})`);
  if (sw.chungIl) f.push('태세충 — 세운지가 일지(본인)를 충: 변동·이동·건강 주의');
  if (sw.chungYear) f.push('세운지가 연지를 충: 집안·터전 변동');
  if (sw.ganChung) f.push('세운천간이 일간을 충: 관재·구설·마찰');
  if (sw.ganHap) f.push(`세운천간이 일간과 합(化${sw.ganHap}): 협력·인연·계약`);
  if (sw.dohwaYear) f.push('도화년: 인기·이성·구설');
  if (sw.yeokmaYear) f.push('역마년: 이동·이사·해외·변동');
  if (sw.hwagaeYear) f.push('화개년: 학문·종교·예술·고독');
  f.push(sw.isYongsin ? '세운 오행이 용신에 부합 — 순풍의 해' : '세운 오행이 용신과 달라 — 체감 저항 있을 수 있음');
  return f.join(' / ');
}
function newyearPrompt2(s, year, sw) {
  return `너는 20년 경력 자평명리 상담가이자 MZ 카피라이터다. ${year}년 신년운세(세운)를 아래 사주로 깊이 있게, 위트 있게 써라. 마크다운.
반드시 **첫 줄**에 아래 형식으로 5개 점수(0~100 정수)만 출력하고 줄바꿈:
SCORES 총운=?? 재물=?? 애정=?? 직업=?? 건강=??
그 다음 섹션(각 2문단, 아래 [세운] 데이터의 간지·십신·삼재·충 근거 인용):
## ${year}년 한줄 요약
## 전체 흐름 (상반기 · 하반기)
## 💰 재물운
## ❤️ 애정·결혼운
## 💼 직업·일운
## 📚 학업·시험운
## 🩺 건강운
## 🧳 이동·이사운
## 📅 월별 흐름 (1월부터 12월까지 각 월 한 줄 — 길흉 키워드 + 짧은 조언)
## ⚠️ 올해 조심할 것 (삼재·태세충이 있으면 반드시 다루되 공포 조성 금지·대처법 중심, 없으면 '큰 액운 없는 해'로 안심)
## 🍀 올해의 처방 & 응원 (용신 ${(s.yongsin || []).join('·') || '-'} 기운 보강 색·방위·습관 + 행운 색·숫자 + 응원 한마디)
- 불행·질병·사망 단정 금지, '~할 수 있어요' 톤. 데이터에 없는 것 지어내지 말 것.
[세운] ${year}년 ${sw.ganzhi}(천간 ${sw.gan}=${sw.sipsin}, 지지 ${sw.zhi}) · 오행 ${sw.wx.gan}/${sw.wx.zhi} · 특이사항: ${sewoonFlags(sw)}
[사주] 현재대운 ${s.daewoon ? s.daewoon.ganzhi + '(' + s.daewoon.sipsin + ')' : '-'} / ${sajuLine(s)}`;
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

// ── 부부 궁합 ──
let cpChart = null;
function coupleFields(sfx, label, def, gender) {
  return `<div class="card" style="margin-bottom:12px">
    <div style="font-weight:800;font-size:14px;color:var(--ink);margin-bottom:10px">${label}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <label class="field-label">생년월일<input id="cBirth${sfx}" type="date" value="${def}" class="input" /></label>
      <label class="field-label">출생 시각<input id="cTime${sfx}" type="time" value="12:00" class="input" /></label>
    </div>
    <div class="check-row">
      <label><input type="checkbox" id="cUnk${sfx}" /> 시간 모름</label>
      <label>성별 <select id="cGender${sfx}"><option value="M"${gender === 'M' ? ' selected' : ''}>남</option><option value="F"${gender === 'F' ? ' selected' : ''}>여</option></select></label>
      <label>달력 <select id="cCal${sfx}"><option value="solar">양력</option><option value="lunar">음력</option></select></label>
    </div></div>`;
}
function renderCoupleForm() {
  $('view-reading').innerHTML = detailHead('부부 궁합') +
    coupleFields('A', '나 (본인)', '1990-01-01', 'M') +
    coupleFields('B', '상대', '1992-01-01', 'F') +
    `<button class="btn" onclick="runCouple()">궁합 보기</button><div id="sajuResult"></div>`;
  showView('reading');
}
function getCoupleSaju(sfx) {
  const bd = $('cBirth' + sfx).value, tm = $('cTime' + sfx).value || '12:00';
  if (!bd) return null;
  const [y, mo, d] = bd.split('-').map(Number), [h, mi] = tm.split(':').map(Number);
  return window.Saju.computeSaju({ year: y, month: mo, day: d, hour: h, minute: mi,
    gender: $('cGender' + sfx).value, timeUnknown: $('cUnk' + sfx).checked, isLunar: $('cCal' + sfx).value === 'lunar' });
}
function runCouple() {
  const A = getCoupleSaju('A'), B = getCoupleSaju('B');
  if (!A || !B) { alert('두 사람의 생년월일을 모두 입력하세요'); return; }
  const c = window.Saju.compatibility(A, B);
  $('sajuResult').innerHTML = aiLoading('궁합 분석 중… (10~30초)');
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: couplePrompt(A, B, c) + aiLang() }) })
    .then((r) => r.json())
    .then((j) => renderCoupleResult(j.text || '', c))
    .catch(() => { $('sajuResult').innerHTML = '<div class="card"><div class="loading">분석 실패 — 다시 시도해주세요.</div></div>'; });
}
function couplePrompt(A, B, c) {
  const rel = (r) => r.t + (r.wx ? `(化${r.wx})` : '');
  const bo = c.aHelpsB && c.bHelpsA ? '서로의 부족한 기운을 채워줌(쌍방)' : c.aHelpsB ? '내가 상대의 부족 기운을 채워줌' : c.bHelpsA ? '상대가 나의 부족 기운을 채워줌' : '오행 보완은 약함';
  return `너는 20년 경력 자평명리 궁합(宮合) 상담가이자 MZ 카피라이터다. 아래 두 사람의 궁합을 정확한 명리 위에 위트 있게, 현실 조언까지 마크다운으로 써라.
[규칙]
1. 첫 줄부터 두 사람을 캐릭터로 의인화한 한 줄 비유로 시작.
2. 아래 ## 섹션(각 2문단, 아래 [궁합 데이터]의 간지·십신·합충·원진 근거 인용):
   ## 한 줄 궁합
   ## 성격 케미 (일간 ${c.gA}×${c.gB}, 십신)
   ## 애정·부부궁 (일지 ${rel(c.iljiRel)} 해석 — 잠자리·정서 포함하되 노골 금지)
   ## 현실 궁합 (오행 보완·생활 밸런스)
   ## 삐걱대는 지점 (충·원진·겁재 있으면 솔직히 + 극복법)
   ## 롱런 팁 & 응원
3. 불행·이혼 단정 금지, '~한 편이에요/~하면 좋아요' 톤. 데이터에 없는 것 지어내지 말 것. 점수는 이미 화면에 있으니 반복 금지.
[궁합 데이터]
나: 일간 ${c.gA}(${c.wxA}) ${c.ttiA}띠 / 상대: 일간 ${c.gB}(${c.wxB}) ${c.ttiB}띠
천간(일간) 관계: ${c.ganRel}${c.ganHap ? `(化${c.ganHap})` : ''}
일지(부부궁) 관계: ${rel(c.iljiRel)} · 띠(연지) 관계: ${rel(c.ttiRel)}
십신: 상대는 나에게 ${c.sipAtoB || '-'}, 나는 상대에게 ${c.sipBtoA || '-'}
오행 보완: ${bo}
종합 점수(참고): ${c.total}점`;
}
function renderCoupleResult(text, c) {
  const heart = c.total >= 80 ? '💞' : c.total >= 60 ? '💗' : c.total >= 45 ? '💛' : '🩹';
  const header = `<div class="card" style="background:linear-gradient(135deg,#FFE9EE,#FFF0E6);text-align:center">
    <div style="font-size:13px;color:var(--ink-mid)">${heart} 궁합 지수</div>
    <div style="font-size:44px;font-weight:900;color:#E8557A">${c.total}<span style="font-size:16px;color:var(--ink-soft)">점</span></div>
    <div class="muted" style="font-size:12.5px">일간 ${c.gA}×${c.gB} · ${c.ttiA}띠×${c.ttiB}띠 · 부부궁 ${c.iljiRel.t}</div></div>`;
  const radar = `<div class="card"><div style="max-width:300px;margin:0 auto"><canvas id="cpRadar" height="260"></canvas></div></div>`;
  $('sajuResult').innerHTML = header + radar + `<div class="card md">${mdLite(text)}</div>`;
  const labels = Object.keys(c.axes), data = labels.map((k) => c.axes[k]);
  if (cpChart) cpChart.destroy();
  cpChart = new Chart($('cpRadar'), { type: 'radar', data: { labels, datasets: [{ data, fill: true,
    backgroundColor: 'rgba(232,85,122,.16)', borderColor: '#E8557A', pointBackgroundColor: '#E8557A' }] },
    options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }, plugins: { legend: { display: false } } } });
}

// ── 이사 택일 ──
function renderMovingForm() {
  const y = new Date().getFullYear();
  const years = [y, y + 1].map((yy) => `<option value="${yy}">${yy}년</option>`).join('');
  $('view-reading').innerHTML = detailHead('이사 택일') + birthFields(false) +
    `<label style="font-size:13px;font-weight:700;color:var(--ink-2);display:block;margin-top:12px">이사할 해
      <select id="mvYear" style="margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;width:130px;font-size:15px">${years}</select></label>
     <button class="btn" style="margin-top:16px" onclick="runMoving()">이사 길방·길일 보기</button></div><div id="sajuResult"></div>`;
  showView('reading');
}
function runMoving() {
  const saju = getSaju(); if (!saju) return;
  const year = parseInt($('mvYear').value) || new Date().getFullYear();
  const g = window.Saju.movingGuide(saju, year);
  $('sajuResult').innerHTML = aiLoading('이사 길방·길일 분석 중… (10~30초)');
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: movingPrompt(saju, g) + aiLang() }) })
    .then((r) => r.json())
    .then((j) => renderMovingResult(j.text || '', g))
    .catch(() => { $('sajuResult').innerHTML = '<div class="card"><div class="loading">분석 실패 — 다시 시도해주세요.</div></div>'; });
}
function movingPrompt(s, g) {
  const good = g.netGood.length ? g.netGood.join('·') : '뚜렷한 길방은 약함(중앙·안정 위주)';
  const conf = g.conflict.length ? ` (단 ${g.conflict.join('·')}은 용신 방위지만 올해 흉살과 겹쳐 주의)` : '';
  const bad = g.badDirs.map((b) => b.name + ' ' + b.reason).join(', ');
  const days = g.sonNo.slice(0, 6).map((d) => `${d.solar}(${d.wd})`).join(', ');
  return `너는 자평명리 이사 택일 상담가다. 아래 데이터로 ${g.year}년 이사 조언을 마크다운으로 써라. 공포·미신 조장 금지, 근거와 실용 위주 '~하면 좋아요' 톤.
## ${g.year}년 이사, 한 줄 요약
## 좋은 방향 (용신 ${(s.yongsin || []).join('·') || '-'} 기준으로 왜 좋은지)
## 피할 방향 (삼살방·대장군방이 뭔지 쉽게 + 꼭 그쪽이면 대처)
## 이사하기 좋은 날 (아래 손 없는 날 중 추천 + 준비 팁)
## 마무리 조언
[데이터]
본인: 일간 ${s.dayGan}(${s.dayWx}) ${s.tti}띠 · 용신 ${(s.yongsin || []).join('·') || '-'}
${g.year}년(세지 ${g.yearZhi}) 좋은 방향: ${good}${conf}
피할 방향: ${bad}
손 없는 날(가까운 순): ${days}`;
}
function renderMovingResult(text, g) {
  const chip = (t, cls, sub) => `<span class="dir-chip ${cls}">${t}${sub ? ` <em>${sub}</em>` : ''}</span>`;
  const goodChips = (g.netGood.length ? g.netGood : ['중앙·안정']).map((d) => chip(d, 'good')).join('');
  const badChips = g.badDirs.map((b) => chip(b.name, 'bad', b.reason)).join('');
  const days = g.sonNo.map((d) => `<div class="son-day"><b>${d.solar}</b><span>${d.wd}요일 · ${d.lunar}</span></div>`).join('');
  const header = `<div class="card"><div class="mv-grid">
    <div><div class="mv-lbl">🧭 좋은 방향</div><div class="dir-wrap">${goodChips}</div></div>
    <div><div class="mv-lbl">⚠️ 피할 방향</div><div class="dir-wrap">${badChips}</div></div></div>
    ${g.conflict.length ? `<div class="muted" style="margin-top:10px;font-size:12px">※ ${g.conflict.join('·')}은 용신 방위지만 올해 흉살과 겹쳐 주의하세요.</div>` : ''}</div>`;
  const daycard = `<div class="card"><div class="mv-lbl">📅 손 없는 날 (가까운 순)</div><div class="son-list">${days}</div></div>`;
  $('sajuResult').innerHTML = header + daycard + `<div class="card md">${mdLite(text)}</div>`;
}

// ── 오행 수치화 레이더 + Supabase 저장/비교 ──
const SB_URL = 'https://eepbqgcguyyikpsovsta.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcGJxZ2NndXl5aWtwc292c3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTgzMTgsImV4cCI6MjA5Nzc5NDMxOH0.WRkjrf942X8HvEWwvuPooJ1T_NwwVuXPv4ZRkSNdOgo';
let _sb = null;
function sb() { if (_sb) return _sb; if (!window.supabase) return null; _sb = window.supabase.createClient(SB_URL, SB_KEY); return _sb; }
function clientId() {
  let id = localStorage.getItem('saju_client_id');
  if (!id) { id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'c' + Date.now() + Math.random().toString(16).slice(2); localStorage.setItem('saju_client_id', id); }
  return id;
}
const OH_ORDER = ['목', '화', '토', '금', '수'];
const OH_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
const OH_COLORS = { 목: '#2E9E5B', 화: '#E8443A', 토: '#D6A43C', 금: '#8A94A6', 수: '#3E7BE0' };
const OH_PALETTE = ['#7C6BE7', '#E8557A', '#2E9E5B', '#E8843A', '#3E7BE0', '#8A5AD6', '#12B5A6', '#D4472F'];
const OH_FILE = { 목: 'mok', 화: 'hwa', 토: 'to', 금: 'geum', 수: 'su' };
const OH_IMG = {};
OH_ORDER.forEach((o) => { const im = new Image(); im.src = `img/sasin/elem/${OH_FILE[o]}.png?v=4`; im.onload = () => { Object.values(_ohCharts).forEach((c) => { try { c && c.draw(); } catch (e) {} }); }; OH_IMG[o] = im; });
function ohElemRow(size) {
  return `<div class="oh-elem-row">${OH_ORDER.map((o) => `<img src="img/sasin/elem/${OH_FILE[o]}.png?v=4" alt="${OH_HANJA[o]}" style="height:${size}px" />`).join('')}</div>`;
}
const _ohCharts = {};
let _ohLast = null;
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

function openOhaeng() { renderOhaengForm(); }
function renderOhaengForm() {
  $('view-reading').innerHTML = detailHead('오행 그래프') +
    `<div class="card" style="text-align:center;padding:16px 14px 12px">${ohElemRow(56)}<div class="muted" style="font-size:12.5px;margin-top:6px">목·화·토·금·수 — 내 사주 오행이 얼마나 찼는지 오각형으로 봅니다</div></div>` +
    birthFields(false) +
    `<label class="field-label" style="margin-top:12px">이름/별명 <span class="muted" style="font-weight:400">(저장·비교용)</span><input id="ohName" class="input" placeholder="예: 나, 김도근" /></label>
     <button class="btn" style="margin-top:14px" onclick="runOhaeng()">오행 그래프 보기</button></div>
     <div id="sajuResult"></div>
     <div class="section" style="padding:10px 16px 6px"><div class="section-head"><div><div class="sec-kicker">이 기기에 저장된 사람들</div><h3>오행 비교</h3></div><span class="more" onclick="renderOhaengList()">새로고침</span></div></div>
     <div id="ohList"></div>`;
  showView('reading');
  renderOhaengList();
}
function runOhaeng() {
  const saju = getSaju(); if (!saju) return;
  const scores = window.Saju.ohaengScores(saju);
  const name = ($('ohName') && $('ohName').value.trim()) || '나';
  _ohLast = { name, birth: window._birthInput ? window._birthInput.bd : '', scores };
  $('sajuResult').innerHTML =
    `<div class="card"><div style="max-width:340px;margin:0 auto"><canvas id="ohRadar" width="340" height="300"></canvas></div>
      <div class="oh-nums">${OH_ORDER.map((o) => `<div class="oh-num" style="--c:${OH_COLORS[o]}"><span class="ohh">${OH_HANJA[o]}</span><b>${scores[o].idx}</b><em>${scores[o].count}개</em></div>`).join('')}</div></div>
     <div class="card" style="padding:12px"><button class="btn" onclick="saveOhaeng()">＋ 이 사람 저장하기</button></div>`;
  drawOhRadar('ohRadar', [{ name, scores, color: '#7C6BE7' }]);
}
// 오방색 한자 뱃지를 꼭짓점에 그리는 플러그인 + 레이더 생성
function drawOhRadar(id, people) {
  const datasets = people.map((p) => ({ label: p.name, data: OH_ORDER.map((o) => p.scores[o].idx),
    fill: true, backgroundColor: hexA(p.color, people.length > 1 ? 0.10 : 0.16),
    borderColor: p.color, pointBackgroundColor: p.color, borderWidth: 2, pointRadius: 2 }));
  const badge = { id: 'ohBadge', afterDraw(chart) {
    const s = chart.scales.r; if (!s) return; const ctx = chart.ctx;
    OH_ORDER.forEach((o, i) => {
      const ang = (i * 2 * Math.PI / 5) - Math.PI / 2, r = s.drawingArea + 20;
      const x = s.xCenter + r * Math.cos(ang), y = s.yCenter + r * Math.sin(ang);
      const im = OH_IMG[o], D = 38;
      if (im && im.complete && im.naturalWidth) {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
        ctx.drawImage(im, x - D / 2, y - D / 2, D, D); ctx.restore();
      } else { // 로드 전 폴백: 오방색 한자 마크
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fillStyle = OH_COLORS[o]; ctx.fill();
        ctx.fillStyle = (o === '금') ? '#2A2E38' : '#fff'; ctx.font = 'bold 15px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(OH_HANJA[o], x, y + 1); ctx.restore();
      }
    });
  } };
  if (_ohCharts[id]) _ohCharts[id].destroy();
  _ohCharts[id] = new Chart($(id), { type: 'radar', data: { labels: OH_ORDER, datasets },
    options: { layout: { padding: 30 }, scales: { r: { min: 0, max: 100,
      ticks: { stepSize: 20, display: false }, pointLabels: { display: false },
      grid: { color: '#E5E7EE' }, angleLines: { color: '#E5E7EE' } } },
      plugins: { legend: { display: people.length > 1, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } },
    plugins: [badge] });
}
async function saveOhaeng() {
  if (!_ohLast) return;
  const c = sb(); if (!c) { alert('저장 모듈을 불러오지 못했어요.'); return; }
  const { error } = await c.from('ohaeng_profiles').insert({ client_id: clientId(), name: _ohLast.name, birth: _ohLast.birth, scores: _ohLast.scores });
  if (error) { alert('저장 실패: ' + error.message + '\n(Supabase에 ohaeng_profiles 테이블이 필요합니다)'); return; }
  alert(`'${_ohLast.name}' 저장됐어요`); renderOhaengList();
}
async function renderOhaengList() {
  const box = $('ohList'); if (!box) return;
  const c = sb(); if (!c) { box.innerHTML = ''; return; }
  const { data, error } = await c.from('ohaeng_profiles').select('*').eq('client_id', clientId()).order('created_at', { ascending: false }).limit(24);
  if (error) { box.innerHTML = `<div class="card muted" style="font-size:12px;text-align:center">저장 목록을 불러오지 못했어요 (테이블 준비 전).</div>`; return; }
  if (!data || !data.length) { box.innerHTML = `<div class="card muted" style="font-size:12.5px;text-align:center;padding:22px">아직 저장된 사람이 없어요.<br/>오행을 보고 ‘저장’을 눌러보세요.</div>`; return; }
  box.innerHTML = `<div class="card"><div class="mv-lbl">저장된 ${data.length}명 겹쳐보기</div>
      <div style="max-width:340px;margin:0 auto"><canvas id="ohAll" width="340" height="300"></canvas></div>
      <div class="oh-names">${data.map((d, i) => `<span class="oh-name-chip" style="--c:${OH_PALETTE[i % OH_PALETTE.length]}">${d.name}<button class="oh-del" onclick="delOhaeng('${d.id}')">×</button></span>`).join('')}</div></div>`;
  drawOhRadar('ohAll', data.map((d, i) => ({ name: d.name, scores: d.scores, color: OH_PALETTE[i % OH_PALETTE.length] })));
}
async function delOhaeng(id) {
  const c = sb(); if (!c) return;
  await c.from('ohaeng_profiles').delete().eq('id', id).eq('client_id', clientId());
  renderOhaengList();
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
const TABS = [['wonguk', '사주원국'], ['gwangye', '사주관계'], ['ohaeng', '오행과 십성'], ['shin', '신강신약'], ['daewoon', '대운수']];
const TAB_HELP = {
  wonguk: ['사주원국', '<ul><li><b>사주원국(四柱原局)</b>: 태어난 연·월·일·시 네 기둥의 천간과 지지. 나를 이루는 기본 설계도입니다.</li><li><b>십성</b>: 일간(나)을 기준으로 각 글자가 맺는 관계의 이름.</li><li><b>지장간</b>: 지지 속에 숨어 있는 천간.</li><li><b>12운성</b>: 기운의 생로병사 단계.</li></ul>'],
  gwangye: ['사주관계', '<ul><li><b>합(合)</b>: 글자끼리 끌어당겨 힘을 합치는 관계.</li><li><b>충(沖)</b>: 정면으로 부딪쳐 변동을 만드는 관계.</li><li><b>형·파·해</b>: 마찰·조정·소모를 뜻하는 관계.</li><li><b>신살·길성</b>: 특정 조합이 만드는 특별한 기운.</li></ul>'],
  ohaeng: ['오행과 십성', '<ul><li><b>오행</b>: 목·화·토·금·수 다섯 기운의 분포. 화살표 실선은 상생(生), 점선은 상극(剋).</li><li><b>부족/적정/과다</b>: 8글자 중 해당 오행이 차지하는 비중 기준.</li><li><b>십성</b>: 오행을 일간과의 관계로 다시 읽은 것.</li></ul>'],
  shin: ['신강신약', '<ul><li><b>신강(身強)</b>: 일간을 돕는 기운(비겁·인성)이 강한 사주.</li><li><b>신약(身弱)</b>: 일간을 빼는 기운이 강한 사주.</li><li>강약 자체는 좋고 나쁨이 아니라, 필요한 기운(용신)을 찾는 기준입니다.</li></ul>'],
  daewoon: ['대운/세운', '<ul><li><b>대운(大運)</b>: 10년 단위로 흐르는 큰 운. 삶의 성향·직업운·전환점에 영향.</li><li><b>세운(歲運)</b>: 해마다 바뀌는 운. 사건 발생·감정 흐름을 민감하게 투영.</li><li>점선 테두리가 현재 위치입니다.</li></ul>'],
};
function switchManseTab(t) { window._manseTab = t; $('manseBox').innerHTML = renderManse(); }
function switchRelTab(t) { window._relTab = t; $('manseBox').innerHTML = renderManse(); }
function renderManse() {
  const cur = window._manseTab || 'wonguk';
  const tabs = `<div class="tabs">${TABS.map(([k, l]) => `<div class="tab ${k === cur ? 'on' : ''}" onclick="switchManseTab('${k}')">${l}</div>`).join('')}</div>`;
  const h = TAB_HELP[cur];
  const head = `<div class="section-head" style="margin:2px 2px 16px"><h3 style="font-size:17px">${h[0]}</h3><span class="help-q" onclick="openSheet('${cur}')">?</span></div>`;
  const body = cur === 'wonguk' ? manseWonguk() : cur === 'gwangye' ? manseGwangye() : cur === 'ohaeng' ? manseOhaeng() : cur === 'shin' ? manseShin() : manseDaewoon();
  return `<div class="card">${tabs}${head}${body}</div>`;
}
// 큰 타일: 한자 + (한글·오행) — 라벨 항상 동반(색 단독 식별 금지)
function tileFull(ch, isGan) {
  const w = wxOf(ch, isGan), ko = (isGan ? GAN_KO : ZHI_KO)[ch] || '';
  return `<div class="wx-tile tile-big wx-${w}">
    <div class="han">${ch}</div>
    <div class="sub">${ko}·${w}${WX_HANJA[w] || ''}</div></div>`;
}
function manseWonguk() {
  const s = window._saju;
  const cols = [['시', 'time', '말년운'], ['일', 'day', '장년운'], ['월', 'month', '청년운'], ['년', 'year', '초년운']];
  const tu = s.timeUnknown, p = s.pillars, dt = s.detail || {}, sp = s.sip.pillars;
  const q = (k, i) => p[k] ? p[k][i] : '';
  const row = (lbl, fn) => `<div class="rowlbl">${lbl}</div>` + cols.map(([, k]) => fn(k)).join('');
  const cell = (v, muted) => `<div class="cell ${muted ? 'muted-cell' : ''}">${v}</div>`;
  const unk = `<div class="wx-tile tile-big tile-unknown"><div class="han">?</div><div class="sub">시간 모름</div></div>`;
  return `<div class="saju-grid">
    <div class="rowlbl"></div>${cols.map(([l, , sub]) => `<div class="colhead"><b>${l}주</b><br><span class="sub">${sub}</span></div>`).join('')}
    ${row('십성', (k) => cell(k === 'day' ? '<b>일원</b>' : (sp[k] ? sp[k].gan : '')))}
    ${row('천간', (k) => `<div class="tilecell">${(k === 'time' && tu) ? unk : tileFull(q(k, 0), true)}</div>`)}
    ${row('지지', (k) => `<div class="tilecell">${(k === 'time' && tu) ? unk : tileFull(q(k, 1), false)}</div>`)}
    ${row('십성', (k) => cell(sp[k] ? sp[k].zhi : ''))}
    ${row('지장간', (k) => cell(`<span style="letter-spacing:1px">${(k === 'time' && tu) ? '-' : ((dt[k] || {}).hideGan || '')}</span>`, true))}
    ${row('12운성', (k) => cell((k === 'time' && tu) ? '-' : ((dt[k] || {}).unseong || ''), true))}
    ${row('공망', (k) => cell((k === 'time' && tu) ? '-' : ((dt[k] || {}).gongmang || '-'), true))}
  </div>`;
}
/* ── 사주관계: 충·합 다이어그램 + 신살·길성 ── */
const _GAN_ORD = '甲乙丙丁戊己庚辛壬癸', _ZHI_ORD = '子丑寅卯辰巳午未申酉戌亥';
function hanPairKo(txt) { // 甲庚 → 갑경, 戌辰 → 진술(관용 순서로 정렬)
  const ord = (c) => { const g = _GAN_ORD.indexOf(c); return g >= 0 ? g : _ZHI_ORD.indexOf(c); };
  return [...txt].sort((a, b) => ord(a) - ord(b)).map((c) => GAN_KO[c] || ZHI_KO[c] || c).join('');
}
function relBrackets(list, colIdx, dir, baseOffset) {
  // list: [{a,b,label}] a,b = 표시 열 index(0=시,1=일,2=월,3=년)
  const W = 100 / 4;
  return list.map((r, i) => {
    const lo = Math.min(r.a, r.b), hi = Math.max(r.a, r.b);
    const left = (lo + 0.5) * W, width = (hi - lo) * W;
    const off = baseOffset + i * 26;
    const pos = dir === 'up' ? `top:${-off - 10}px` : `bottom:${-off - 10}px`;
    const tag = dir === 'up' ? `top:-18px` : `bottom:-18px`;
    return `<div class="rel-bracket ${dir === 'down' ? 'down' : ''}" style="left:${left}%;width:${width}%;${pos}">
      <span class="rel-tag" style="${tag}">${r.label}</span></div>`;
  }).join('');
}
function parseRelPos(str) { // "...(연·월...)" → 열 index (표시는 시0 일1 월2 년3, 데이터는 연0 월1 일2 시3)
  const MAP = { 연: 3, 월: 2, 일: 1, 시: 0 };
  const m = str.match(/([연월일시])·([연월일시])/);
  return m ? { a: MAP[m[1]], b: MAP[m[2]] } : null;
}
function manseGwangye() {
  const s = window._saju, tu = s.timeUnknown, p = s.pillars;
  const rt = window._relTab || 'ganji';
  const subtabs = `<div class="subtabs">
    <div class="subtab ${rt === 'ganji' ? 'on' : ''}" onclick="switchRelTab('ganji')">천간과 지지</div>
    <div class="subtab ${rt === 'sinsal' ? 'on' : ''}" onclick="switchRelTab('sinsal')">신살과 길성</div></div>`;
  const colKeys = ['time', 'day', 'month', 'year'];
  const colLbls = ['시간', '일간', '월간', '년간'];
  const colLbls2 = ['시지', '일지', '월지', '년지'];
  const gTile = (k) => (k === 'time' && tu) ? `<div class="wx-tile tile-big tile-unknown"><div class="han">?</div><div class="sub">모름</div></div>` : tileFull(p[k][0], true);
  const zTile = (k) => (k === 'time' && tu) ? `<div class="wx-tile tile-big tile-unknown"><div class="han">?</div><div class="sub">모름</div></div>` : tileFull(p[k][1], false);
  if (rt === 'sinsal') {
    // 신살을 주(柱)별로 매핑: (지지) 표기는 해당 지지가 있는 주, (X주)는 그 주
    const per = { time: [], day: [], month: [], year: [] };
    const rest = [];
    const KEYIDX = { 연: 'year', 월: 'month', 일: 'day', 시: 'time' };
    (s.sinsal || []).forEach((sin) => {
      let m = sin.match(/\(([연월일시])주\)/);
      if (m) { per[KEYIDX[m[1]]].push(sin.replace(/\(.+\)/, '')); return; }
      m = sin.match(/\((.)\)/);
      if (m) {
        let hit = false;
        colKeys.forEach((k) => { if (p[k] && p[k][1] === m[1]) { per[k].push(sin.replace(/\(.+\)/, '')); hit = true; } });
        if (hit) return;
      }
      rest.push(sin);
    });
    const cellOf = (k) => { const a = per[k]; return `<div class="sinsal-cell ${a.length ? '' : 'none'}">${a.length ? a.join('<br>') : '-'}</div>`; };
    return subtabs + `<div class="sinsal-table">
      <div class="rowlbl">지지</div>${colKeys.map((k) => `<div class="tilecell">${zTile(k)}</div>`).join('')}
      <div class="rowlbl">신살<br>길성</div>${colKeys.map(cellOf).join('')}
    </div>` + (rest.length ? `<div class="muted" style="margin-top:12px">그 외: ${rest.join(', ')}</div>` : '');
  }
  // 천간과 지지 — 괄호 다이어그램
  const ganRels = [], jiRels = [];
  (s.ganRel.chung || []).forEach((r) => { const q = parseRelPos(r); if (q) ganRels.push({ ...q, label: hanPairKo(r.slice(0, 2)) + '충' }); });
  (s.ganRel.hap || []).forEach((r) => { const q = parseRelPos(r); if (q) ganRels.push({ ...q, label: hanPairKo(r.slice(0, 2)) + '합' }); });
  const JT = [['chung', '충'], ['yukhap', '육합'], ['hyeong', '형'], ['pa', '파'], ['hae', '해']];
  JT.forEach(([key, nm]) => (s.jiRel[key] || []).forEach((r) => {
    const q = parseRelPos(r); if (q) jiRels.push({ ...q, label: hanPairKo(r.slice(0, 2)) + nm });
  }));
  const upH = ganRels.length ? 20 + ganRels.length * 26 : 8;
  const dnH = jiRels.length ? 20 + jiRels.length * 26 : 8;
  const hapChips = [...(s.jiRel.samhap || []), ...(s.jiRel.banhap || []), ...(s.jiRel.banghap || [])]
    .map((t) => `<span class="pill" style="padding:6px 12px;font-size:12px">${t.split('(')[0]}</span>`).join('');
  return subtabs + `<div class="rel-diagram">
    <div style="height:${upH}px"></div>
    <div class="rel-zone">${relBrackets(ganRels, null, 'up', 8)}
      <div class="rel-cols">${colLbls.map((l) => `<div class="rel-lbl">${l}</div>`).join('')}</div>
      <div class="rel-cols">${colKeys.map(gTile).join('')}</div></div>
    <div style="height:12px"></div>
    <div class="rel-zone">
      <div class="rel-cols">${colKeys.map(zTile).join('')}</div>
      <div class="rel-cols">${colLbls2.map((l) => `<div class="rel-lbl">${l}</div>`).join('')}</div>
      ${relBrackets(jiRels, null, 'down', 26)}</div>
    <div style="height:${dnH + 8}px"></div>
    ${hapChips ? `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${hapChips}</div>` : ''}
  </div>`;
}
/* 오행별 십성 분해: 8자리(시간모름 6) 전부의 십성 카운트 */
function sipsinBreakdown(s) {
  const Sj = window.Saju;
  const keys = s.timeUnknown ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'time'];
  const cnt = {}; let total = 0;
  keys.forEach((k) => {
    const gz = s.pillars[k]; if (!gz) return;
    const gs = k === 'day' ? '비견' : Sj.sipsin(s.dayGan, gz[0]); // 일간 = 비견 취급(점신 방식)
    const zs = s.sip.pillars[k] ? s.sip.pillars[k].zhi : '';
    [gs, zs].forEach((x) => { if (x) { cnt[x] = (cnt[x] || 0) + 1; total++; } });
  });
  return { cnt, total };
}
const WX_GROUP_PAIR = { 비겁: ['비견', '겁재'], 식상: ['식신', '상관'], 재성: ['편재', '정재'], 관성: ['편관', '정관'], 인성: ['편인', '정인'] };
function wxGroupOf(s, o) { // 오행 o가 일간 기준 어느 십성 그룹인지
  const Sj = window.Saju, d = s.dayWx;
  if (o === d) return '비겁';
  if (Sj.SAENG[d] === o) return '식상';
  if (Sj.GEUK[d] === o) return '재성';
  if (Sj.GEUK[o] === d) return '관성';
  if (Sj.SAENG[o] === d) return '인성';
  return '';
}
function manseOhaeng() {
  const s = window._saju, cx = 150, cy = 148, R = 100, r = 33;
  const order = ['금', '수', '목', '화', '토'];
  const pos = order.map((o, i) => { const a = (-90 + i * 72) * Math.PI / 180; return { o, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  const pctOf = (o) => Math.round((s.count[o] / (s.total || 8)) * 1000) / 10;
  // 화살표: 상생 = 실선(진회색, 바깥 링), 상극 = 점선(연회색, 안쪽 별)
  const arrow = (p1, p2, dash, col, gap) => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const x1 = p1.x + ux * (r + gap), y1 = p1.y + uy * (r + gap), x2 = p2.x - ux * (r + gap + 6), y2 = p2.y - uy * (r + gap + 6);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="1.6" ${dash ? 'stroke-dasharray="3 4"' : ''} marker-end="url(#${dash ? 'ahg' : 'ahd'})"/>`;
  };
  let saeng = '', geuk = '';
  for (let i = 0; i < 5; i++) saeng += arrow(pos[i], pos[(i + 1) % 5], false, '#6A6F7E', 2);
  for (let i = 0; i < 5; i++) geuk += arrow(pos[i], pos[(i + 2) % 5], true, '#C9CCD5', 2);
  const WXFILL = { 목: '#4C7DFF', 화: '#FF6B6B', 토: '#FFC94D', 금: '#B9BEC9', 수: '#26282F' };
  const circles = pos.map((pp) => {
    const pct = pctOf(pp.o);
    const fillH = Math.max(0, Math.min(1, pct / 100)) * (r * 2);
    const clipId = `wxc-${pp.o}`;
    // 흰 원 + 아래에서 차오르는 오행색 + 큰 % + 하단 오행 뱃지
    return `<clipPath id="${clipId}"><circle cx="${pp.x}" cy="${pp.y}" r="${r - 1}"/></clipPath>
      <circle cx="${pp.x}" cy="${pp.y}" r="${r}" fill="#fff" stroke="#E2E4EA" stroke-width="1.5"/>
      <rect x="${pp.x - r}" y="${pp.y + r - fillH}" width="${r * 2}" height="${fillH}" fill="${WXFILL[pp.o]}" opacity="0.9" clip-path="url(#${clipId})"/>
      <text x="${pp.x}" y="${pp.y + 1}" text-anchor="middle" font-size="14.5" font-weight="800" fill="${pct >= 62 ? '#fff' : '#17181D'}">${pct}%</text>
      <g><rect x="${pp.x - 11}" y="${pp.y + r - 12}" width="22" height="20" rx="6" fill="${WXFILL[pp.o]}" stroke="${pp.o === '토' ? '#F0B72E' : 'none'}"/>
      <text x="${pp.x}" y="${pp.y + r + 3}" text-anchor="middle" font-size="12" font-weight="900" fill="${pp.o === '토' ? '#4A3400' : (pp.o === '금' ? '#26282F' : '#fff')}">${WX_HANJA[pp.o]}</text></g>`;
  }).join('');
  const svg = `<svg viewBox="0 0 300 300" style="width:100%;max-width:290px;display:block;margin:0 auto">
    <defs>
      <marker id="ahd" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#6A6F7E"/></marker>
      <marker id="ahg" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#C9CCD5"/></marker>
    </defs>${geuk}${saeng}${circles}</svg>`;
  const legend = `<div class="legend-row" style="justify-content:flex-start;margin:-4px 0 6px">
    <span>생 <svg width="26" height="8" style="display:inline"><line x1="0" y1="4" x2="20" y2="4" stroke="#6A6F7E" stroke-width="1.6"/><path d="M20 1l5 3-5 3z" fill="#6A6F7E"/></svg></span>
    <span>극 <svg width="26" height="8" style="display:inline"><line x1="0" y1="4" x2="20" y2="4" stroke="#C9CCD5" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M20 1l5 3-5 3z" fill="#C9CCD5"/></svg></span></div>`;
  // 오행별 리스트: 그룹명 + 상태 뱃지 + 십성 2개 %
  const bd = sipsinBreakdown(s);
  const pctS = (nm) => (Math.round(((bd.cnt[nm] || 0) / (bd.total || 8)) * 1000) / 10).toFixed(1) + '%';
  const rows = ['목', '화', '토', '금', '수'].map((o) => {
    const grp = wxGroupOf(s, o), pair = WX_GROUP_PAIR[grp] || [];
    const pct = pctOf(o);
    const state = pct <= 12.5 ? ['부족', 'lack'] : pct > 37.5 ? ['과다', 'excess'] : ['적정', 'ok'];
    return `<div class="wx-row">
      <span class="wx-chip wx-${o}">${WX_HANJA[o]}</span>
      <span class="nm">${o}(${grp})</span>
      <span class="bdg ${state[1]}">${state[0]}</span>
      <span class="sips">${pair.map((nm) => `${nm} <b>${pctS(nm)}</b>`).join('<br>')}</span>
    </div>`;
  }).join('');
  return legend + svg + `<div style="margin-top:14px">${rows}</div>`;
}
function manseShin() {
  const s = window._saju;
  const gb = (o) => Object.keys(window.Saju.SAENG).find((k) => window.Saju.SAENG[k] === o);
  const support = s.count[s.dayWx] + s.count[gb(s.dayWx)];
  const score = Math.max(4, Math.min(96, Math.round((support / (s.total || 8)) * 100)));
  const band = score >= 61 ? '신강' : score >= 40 ? '중화' : '신약';
  const cx = 150, cy = 150, R = 110;
  const BANDC = { 신약: '#FFD84D', 중화: '#FF8A5B', 신강: '#4C7DFF' };
  const ang = Math.PI - (score / 100) * Math.PI;
  const px = cx + R * Math.cos(ang), py = cy - R * Math.sin(ang);
  const arc = (col, from, to) => {
    const a1 = Math.PI - from / 100 * Math.PI, a2 = Math.PI - to / 100 * Math.PI;
    const x1 = cx + R * Math.cos(a1), y1 = cy - R * Math.sin(a1), x2 = cx + R * Math.cos(a2), y2 = cy - R * Math.sin(a2);
    return `<path d="M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}" stroke="${col}" stroke-width="15" fill="none" stroke-linecap="round"/>`;
  };
  const svg = `<svg viewBox="0 0 300 172" style="width:100%;max-width:320px;display:block;margin:4px auto 0">
    ${arc('#FFE895', 0, 38)}${arc('#FFC5A3', 41, 59)}${arc('#B9CDFF', 62, 100)}
    <circle cx="${px}" cy="${py}" r="9" fill="${BANDC[band]}" stroke="#fff" stroke-width="3"/>
    <text x="150" y="118" text-anchor="middle" font-size="48" font-weight="900" fill="#17181D">${score}</text>
    <text x="150" y="144" text-anchor="middle" font-size="13.5" fill="#9CA0AC">${band}한 사주입니다</text></svg>`;
  const legend = `<div class="legend-row" style="margin:10px 0 4px">
    <span><span class="dot" style="background:${BANDC.신약}"></span>신약 <span class="muted">0~39</span></span>
    <span><span class="dot" style="background:${BANDC.중화}"></span>중화 <span class="muted">40~60</span></span>
    <span><span class="dot" style="background:${BANDC.신강}"></span>신강 <span class="muted">61~</span></span></div>`;
  const info = `<div class="divider"></div><div class="muted" style="text-align:center;line-height:1.7">${s.reason}<br/>일간 ${s.dayGan}(${s.dayWx}) · ${s.tti}띠</div>`;
  return svg + legend + info;
}
function manseDaewoon() {
  const s = window._saju;
  const tlTile = (ch, isGan) => {
    const w = wxOf(ch, isGan), ko = (isGan ? GAN_KO : ZHI_KO)[ch] || '';
    return `<div class="tl-tile wx-tile wx-${w}"><span class="han">${ch}</span><span class="ko">${ko}</span></div>`;
  };
  const cell = (d, cur) => `<div class="tl-cell ${cur ? 'cur' : ''}">
    <div class="age">${d.startAge}</div>
    <div class="sip">${d.sipsin || ''}</div>
    ${tlTile(d.gan, true)}${tlTile(d.zhi, false)}
  </div>`;
  const dw = (s.daewoonList || []).slice(0, 10).reverse().map((d) => cell(d, s.daewoon && s.daewoon.startAge === d.startAge)).join('');
  const sw = s.sewoon ? `<div class="divider"></div>
    <div class="section-head" style="margin:0 0 8px"><h3 style="font-size:15px">세운</h3></div>
    <div class="muted">올해 <b style="color:var(--ink);font-size:14px">${s.sewoon.year} ${s.sewoon.ganzhi}</b> (${s.sewoon.sipsin}) — 연도별 타임라인 준비 중</div>` : '';
  return `<div class="sec-kicker" style="margin-bottom:2px">대운(만 나이)</div>
    <div class="timeline" id="dwTimeline">${dw}</div>${sw}`;
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
  const dw = s.daewoon, sw = s.sewoon, R = relLines(s), J = s.johu || {};
  const gc = (s.sip && s.sip.groupCount) || {};
  const sipDist = Object.keys(gc).filter((k) => gc[k]).map((k) => k + gc[k]).join(', ');
  const cntStr = window.Saju.WX_KO.map((o) => o + s.count[o]).join(' ');
  return `너는 20년 경력의 자평명리 상담가다. 아래 사주를, 명리를 전혀 모르는 일반인도 쉽게 이해하도록 친절하고 따뜻하게 풀어 써라.

[말투·표현 — 최우선]
1. 존댓말(해요·합니다체)로 쓴다. 반말 금지.
2. 인사·자기소개·"안녕"·"제가 풀어드릴게요" 같은 서두 금지. 첫 줄은 곧바로 '한 줄 요약'으로 시작.
3. 한자를 절대 출력하지 마라. 모든 간지·용어는 한글로만(예: 계수·을축·무인·정관·상관·화개살). 괄호 안 한자도 금지.
4. 명리 용어(정관·상관·화개살·삼형·조후 등)는 그냥 쓰지 말고 반드시 **쉬운 뜻 + 언제(어느 시기·상황) + 어떤 느낌(비유) + 그래서 현실에서 어떤 결과**로 풀어라. 예: "정관 기운이 강해요 — 규칙과 책임을 중시하는 기운이라, 어릴 때부터 성실하다는 말을 듣고, 조직에서 신뢰받지만 스스로를 몰아붙이기 쉬워요."
5. MZ 유행어·밈·신조어 제목 금지("겉바속촉", "만능캐" 등 X). 제목은 담백하고 쉽게. 가벼운 일상어는 괜찮다.

[섹션 — 아래 제목 그대로, 각 2~3문단]
## 한 줄 요약
## 타고난 성격
## 나의 기운 균형 (오행·용신·조후)
## 적성과 재능
## 겉모습과 속마음
## 타고난 기질 (신살)
## 조심할 점
## 강점과 도와주는 사람
## 직업과 재물
## 사랑과 관계
## 인생의 흐름 (대운)
## 올해 (${sw ? sw.year : '올해'})
## 마무리 조언
- '겉모습과 속마음'에서는 천간=밖으로 드러나는 나, 지지=속마음·내면의 나 로 쉽게 설명하고, 합·충이 있으면 그게 성격·관계에서 어떻게 느껴지는지 풀어라.

[내용 규칙]
6. 단정+긍정, 따뜻함. 불행·질병·사망 단정 금지. 데이터에 없는 합충·신살 지어내지 말 것.${tu ? '\n7. 출생시각 미상 — 시주 기반 해석 금지.' : ''}
8. [정확성 절대규칙] 오행 개수·십신 분포·신강/신약·천간 합충·지지 형충파해·신살은 아래 [데이터]의 수치·항목을 그대로 인용하라. 다시 세거나 바꾸지 마라. 오행 개수(예: '토 ${s.count.토}개')는 데이터 숫자와 100% 일치. 형·삼형은 데이터의 글자 구성 그대로(연지 등 누락 금지).
9. 천간합은 '두 기운이 묶이는 것'이며 오행이 완전히 바뀌는 것(化)은 조건이 맞아야 성립한다. "○를 만들어낸다"고 단정 말고 "묶인다 / 조건부로 바뀐다"로.
10. 용신은 억부용신(데이터 '억부용신')과 조후용신(데이터 '조후')을 구분하되, 용어보다 뜻으로 설명하라(억부=일간 힘의 균형, 조후=계절의 춥고 더움 균형). 둘이 다르면 그 딜레마를 쉽게 짚어라.

[사주 데이터]
사주팔자: 연 ${p.year} / 월 ${p.month} / 일 ${p.day}${tu ? ' / 시 미상' : ` / 시 ${p.time}`}
일간: ${s.dayGan}(${s.dayWx}), ${s.isStrong ? '신강' : '신약'}, ${s.tti}띠
오행 개수(이 숫자 그대로 사용): ${cntStr}
십신 분포: ${sipDist || '-'}
십신 배치: ${sipLine}
지장간: ${hide}
십이운성: ${pKeys.map((k) => `${nm(k)}${(dt[k] || {}).unseong || ''}`).join(' ')}
천간관계: ${R.gan} / 지지관계: ${R.ji} / 신살: ${R.sinsal}
억부용신: ${(s.yongsin || []).join('·') || '-'} / 부족오행: ${(s.lacking || []).join('·') || '없음'}
조후: ${J.season || '-'} / 한난 ${J['한난'] || '-'} / 조후용신 ${J.need || '없음(온난)'} — ${J.note || ''}
대운: ${dwList}
현재대운: ${dw ? `${dw.ganzhi}(${dw.sipsin}, ${dw.startAge}세~)` : '-'} / 올해세운: ${sw ? `${sw.year} ${sw.ganzhi}(${sw.sipsin})` : '-'}`;
}
function sajuLine(s) {
  return `일간 ${s.dayGan}(${s.dayWx}) ${s.isStrong ? '신강' : '신약'} · ${s.tti}띠 · 오행 ${window.Saju.WX_KO.map((o) => o + s.count[o]).join(' ')} · 용신 ${(s.yongsin || []).join('·') || '-'} · 팔자 ${s.pillars.year}/${s.pillars.month}/${s.pillars.day}${s.timeUnknown ? '' : '/' + s.pillars.time}`;
}
function iljinFlags(ij) {
  const f = [];
  if (ij.chungIl) f.push('오늘 일진 지지가 내 일지를 충 — 변동·이동·감정 기복');
  if (ij.hapIl) f.push(`오늘 일진 천간이 내 일간과 합(化${ij.hapIl}) — 인연·협력·집중`);
  if (ij.dohwa) f.push('도화 기운 — 매력·대인·구설');
  if (ij.yeokma) f.push('역마 기운 — 이동·외출·변화');
  f.push(ij.isYongsin ? '오늘 오행이 용신에 부합 — 컨디션 유리' : '오늘 오행이 용신과 달라 — 무리 금물');
  return f.join(' / ');
}
function dailyPrompt(s) {
  const ij = window.Saju.iljinForDate(s, new Date());
  return `너는 사주명리 상담가다. 아래 사주와 오늘 일진(日辰)을 엮어 "오늘의 운세"를 가볍고 친근하게 써라. 마크다운(## 제목, **굵게**). 단정·불행 단정 금지, '~하면 좋아요' 톤. 짧고 명료하게.
## 오늘 한줄 (일진 ${ij.ganzhi} 기운을 캐릭터로 한마디)
## 총운
## 재물·일
## 애정·관계
## 건강·컨디션
## ⚠️ 오늘 조심할 점 (일지충 등 있으면 짚고, 없으면 무난하다고)
## 오늘의 팁 (행운 색·시간·방향)
[오늘 일진] ${ij.date} ${ij.ganzhi}(천간 ${ij.gan}=${ij.sipsin}, 지지 ${ij.zhi} 지장간십신 ${ij.zhiSipsin}) · 오행 ${ij.wx.gan}/${ij.wx.zhi} · 특이사항: ${iljinFlags(ij)}
[사주] ${sajuLine(s)} / 올해세운 ${s.sewoon ? s.sewoon.ganzhi : ''} / 현재대운 ${s.daewoon ? s.daewoon.ganzhi : ''}`;
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
function dreamPrompt(text, evidence, emotion, residue) {
  const psySec = (emotion || residue) ? '\n## 마음 읽기 (심리 관점)' : '';
  const psyRule = (emotion || residue) ? `\n- "마음 읽기" 섹션: 꿈속 감정과 최근 상황을 근거로, 꿈이 지금 마음 상태를 어떻게 비추는지 1문단 (프로이트식 소망, 융식 보상 관점을 쉬운 말로. 학술용어 금지).` : '';
  return `너는 전통 꿈해몽 전문가다. 아래 [전통 해몽 근거]를 반드시 중심 기준으로 삼아 꿈을 풀이해라. 근거에 없는 상징만 일반 통념으로 보완. 마크다운(## 제목, **굵게**).
반드시 첫 두 줄에 아래 형식으로만 출력하고 줄바꿈:
MOOD 길몽|중립|주의 (셋 중 하나. [전통 해몽 근거]의 길/주의 판정을 우선 반영. 흉몽 단정 대신 '주의')
KEYWORDS 상징1,상징2,상징3 (꿈에 나온 핵심 상징 단어 2~4개, 쉼표 구분)
그 다음 섹션(각 1~2문단, 구어체 공감 톤):
## 꿈의 핵심 상징
## 해몽 (상징별 의미)
## 운의 흐름${psySec}
## 조언 한마디
- 해몽 섹션에서는 근거의 원문 풀이를 자연스럽게 인용 (예: 전통 해몽에서는 '뱀이 품에 들면 귀한 자식을 낳는다'고 했어요).${psyRule}
- 단정적 흉몽 규정 금지, '~을 뜻할 수 있어요' 톤. 마지막은 반드시 긍정 조언으로.
[전통 해몽 근거]
${evidence || '(매칭된 근거 없음 — 일반 전통 통념으로 풀이하되 과장 금지)'}
${emotion ? `[꿈속 감정] ${emotion}` : ''}${residue ? `\n[최근 상황] ${residue}` : ''}
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

// ── 바텀시트(도움말) ──
function openSheet(key) {
  const h = TAB_HELP[key]; if (!h) return;
  closeSheet();
  const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheetBg'; bg.onclick = closeSheet;
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.id = 'sheetBox';
  sh.innerHTML = `<div class="sheet-x" onclick="closeSheet()">✕</div>
    <div class="sheet-title">${h[0]}</div>
    <div class="sheet-body">${h[1]}</div>
    <button class="btn" onclick="closeSheet()">확인</button>`;
  document.body.appendChild(bg); document.body.appendChild(sh);
}
function closeSheet() {
  ['sheetBg', 'sheetBox'].forEach((id) => { const el = document.getElementById(id); if (el) el.remove(); });
}

// ── 비밀번호 게이트 (1212) → 환영화면(운명 리더기 + 오늘 방문자 수) ──
function passwordGate() {
  if (sessionStorage.getItem('sj_auth') === '1') return;
  const ov = document.createElement('div');
  ov.id = 'pwGate';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px';
  ov.innerHTML = `<div style="font-size:44px">🔒</div>
    <div style="font-weight:800;font-size:17px">${t('pw_h')}</div>
    <input id="pwIn" type="password" inputmode="numeric" onkeydown="if(event.key==='Enter')pwCheck()" style="width:200px;padding:13px;text-align:center;font-size:18px;letter-spacing:4px;border:1px solid var(--line);border-radius:12px" />
    <button class="btn" style="width:200px" onclick="pwCheck()">${t('pw_btn')}</button>`;
  document.body.appendChild(ov);
  setTimeout(() => { const i = document.getElementById('pwIn'); if (i) i.focus(); }, 100);
}
function pwCheck() {
  if (document.getElementById('pwIn').value === '1212') {
    sessionStorage.setItem('sj_auth', '1');
    const g = document.getElementById('pwGate'); if (g) g.remove();
    showWelcome();
  } else { alert(t('pw_wrong')); document.getElementById('pwIn').value = ''; }
}
// 오늘 방문 기록 + 오늘 방문자 수 (Supabase, 기기 client_id 기준 하루 1명)
async function recordVisit() {
  const c = sb(); if (!c) return null;
  const day = new Date().toISOString().slice(0, 10);
  try {
    await c.from('visits').upsert({ client_id: clientId(), day }, { onConflict: 'client_id,day' });
    const { count, error } = await c.from('visits').select('*', { count: 'exact', head: true }).eq('day', day);
    if (error) return null;
    return count;
  } catch (e) { return null; }
}
function showWelcome() {
  if (sessionStorage.getItem('sj_welcomed') === '1') return;
  sessionStorage.setItem('sj_welcomed', '1');
  const splash = LANG === 'en' ? 'img/splash_en.jpg' : 'img/reader_ko.jpg';
  const ov = document.createElement('div');
  ov.id = 'welcome';
  ov.innerHTML = `
    <div class="wel-card">
      <img class="wel-img" src="${splash}?v=1" alt="${t('appName')}" />
      <div class="wel-body">
        <div class="wel-name">${t('appName')}</div>
        <div class="wel-tag">${t('wel_tagline')}</div>
        <div class="wel-visit" id="welVisit"><span class="wel-dot"></span>…</div>
        <button class="btn wel-enter" onclick="enterApp()">${t('wel_enter')}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  recordVisit().then((n) => {
    const el = $('welVisit'); if (!el) return;
    el.innerHTML = (n && n > 0) ? t('visit')(n) : t('visit_first');
  });
}
function enterApp() { const w = $('welcome'); if (w) w.remove(); }

document.documentElement.lang = LANG; syncLangChrome(); renderNav(); renderHome(); passwordGate();
Object.assign(window, { showView, openFeature, runReading, onFacePhoto, runFace, runDream, dreamChip, dreamEmo, switchManseTab, switchRelTab, openSheet, closeSheet, expandForm, pwCheck, nPopSeong, nPopName, runName, runNewyear });
