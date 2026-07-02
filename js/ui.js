/* ============================================================
   ui.js — 사주앱 새 UI (점신 벤치마크). 계산은 window.Saju 재사용.
   ============================================================ */
'use strict';
const $ = (id) => document.getElementById(id);
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const API = '/api/explain'; // 동일 오리진(배포)

// ── 기능 카탈로그 ──
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

// ── 뷰 전환 ──
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('on'));
  $('view-' + name).classList.add('on');
  document.querySelectorAll('.bottom-nav .nav-item').forEach((n) => n.classList.toggle('on', n.dataset.v === name));
  document.querySelector('.app').scrollTop = 0; window.scrollTo(0, 0);
}

// ── 하단 네비 ──
function renderNav() {
  const items = [['home', '🏠', '홈'], ['archive', '📂', '보관함'], ['me', '👤', '내 정보']];
  $('bottomNav').innerHTML = items.map(([v, i, l]) =>
    `<div class="nav-item ${v === 'home' ? 'on' : ''}" data-v="${v}" onclick="showView('${v}')"><div class="ico">${i}</div>${l}</div>`).join('');
}

// ── 홈 ──
function renderHome() {
  const quick = ['📅 출석체크', '☀️ 오늘의 운세', '😎 관상', '🔮 정통사주', '🎊 신년운세'];
  $('view-home').innerHTML = `
    <div class="hero">
      <div class="txt">
        <div class="kicker">오늘의 사주</div>
        <h2>나를 읽는 시간</h2>
        <p>생년월일시로 사주를 깊이 풀어드려요</p>
      </div>
      <div class="emoji">🔮</div>
    </div>
    <div class="quick-row">${quick.map((q) => `<div class="pill">${q}</div>`).join('')}</div>
    <div class="section">
      <div class="section-head"><h3>운세 보기</h3></div>
    </div>
    <div class="feat-grid">
      ${FEATURES.map((f) => `
        <div class="feat-card" onclick="openFeature('${f.id}')">
          <div class="fc-emoji">${f.emoji}</div>
          <div class="fc-title">${f.title}</div>
          <div class="fc-sub">${f.sub}</div>
          <div class="fc-badge ${f.pay === 'ad' ? 'badge-ad' : 'badge-pay'}">${f.pay === 'ad' ? '🎬 광고 무료' : '₩500'}</div>
        </div>`).join('')}
    </div>`;
}

// ── 기능 열기 ──
function openFeature(id) {
  const f = featById(id);
  if (id !== 'saju') {
    $('view-reading').innerHTML = detailHead(f.title) +
      `<div class="card" style="text-align:center;color:var(--ink-3);padding:40px 18px">${f.emoji}<br/><b>${f.title}</b>는 준비 중이에요<br/><span class="muted">사주팔자부터 실제 분석이 동작합니다.</span></div>`;
    showView('reading');
    return;
  }
  const now = new Date();
  $('view-reading').innerHTML = detailHead('사주팔자') + `
    <div class="card">
      <div class="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label style="font-size:13px;font-weight:700;color:var(--ink-2)">생년월일
          <input id="fBirth" type="date" value="1990-01-01" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px" />
        </label>
        <label style="font-size:13px;font-weight:700;color:var(--ink-2)">출생 시각
          <input id="fTime" type="time" value="12:00" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px" />
        </label>
      </div>
      <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
        <label style="font-size:13px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="fTimeUnknown" /> 시간 모름</label>
        <label style="font-size:13px;display:flex;align-items:center;gap:6px">성별
          <select id="fGender" style="padding:6px;border-radius:8px;border:1px solid var(--line)"><option value="M">남</option><option value="F">여</option></select></label>
        <label style="font-size:13px;display:flex;align-items:center;gap:6px">달력
          <select id="fCal" style="padding:6px;border-radius:8px;border:1px solid var(--line)"><option value="solar">양력</option><option value="lunar">음력</option></select></label>
      </div>
      <button class="btn" style="margin-top:16px" onclick="runSaju()">사주 보기</button>
    </div>
    <div id="sajuResult"></div>`;
  showView('reading');
}

