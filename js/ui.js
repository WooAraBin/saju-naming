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
function renderHome() {
  const quick = ['📅 출석체크', '☀️ 오늘의 운세', '😎 관상', '🔮 정통사주', '🎊 신년운세'];
  $('view-home').innerHTML = `
    <div class="hero">
      <div class="txt"><div class="kicker">오늘의 사주</div><h2>나를 읽는 시간</h2><p>생년월일시로 사주를 깊이 풀어드려요</p></div>
      <div class="emoji">🔮</div>
    </div>
    <div class="quick-row">${quick.map((q) => `<div class="pill">${q}</div>`).join('')}</div>
    <div class="section"><div class="section-head"><h3>운세 보기</h3></div></div>
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
function detailHead(title) {
  return `<div class="detail-head"><div class="back" onclick="showView('home')">‹</div><div class="title">${title}</div></div>`;
}
function openFeature(id) {
  const f = featById(id);
  if (id !== 'saju') {
    $('view-reading').innerHTML = detailHead(f.title) +
      `<div class="card" style="text-align:center;color:var(--ink-3);padding:40px 18px">${f.emoji}<br/><b>${f.title}</b>는 준비 중이에요<br/><span class="muted">사주팔자부터 실제 분석이 동작합니다.</span></div>`;
    showView('reading'); return;
  }
  $('view-reading').innerHTML = detailHead('사주팔자') + `
    <div class="card">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label style="font-size:13px;font-weight:700;color:var(--ink-2)">생년월일
          <input id="fBirth" type="date" value="1990-01-01" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px" /></label>
        <label style="font-size:13px;font-weight:700;color:var(--ink-2)">출생 시각
          <input id="fTime" type="time" value="12:00" style="width:100%;margin-top:6px;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px" /></label>
      </div>
      <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;align-items:center">
        <label style="font-size:13px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="fTimeUnknown" /> 시간 모름</label>
        <label style="font-size:13px;display:flex;align-items:center;gap:6px">성별 <select id="fGender" style="padding:6px;border-radius:8px;border:1px solid var(--line)"><option value="M">남</option><option value="F">여</option></select></label>
        <label style="font-size:13px;display:flex;align-items:center;gap:6px">달력 <select id="fCal" style="padding:6px;border-radius:8px;border:1px solid var(--line)"><option value="solar">양력</option><option value="lunar">음력</option></select></label>
      </div>
      <button class="btn" style="margin-top:16px" onclick="runSaju()">사주 보기</button>
    </div>
    <div id="sajuResult"></div>`;
  showView('reading');
}
function runSaju() {
  const bd = $('fBirth').value, tm = $('fTime').value || '12:00';
  if (!bd) { alert('생년월일을 입력해주세요'); return; }
  const [y, mo, d] = bd.split('-').map(Number), [h, mi] = tm.split(':').map(Number);
  const opt = { year: y, month: mo, day: d, hour: h, minute: mi, gender: $('fGender').value, timeUnknown: $('fTimeUnknown').checked, isLunar: $('fCal').value === 'lunar' };
  const saju = window.Saju.computeSaju(opt);
  window._saju = saju; window._manseTab = 'wonguk';
  $('sajuResult').innerHTML = `<div id="manseBox">${renderManse()}</div><div class="card" id="aiCard"><div class="loading"><span class="spinner"></span> AI 심층분석 생성 중…</div></div>`;
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: deepPrompt(saju) }) })
    .then((r) => r.json())
    .then((j) => { $('aiCard').innerHTML = j.text ? `<div class="md">${mdLite(j.text)}</div>` : '<div class="loading">잠시 후 다시 시도해주세요.</div>'; })
    .catch(() => { $('aiCard').innerHTML = '<div class="loading">분석 실패 — 다시 시도해주세요.</div>'; });
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

renderNav(); renderHome();
Object.assign(window, { showView, openFeature, runSaju, switchManseTab });