function detailHead(title) {
  return `<div class="detail-head"><div class="back" onclick="showView('home')">‹</div><div class="title">${title}</div></div>`;
}

// ── 사주 실행 ──
function runSaju() {
  const bd = $('fBirth').value; const tm = $('fTime').value || '12:00';
  if (!bd) { alert('생년월일을 입력해주세요'); return; }
  const [y, mo, d] = bd.split('-').map(Number);
  const [h, mi] = tm.split(':').map(Number);
  const opt = {
    year: y, month: mo, day: d, hour: h, minute: mi,
    gender: $('fGender').value, timeUnknown: $('fTimeUnknown').checked,
    isLunar: $('fCal').value === 'lunar',
  };
  const saju = window.Saju.computeSaju(opt);
  const box = $('sajuResult');
  box.innerHTML = renderManse(saju) + `<div class="card" id="aiCard"><div class="loading"><span class="spinner"></span> AI 심층분석 생성 중…</div></div>`;
  // AI 호출
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: deepPrompt(saju) }) })
    .then((r) => r.json())
    .then((j) => { $('aiCard').innerHTML = j.text ? `<div class="md">${mdLite(j.text)}</div>` : '<div class="loading">잠시 후 다시 시도해주세요.</div>'; })
    .catch(() => { $('aiCard').innerHTML = '<div class="loading">분석 실패 — 다시 시도해주세요.</div>'; });
}

// ── 만세력 렌더 ──
function wxOf(ch, isGan) { return (isGan ? window.Saju.GAN_WX : window.Saju.ZHI_WX)[ch] || ''; }
function tile(ch, isGan) { const w = wxOf(ch, isGan); return `<div class="wx-tile wx-${w}">${ch}</div>`; }

function renderManse(s) {
  const cols = [['시', 'time'], ['일', 'day'], ['월', 'month'], ['년', 'year']];
  const tu = s.timeUnknown;
  const p = s.pillars, dt = s.detail || {}, sp = s.sip.pillars;
  const gz = (k, i) => (k === 'time' && tu) ? '' : (p[k] ? p[k][i] : '');
  // 사주원국 표
  const row = (lbl, fn) => `<div class="rowlbl">${lbl}</div>` + cols.map(([, k]) => fn(k)).join('');
  const sipTop = (k) => `<div class="cell">${(k === 'day') ? '일간' : (sp[k] ? sp[k].gan : '')}</div>`;
  const ganCell = (k) => `<div class="tilecell">${(k === 'time' && tu) ? '<div class="wx-tile" style="background:var(--surface-2);color:var(--ink-3)">?</div>' : tile(gz(k, 0), true)}</div>`;
  const zhiCell = (k) => `<div class="tilecell">${(k === 'time' && tu) ? '<div class="wx-tile" style="background:var(--surface-2);color:var(--ink-3)">?</div>' : tile(gz(k, 1), false)}</div>`;
  const sipBot = (k) => `<div class="cell">${sp[k] ? sp[k].zhi : ''}</div>`;
  const hideCell = (k) => `<div class="cell" style="font-size:11px">${(dt[k] || {}).hideGan || ''}</div>`;
  const unCell = (k) => `<div class="cell" style="font-size:11px">${(dt[k] || {}).unseong || ''}</div>`;

  const wonguk = `
    <div class="card">
      <div class="tabs"><div class="tab on">사주원국</div><div class="tab">오행</div><div class="tab">신강신약</div><div class="tab">대운</div></div>
      <div class="saju-grid">
        <div></div>${cols.map(([l]) => `<div class="colhead">${l}주</div>`).join('')}
        ${row('십성', sipTop)}
        ${row('천간', ganCell)}
        ${row('지지', zhiCell)}
        ${row('십성', sipBot)}
        ${row('지장간', hideCell)}
        ${row('12운성', unCell)}
      </div>
    </div>`;

  // 오행 분포 막대
  const wxColors = { 목: 'var(--wx-mok)', 화: 'var(--wx-hwa)', 토: 'var(--wx-to)', 금: '#B9BEC9', 수: 'var(--wx-su)' };
  const wxBars = window.Saju.WX_KO.map((o) => {
    const c = s.count[o], pct = Math.round((c / (s.total || 8)) * 100);
    return `<div class="wx-bar-row"><div class="lbl">${o}</div><div class="wx-bar"><span style="width:${pct}%;background:${wxColors[o]}"></span></div><div class="pct">${c}개</div></div>`;
  }).join('');
  const ohaeng = `<div class="card"><div class="section-head" style="margin:0 0 12px"><h3 style="font-size:16px">오행 분포</h3></div>${wxBars}
    <div class="muted" style="margin-top:8px">용신(필요한 기운): <b style="color:var(--primary)">${(s.yongsin || []).join('·')}</b> · 부족: ${(s.lacking || []).join('·') || '없음'}</div></div>`;

  // 신강약
  const shin = `<div class="card"><div class="section-head" style="margin:0 0 6px"><h3 style="font-size:16px">신강신약</h3></div>
    <div class="gauge-num" style="color:${s.isStrong ? 'var(--primary)' : 'var(--accent)'}">${s.isStrong ? '신강' : '신약'}</div>
    <div class="gauge-lbl">${s.reason}</div>
    <div style="margin-top:10px;text-align:center" class="muted">일간 ${s.dayGan}(${s.dayWx}) · ${s.tti}띠 · 신살 ${(s.sinsal || []).join(', ') || '없음'}</div></div>`;

  // 대운
  const dwCells = (s.daewoonList || []).slice(0, 8).map((d) => {
    const cur = s.daewoon && s.daewoon.startAge === d.startAge;
    return `<div style="flex:0 0 auto;text-align:center;${cur ? 'outline:2px dashed var(--primary);border-radius:12px;padding:4px' : ''}">
      <div class="muted" style="font-size:11px">${d.startAge}세</div>
      <div style="font-size:10px;color:var(--ink-3)">${d.sipsin || ''}</div>
      ${tile(d.gan, true)}${tile(d.zhi, false)}
    </div>`;
  }).join('');
  const daewoon = `<div class="card"><div class="section-head" style="margin:0 0 12px"><h3 style="font-size:16px">대운</h3></div>
    <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px">${dwCells}</div>
    ${s.sewoon ? `<div class="muted" style="margin-top:10px">올해 세운: <b>${s.sewoon.year} ${s.sewoon.ganzhi}</b> (${s.sewoon.sipsin})</div>` : ''}</div>`;

  return wonguk + ohaeng + shin + daewoon;
}

// ── 프롬프트 (app.js deepPrompt 포트) ──
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
2. 아래 ## 섹션들을 만든다. 각 제목은 신조어·밈·구어로 후킹(명리용어 직접노출 금지). 본문 2~3문단 — 1문단 구어체 공감, 이어 데이터 근거(간지·십신 한자병기 예 편인(偏印), 신살, OO충/반합, 십이운성 예 제왕·장생) 인용+행동처방.
   ## (한 줄 비유) ## 타고난 성격 ## 오행과 용신 ## 십신 적성 ## 천간지지 관계 ## 신살 풀이 ## 숨은 약점 ## 강점·귀인 ## 직업·재물 ## 연애·인간관계 ## 대운 흐름 ## 올해 운세 ## 방향·마무리
3. 단정+긍정, 재치. 불행·질병·사망 단정 금지. 데이터에 없는 합충·신살 지어내지 말 것. 용신은 데이터의 용신만.${tu ? '\n4. 출생시각 미상 — 시주 기반 해석 금지, 연월일만.' : ''}

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

// ── 마크다운 ──
function mdLite(t) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return esc(t).split('\n').map((line) => {
    const L = line.trim();
    if (!L) return '';
    if (L.startsWith('## ')) return `<div class="mdh">${inline(L.slice(3))}</div>`;
    if (L.startsWith('# ')) return `<div class="mdh" style="font-size:18px;color:var(--ink)">${inline(L.slice(2))}</div>`;
    return `<p>${inline(L)}</p>`;
  }).join('');
}

// ── init ──
renderNav();
renderHome();
window.showView = showView; window.openFeature = openFeature; window.runSaju = runSaju;
