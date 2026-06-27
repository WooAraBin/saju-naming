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

// 출생 도시 → 경도 (지방시 보정 자동). '해외·모름'은 보정 안 함.
const CITY = {
  '서울': 126.98, '인천': 126.70, '수원': 127.03, '성남': 127.13, '용인': 127.18,
  '일산': 126.77, '산본': 126.93,
  '춘천': 127.73, '강릉': 128.90, '청주': 127.49, '세종': 127.29, '대전': 127.38,
  '천안': 127.15, '전주': 127.15, '광주': 126.85, '목포': 126.39, '여수': 127.66,
  '순천': 127.49, '대구': 128.60, '예천': 128.45, '안동': 128.73, '포항': 129.36, '경주': 129.22,
  '부산': 129.08, '울산': 129.31, '창원': 128.68, '진주': 128.11, '제주': 126.53,
  '개성(북)': 126.55, '평양(북)': 125.75,
  '해외·모름': null,
};
function populateCity() {
  // 가나다 순 정렬, '해외·모름'은 항상 맨 끝
  const names = Object.keys(CITY).sort((a, b) => {
    if (a === '해외·모름') return 1;
    if (b === '해외·모름') return -1;
    return a.localeCompare(b, 'ko');
  });
  $('city').innerHTML = names.map((c) => `<option value="${c}">${c}</option>`).join('');
  $('city').value = '서울';
}
// 공용 출생정보 → computeSaju 입력
function getBirth() {
  const [y, m, d] = ($('birthdate').value || '').split('-').map(Number);
  const [hh, mm] = ($('birthtime').value || '').split(':').map(Number);
  const city = $('city').value, lon = CITY[city];
  const timeUnknown = !!($('timeUnknown') && $('timeUnknown').checked);
  const isLunar = (($('birthCal') && $('birthCal').value) || 'solar') === 'lunar';
  const isLeap = !!($('birthLeap') && $('birthLeap').checked);
  return {
    year: y, month: m, day: d, hour: hh, minute: mm,
    lon: lon == null ? 127.0 : lon,
    applyLocalTime: lon != null && !timeUnknown, // 도시 알면 보정, 해외/모름·시간모름이면 미보정
    gender: $('gender').value,
    timeUnknown, isLunar, isLeap,
  };
}

// 색상: 점수 → 배지 색
function scoreColor(n) {
  if (n >= 80) return '#2e7d52';
  if (n >= 65) return '#7a9a3a';
  if (n >= 50) return '#c9a36b';
  return '#c0492f';
}

/* ---------- 데이터 로딩 ---------- */
async function loadDictionary() {
  // 인명용 한자 8142(+이체) 내장 사전 — data/hanja.js
  const local = window.HanjaDB;
  const surname = {};
  for (const [hangul, arr] of Object.entries(local.SURNAME)) {
    surname[hangul] = arr.map(([hanja, strokes, wuxing]) => ({ hangul, hanja, strokes, wuxing }));
  }
  // 복성(두 글자 성): 음절별 parts 보존(획수/오행), 대표값은 합/마지막글자
  for (const [hangul, variants] of Object.entries(local.SURNAME_COMPOUND || {})) {
    const syl = [...hangul];
    surname[hangul] = variants.map((parts) => {
      const ps = parts.map(([hanja, strokes, wuxing], i) => ({ hangul: syl[i], hanja, strokes, wuxing }));
      return {
        hangul,
        hanja: ps.map((p) => p.hanja).join(''),
        strokes: ps.reduce((a, p) => a + p.strokes, 0),
        wuxing: ps[ps.length - 1].wuxing,
        parts: ps,
      };
    });
  }
  const pool = [];
  for (const [hangul, arr] of Object.entries(local.HANJA)) {
    arr.forEach(([hanja, strokes, wuxing]) => pool.push({ hangul, hanja, strokes, wuxing }));
  }
  DICT = { surname, pool };
  $('dataStatus').textContent = `인명용 한자 ${pool.length.toLocaleString()}자 로드됨`;
}

/* ---------- 사주 표시 ---------- */
function sajuPillarsHtml(saju) {
  const KO = { year: '연주', month: '월주', day: '일주', time: '시주' };
  const ps = ['year', 'month', 'day', 'time'];
  const sip = (saju.sip && saju.sip.pillars) || {};
  const dt = saju.detail || {};
  const GW = window.Saju.GAN_WX, ZW = window.Saju.ZHI_WX;
  // 시간 모름이면 pillars.time === null → 시주 칸 '미상' 표기
  const gan = (p) => (saju.pillars[p] ? saju.pillars[p][0] : '미상');
  const zhi = (p) => (saju.pillars[p] ? saju.pillars[p][1] : '');
  const row = (label, fn) => `<tr><th>${label}</th>${ps.map((p) => `<td>${fn(p)}</td>`).join('')}</tr>`;
  return `<table class="saju-table">
    <thead><tr><th></th>${ps.map((p) => `<th>${KO[p]}</th>`).join('')}</tr></thead>
    <tbody>
    ${row('십신', (p) => { const g = (sip[p] || {}).gan; return g === '일간' ? '<b class="ilgan">일간</b>' : (g || ''); })}
    ${row('천간', (p) => `<span class="gz-big wx-${GW[gan(p)]}">${gan(p)}</span>`)}
    ${row('지지', (p) => `<span class="gz-big wx-${ZW[zhi(p)]}">${zhi(p)}</span>`)}
    ${row('십신', (p) => (sip[p] || {}).zhi || '')}
    ${row('지장간', (p) => `<span class="muted">${(dt[p] || {}).hideGan || ''}</span>`)}
    ${row('운성', (p) => (dt[p] || {}).unseong || '')}
    ${row('납음', (p) => `<span class="muted">${(dt[p] || {}).nayin || ''}</span>`)}
    ${row('공망', (p) => `<span class="muted">${(dt[p] || {}).gongmang || ''}</span>`)}
    </tbody></table>`;
}
function sajuWxHtml(saju) {
  return window.Saju.WX_KO.map((o) => `<span class="wx-chip">${o} <b>${saju.count[o]}</b></span>`).join('');
}
function sajuSummaryHtml(saju, forNaming) {
  const gc = (saju.sip && saju.sip.groupCount) || {};
  const sipStr = Object.keys(gc).filter((k) => gc[k]).map((k) => `${k} ${gc[k]}`).join(' · ');
  const dw = saju.daewoon, sw = saju.sewoon;
  return `<b>${saju.pillars.year}생 · ${saju.tti || ''}띠 · 일간 ${saju.dayGan}(${saju.dayWx}) · ${saju.isStrong ? '신강' : '신약'}</b><br>` +
    `${saju.reason}<br>` +
    (forNaming ? `→ <b>이름에 보충 권장 오행: ${saju.target.join(', ')}</b><br>` : '') +
    (sipStr ? `<span class="muted">십신 분포: ${sipStr}</span><br>` : '') +
    (dw ? `<span class="muted">현재 대운: ${dw.ganzhi} (${dw.sipsin}, ${dw.startAge}세~)</span><br>` : '') +
    (sw ? `<span class="muted">올해(${sw.year}) 세운: ${sw.ganzhi} (${sw.sipsin})</span>` : '') +
    (saju.offsetMin ? `<br><span class="muted">지방시 보정 ${saju.offsetMin}분</span>` : '') +
    (saju.timeUnknown ? `<br><span class="muted">※ 출생시각 미상 — 시주(時柱)를 제외하고 분석했습니다(시간 관련 해석은 참고만).</span>` : '');
}
// 합충/신살을 프롬프트용 텍스트로 정리
function relLines(saju) {
  const g = saju.ganRel || {}, j = saju.jiRel || {}, gan = [], ji = [];
  if (g.hap && g.hap.length) gan.push('천간합 ' + g.hap.join(', '));
  if (g.chung && g.chung.length) gan.push('천간충 ' + g.chung.join(', '));
  const push = (label, arr) => { if (arr && arr.length) ji.push(label + ' ' + arr.join(', ')); };
  push('육합', j.yukhap); push('삼합', j.samhap); push('반합', j.banhap); push('방합', j.banghap);
  push('충', j.chung); push('형', j.hyeong); push('파', j.pa); push('해', j.hae);
  return {
    gan: gan.length ? gan.join(' / ') : '없음',
    ji: ji.length ? ji.join(' / ') : '없음',
    sinsal: (saju.sinsal && saju.sinsal.length) ? saju.sinsal.join(', ') : '없음',
  };
}
// 데이터 블록(프롬프트 공통) — 만세력 전 항목 + 합충 + 신살
function sajuDataBlock(saju) {
  const gc = (saju.sip && saju.sip.groupCount) || {};
  const sipStr = Object.keys(gc).filter((k) => gc[k]).map((k) => `${k}${gc[k]}`).join(', ');
  const dw = saju.daewoon, sw = saju.sewoon, R = relLines(saju), p = saju.pillars, dt = saju.detail || {};
  const tu = saju.timeUnknown;
  const pKeys = tu ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'time'];
  const hide = pKeys.map((k) => `${k === 'year' ? '연' : k === 'month' ? '월' : k === 'day' ? '일' : '시'}${p[k][1]}=${(dt[k] || {}).hideGan || ''}`).join(', ');
  return `사주팔자: 연 ${p.year} / 월 ${p.month} / 일 ${p.day}${tu ? ' / 시주 미상' : ' / 시 ' + p.time}
일간(나): ${saju.dayGan}(${saju.dayWx}) · ${saju.isStrong ? '신강' : '신약'} · ${saju.tti}띠 · ${saju.gender === 'F' ? '여성' : '남성'}${tu ? ' · 출생시각 미상(시주 제외)' : ''}
오행 개수: ${window.Saju.WX_KO.map((o) => o + saju.count[o]).join(' ')}
십신 분포: ${sipStr}
지장간(여기·중기·정기): ${hide}
천간 관계: ${R.gan}
지지 관계: ${R.ji}
신살: ${R.sinsal}
용신/보충오행: ${saju.target.join(', ')}
${dw ? `현재 대운: ${dw.ganzhi}(${dw.sipsin}, ${dw.startAge}세~)` : ''}
${sw ? `올해 세운: ${sw.year} ${sw.ganzhi}(${sw.sipsin})` : ''}`;
}
function sajuPrompt(saju, forNaming) {
  if (forNaming) {
    return `너는 한국 사주명리 전문가다. 아래 사주를 6~9문장으로 깊이 있게, 따뜻하게 풀어줘.
타고난 성향(일간·오행), 강약과 용신, 십신이 말하는 성격/적성을 유기적으로 연결하고, 마지막에 이름에 보충하면 좋은 오행을 자연스럽게 언급. 단정적 운세는 피하고 '~일 수 있어요' 톤.
${sajuDataBlock(saju)}`;
  }
  return `너는 20년 경력의 자평명리 상담가이자, MZ 감성 카피라이터다. 아래 사주를 정확한 명리 해석 위에 위트 있게 풀어, 사람들이 빠져드는 "캐릭터 분석 리포트"로 써라.

[작성 규칙]
1. 먼저 일간(${saju.dayGan}${saju.dayWx})과 오행 분포를 하나의 **캐릭터/물상 비유**로 의인화하고, 그 비유를 글 전체에서 일관되게 유지한다.
2. 아래 순서로 **마크다운 섹션**을 만든다. 각 섹션 제목(##)은 반드시 신조어·밈·구어로 후킹하게(예: "답정너에 고구마 한 스푼", "월급루팡은 내 길이 아니야"). 명리 용어를 제목에 직접 노출하지 말 것.
   ## (대표 한 줄 비유 — 이 사람을 한마디로)
   ## 용신 — 이 사람에게 가장 필요한 기운
   ## 타고난 성격
   ## 숨은 약점·자기함정
   ## 빛나는 강점
   ## 직업·적성
   ## 재물 그릇
   ## 연애·배우자
   ## 부모·가족(육친)
   ## 대인관계
   ## 방향·풍수(부족 오행 → 방위/지역)
   ## 마무리 응원
3. 각 섹션 본문은 2문단. **1문단**=구어체로 공감·캐릭터 묘사. **2문단**=반드시 아래 데이터의 구체 근거(간지·십신 한자병기 예 '편인(偏印)', 신살, 'OO충/반합/자형')를 인용해 왜 그런지 설명하고, 이어서 행동 처방을 준다.
4. 톤: 단정+긍정, 재치. 불행·질병·사망 단정 금지. 방향 섹션은 부족 오행을 방위와 실제 지역(국내/해외)으로 구체화. 마지막은 응원으로 끝낸다.
5. 아래 [사주 데이터]에 주어진 사실만 근거로 쓴다. 없는 합충·신살을 지어내지 말 것.

[사주 데이터]
${sajuDataBlock(saju)}`;
}
async function explainSajuInto(elId, saju, forNaming) {
  const el = $(elId); if (!el) return;
  el.innerHTML = '<p>🔮 사주 해설 생성 중… (10~30초)</p>';
  try {
    const resp = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: sajuPrompt(saju, forNaming) }) });
    const j = await resp.json();
    el.innerHTML = j.text ? mdLite(j.text) : '';
  } catch (e) { el.innerHTML = ''; }
}

// 심층 분석 프롬프트 — 만세력 전 데이터 투입, 항목별 깊은 풀이
function deepPrompt(saju) {
  const p = saju.pillars, sp = saju.sip.pillars, dt = saju.detail || {};
  const tu = saju.timeUnknown;
  const pKeys = tu ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'time'];
  const sipLine = `연주 천간 ${p.year[0]}=${sp.year.gan} / 지지 ${p.year[1]}=${sp.year.zhi}, ` +
    `월주 천간 ${p.month[0]}=${sp.month.gan} / 지지 ${p.month[1]}=${sp.month.zhi}, ` +
    `일주 천간 ${p.day[0]}=일간 / 지지 ${p.day[1]}=${sp.day.zhi}` +
    (tu ? '' : `, 시주 천간 ${p.time[0]}=${sp.time.gan} / 지지 ${p.time[1]}=${sp.time.zhi}`);
  const hide = pKeys.map((k) => `${k === 'year' ? '연' : k === 'month' ? '월' : k === 'day' ? '일' : '시'} ${p[k][1]}(${(dt[k] || {}).hideGan || ''})`).join(', ');
  const dwList = (saju.daewoonList || []).map((d) => `${d.startAge}세~ ${d.ganzhi}(${d.sipsin})`).join(', ');
  const dw = saju.daewoon, sw = saju.sewoon, R = relLines(saju);
  return `너는 20년 경력의 자평명리 상담가이자, MZ 감성 카피라이터다. 아래 사주를 정확한 명리 해석 위에 위트 있게, 그러나 메인 풀이보다 훨씬 더 깊고 길게 풀어 "심층 캐릭터 분석 리포트"로 써라.

[작성 규칙]
1. 인사말·서문 없이 첫 줄부터 일간(${saju.dayGan}${saju.dayWx})과 오행을 의인화한 캐릭터/물상 비유로 바로 시작하고, 그 비유를 끝까지 유지한다.
2. 아래 마크다운 섹션을 만든다. 각 ## 제목은 반드시 신조어·밈·구어로 후킹하게(명리 용어를 제목에 직접 노출 금지). 각 섹션 본문은 2~3문단으로 메인보다 깊게 — 1문단은 구어체 공감·캐릭터 묘사, 이어지는 문단은 반드시 아래 데이터의 구체 근거(간지·십신 한자병기 예 '편인(偏印)', 신살, 'OO충/반합/자형', 대운·세운 간지)를 인용해 설명하고 행동 처방까지 준다.
   ## (대표 한 줄 비유 — 한마디로)
   ## 타고난 성격·기질
   ## 오행 균형과 용신
   ## 십신이 말하는 적성
   ## 천간·지지 관계 (데이터에 있는 충→형→합만)
   ## 신살 풀이 (데이터의 신살을 하나씩)
   ## 숨은 약점·자기함정
   ## 빛나는 강점·귀인
   ## 직업·재물
   ## 연애·인간관계
   ## 대운의 큰 흐름 (전체 한 줄씩 + 현재 대운 깊게 + 어울리는 타로 메이저 1장 연결)
   ## 올해 운세 (세운 + 타로 1장)
   ## 방향·풍수 & 마무리 응원
3. 톤: 단정+긍정, 재치. 불행·질병·사망 단정 금지. 데이터에 없는 합충·신살은 지어내지 말 것.${tu ? '\n4. 출생시각 미상 — 시주·시간 기반 해석 금지, 연·월·일 세 기둥만으로 풀이.' : ''}

[사주 데이터]
사주팔자: 연 ${p.year} / 월 ${p.month} / 일 ${p.day}${tu ? ' / 시 미상' : ` / 시 ${p.time}`}
일간: ${saju.dayGan}(${saju.dayWx}), ${saju.isStrong ? '신강' : '신약'}, ${saju.tti}띠
오행 분포: ${window.Saju.WX_KO.map((o) => o + saju.count[o]).join(' ')}
십신 배치: ${sipLine}
지장간(여기·중기·정기): ${hide}
천간 관계: ${R.gan}
지지 관계: ${R.ji}
신살: ${R.sinsal}
용신/보충오행: ${saju.target.join(', ')}
대운 전체: ${dwList}
현재 대운: ${dw ? `${dw.ganzhi}(${dw.sipsin}, ${dw.startAge}세~)` : '-'}
올해 세운: ${sw ? `${sw.year} ${sw.ganzhi}(${sw.sipsin})` : '-'}`;
}
// 아주 가벼운 마크다운 → HTML (## 제목, **굵게**, - 목록)
function mdLite(t) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc(t).split('\n'); let html = '', inUl = false;
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  for (let raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^#{1,3}\s/.test(line)) {
      if (inUl) { html += '</ul>'; inUl = false; }
      html += `<h3 class="deep-h">${inline(line.replace(/^#{1,3}\s/, ''))}</h3>`;
    } else if (/^[-*]\s/.test(line)) {
      if (!inUl) { html += '<ul class="deep-ul">'; inUl = true; }
      html += `<li>${inline(line.replace(/^[-*]\s/, ''))}</li>`;
    } else {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (line.trim()) html += `<p>${inline(line)}</p>`;
    }
  }
  if (inUl) html += '</ul>';
  return html;
}
async function deepAnalysis() {
  const saju = window._usSaju;
  if (!saju) { alert('먼저 사주 풀이를 보세요'); return; }
  const el = $('us-deep'); const btn = $('usDeepBtn');
  el.innerHTML = '<p>🔎 사주팔자 심층 분석 생성 중… (20~40초)</p>';
  btn.disabled = true;
  try {
    const resp = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: deepPrompt(saju) }) });
    const j = await resp.json();
    el.innerHTML = j.text ? mdLite(j.text) : '<p>해설을 불러오지 못했어요.</p>';
  } catch (e) { el.innerHTML = '<p>오류가 발생했어요. 잠시 후 다시 시도해 주세요.</p>'; }
  btn.disabled = false;
}
// 📷 사주 관상 — 얼굴 사진 + 사주 멀티모달 통합 리딩
let _gsImage = null; // {data(base64), mime}
async function gsHandleFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  // 긴 변 640px로 리사이즈 → JPEG base64 (서버 미저장, 분석용 임시)
  const dataUrl = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 640, scale = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(file);
  });
  _gsImage = { data: dataUrl.split(',')[1], mime: 'image/jpeg' };
  const pv = $('gsPreview'); pv.src = dataUrl; pv.hidden = false;
}
async function gwansangReading() {
  if (!_gsImage) { alert('얼굴 사진을 먼저 선택하세요'); return; }
  if (!$('gsConsent').checked) { alert('사진 사용 동의에 체크해 주세요'); return; }
  // 사주는 선택사항: 이미 본 사주 → 출생정보로 계산 → 없으면 관상 단독
  let saju = window._usSaju;
  if (!saju) {
    const birth = getBirth();
    if (birth.year) { try { saju = window.Saju.computeSaju(birth); } catch (e) {} }
  }
  const el = $('us-gwansang'); const btn = $('usGwansangBtn');
  el.innerHTML = `<p>📷 ${saju ? '사주 × 관상' : '관상'} 분석 중… (20~40초)</p>`;
  btn.disabled = true;
  let prompt;
  if (saju) {
    const dw = saju.daewoon, sw = saju.sewoon;
    prompt = `너는 사주명리와 관상(觀相)을 함께 보는 상담가다. 첨부된 얼굴 사진과 아래 사주를 엮어 통합 관상 리딩을 해줘. 마크다운(## 제목, **굵게**, - 목록).

[매우 중요 — 어조]
- 잘생김/못생김 같은 미추(美醜) 평가는 절대 하지 마라.
- 대신 관상학적 특징은 구체적으로 관찰해 말하라: 예) "눈썹이 짧은 편이라 ~", "미간이 좁아서 ~", "코가 곧고 콧방울이 단단해 ~", "턱이 둥글어 ~". 특징 → 그 의미 해석으로 이어가라.
- 단정적 운세는 피하고 '~한 편이에요/~일 수 있어요' 톤. 재미·참고용임을 전제.

[구성]
## 얼굴 오행
- 얼굴형이 목·화·토·금·수 중 어디에 가까운지, 그것이 일간 ${saju.dayGan}(${saju.dayWx})과 어떻게 어울리는지(상생/보완/충돌)
## 삼정(三停) — 초년·중년·말년
- 이마(초년)·코와 광대(중년)·턱(말년)의 특징을 짚고, 사주 대운 흐름과 연결
## 오관(五官)
- 눈썹·눈·코·입·귀 중 인상적인 부분의 특징과 의미를 사주 십신과 엮어
## 더 좋게 — 보완 포인트
- 관상상 아쉽거나 약한 부위를 1~3곳 짚고, 그곳을 가꾸면 인상·기운이 어떻게 더 좋아질 수 있는지 제안하라. 예) 눈썹이 옅으면 눈썹문신·눈썹정리로 대인운·재물 인상 보완, 귓볼이 얇으면 필러로 두툼하게 해 재복 보완, 입꼬리·인중·콧방울·헤어라인 관리 등. 부족 오행(${saju.target.join('·')})을 보완하는 방향과도 연결하라.
- 표정·헤어스타일·눈썹정리 같은 비시술 방법도 함께 제시. 강요·단정은 금지하고 "원하면 참고만" 톤, 의료 조언이 아님을 전제로.
## 종합
- 사주와 관상이 일치하는 점 / 보완하는 점, 그리고 조언 2~3줄

[사주]
사주팔자: ${saju.pillars.year} ${saju.pillars.month} ${saju.pillars.day} ${saju.timeUnknown ? '시주미상' : saju.pillars.time}
일간: ${saju.dayGan}(${saju.dayWx}), ${saju.isStrong ? '신강' : '신약'}, ${saju.tti}띠
오행 분포: ${window.Saju.WX_KO.map((o) => o + saju.count[o]).join(' ')}
용신/보충오행: ${saju.target.join(', ')}
${dw ? `현재 대운: ${dw.ganzhi}(${dw.sipsin}, ${dw.startAge}세~)` : ''}
${sw ? `올해 세운: ${sw.year} ${sw.ganzhi}(${sw.sipsin})` : ''}`;
  } else {
    prompt = `너는 관상(觀相) 전문가다. 첨부된 얼굴 사진만으로 관상을 풀이해줘. 마크다운(## 제목, **굵게**, - 목록).

[매우 중요 — 어조]
- 잘생김/못생김 같은 미추(美醜) 평가는 절대 하지 마라.
- 대신 관상학적 특징은 구체적으로 관찰해 말하라: 예) "눈썹이 짧은 편이라 ~", "미간이 좁아서 ~", "코가 곧고 콧방울이 단단해 ~", "턱이 둥글어 ~". 특징 → 그 의미 해석으로 이어가라.
- 단정적 운세는 피하고 '~한 편이에요/~일 수 있어요' 톤. 재미·참고용임을 전제.

[구성]
## 얼굴 오행
- 얼굴형이 목·화·토·금·수 중 어디에 가까운지와 그 기질
## 삼정(三停) — 초년·중년·말년
- 이마(초년)·코와 광대(중년)·턱(말년)의 특징과 각 시기 운의 흐름
## 오관(五官)
- 눈썹·눈·코·입·귀 중 인상적인 부분의 특징과 의미
## 더 좋게 — 보완 포인트
- 관상상 아쉽거나 약한 부위를 1~3곳 짚고, 그곳을 가꾸면 인상·기운이 어떻게 더 좋아질 수 있는지 제안하라. 예) 눈썹이 옅으면 눈썹문신·눈썹정리로 대인운·재물 인상 보완, 귓볼이 얇으면 필러로 두툼하게 해 재복 보완, 입꼬리·인중·콧방울·헤어라인 관리 등.
- 표정·헤어스타일·눈썹정리 같은 비시술 방법도 함께 제시. 강요·단정은 금지하고 "원하면 참고만" 톤, 의료 조언이 아님을 전제로.
## 종합
- 전체 인상이 말해주는 성향과 조언 2~3줄`;
  }
  try {
    const resp = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, image: _gsImage }) });
    const j = await resp.json();
    el.innerHTML = j.text ? mdLite(j.text) : '<p>분석을 불러오지 못했어요.</p>';
  } catch (e) { el.innerHTML = '<p>오류가 발생했어요. 잠시 후 다시 시도해 주세요.</p>'; }
  btn.disabled = false;
}
// ① 사주풀이 (메인)
function usAnalyze() {
  const birth = getBirth();
  if (!birth.year) { alert('생년월일을 입력하세요'); return; }
  const saju = window.Saju.computeSaju(birth);
  window._usSaju = saju; // 관상 연동용
  $('usResult').classList.remove('hidden');
  $('us-pillars').innerHTML = sajuPillarsHtml(saju);
  $('us-wxdist').innerHTML = sajuWxHtml(saju);
  $('us-yongsin').innerHTML = sajuSummaryHtml(saju, false);
  explainSajuInto('us-ai', saju, false);
}

/* ---------- 추천 목록 ---------- */
const AXIS_LABELS = {
  nature: '자연스러움', saju: '사주보완', sugri: '수리길흉', eum: '발음오행',
  jawon: '자원조화', eumyang: '음양조화', call: '발음편의',
};
const AXIS_ORDER = ['nature', 'saju', 'sugri', 'eum', 'jawon', 'eumyang', 'call'];

function renderList(results) {
  $('name-list').innerHTML = results
    .map((r, i) => `
      <li data-idx="${i}" class="${i === 0 ? 'active' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span><span class="nm">${r.hangul}</span><span class="hj">${r.hanja}</span></span>
          <span class="score-badge" style="background:${scoreColor(r.total)}">${r.total}</span>
        </div>
        ${r.tip ? `<div class="tip">💡 ${r.tip}</div>` : ''}
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
  const seong = ($('mnSeong').value || '').trim();
  if (!seong) { alert("위 '내 이름 점수'에 성을 먼저 입력하세요"); return; }
  const surnameArr = DICT.surname[seong];
  if (!surnameArr || !surnameArr.length) {
    alert(`'${seong}' 성씨 한자 데이터가 없습니다.`);
    return;
  }
  const surname = surnameArr[0]; // 대표 한자

  const birth = getBirth();
  if (!birth.year) { alert('생년월일을 입력하세요'); return; }
  const saju = window.Saju.computeSaju(birth);

  const btn = $('analyze');
  btn.disabled = true; btn.textContent = '작명 중...';
  await new Promise((r) => setTimeout(r, 10));
  const cands = window.Naming.suggest(saju, surname, DICT.pool, { limit: 40, maxPerFirstChar: 3, naturalN: 28, highN: 14, excludeHyung: false });
  if (!cands.length) { btn.disabled = false; btn.textContent = '이름 추천 받기'; alert('후보를 만들지 못했습니다.'); return; }
  btn.textContent = '작명 중...';
  lastResults = await scoreAndRank(cands, saju.gender, seong, saju);
  btn.disabled = false; btn.textContent = '이름 추천 받기';
  renderList(lastResults);
  renderRadar(lastResults[0]);
}

// 자연스러움 점수 가중치 (최종점수 = 명리점수*(1-W) + 자연스러움*W)
const NATURE_W = 0.45;
// 이 이름의 명리·성명학 강점 한 줄 (발음 계열 제외, '부족한 것을 채워준다' 위주)
function strengthTip(r, saju) {
  const parts = [];
  const need = saju.target || saju.lacking || [];
  const filled = [...new Set(r.chars.map((c) => c.wuxing).filter((w) => need.includes(w)))];
  if (filled.length && r.axes.saju >= 70) parts.push(`사주에 부족한 ${filled.join('·')} 기운을 채워줘요`);
  if (r.axes.sugri >= 80) parts.push('수리 4격이 길한 구성이에요');
  if (r.axes.jawon >= 80) parts.push('한자 오행이 사주와 조화로워요');
  if (r.axes.eumyang >= 80) parts.push('이름의 음양 균형이 좋아요');
  if (!parts.length) {
    const cand = { saju: '사주 기운을 보완해줘요', sugri: '수리 4격이 길해요', jawon: '한자 오행이 조화로워요', eumyang: '음양이 균형 있어요' };
    const best = Object.keys(cand).sort((a, b) => r.axes[b] - r.axes[a])[0];
    parts.push(cand[best]);
  }
  return parts.slice(0, 2).join(', ');
}
// 후보 이름(한글)만 Gemini에 던져 자연스러움 점수를 받고, 기존 명리점수와 합산해 재정렬
async function scoreAndRank(cands, gender, seong, saju) {
  const g = (gender === 'F') ? '여자' : '남자';
  const need = (saju.target || []).join('·');
  const list = cands.map((r, i) => `${i + 1}. ${seong}${r.hangul} (${r.hanja})`).join('\n');
  const prompt = `다음은 사주에 맞춰 만든 ${g} 이름 후보다(한글·한자). 이 사주는 ${need} 오행을 보충하면 좋다.
각 후보에 대해 두 가지를 매겨라.
[nat] 한자·뜻·사주는 전부 무시하고, 오직 소리 내어 불렀을 때의 어감만으로 자연스러움 0~100점(짜게).
  - 흔하고 자연스러운 이름 85~100 / 다소 낯선 이름 60~84 / 단어처럼 어색한 조합(겸단·계로·담운·결단 류) 0~40
[tip] 이 이름의 강점 한 줄. 두 한자 글자의 뜻·이미지를 풀어 그 이름이 주는 인상을 표현하라(예: "넓을 浩·뜻 志 — 큰 포부와 너른 마음"). 발음·어감은 절대 언급 금지. 후보마다 서로 다르게. '금·수를 보충한다' 같은 사주 문구는 정말 두드러질 때만 가끔, 매번 붙이지 마라.
반드시 JSON 배열로만: [{"no":1,"nat":92,"tip":"맑을 瑞·고울 娟 — 단정하고 귀한 인상"}]
이름:
${list}`;
  cands.forEach((r) => { r.baseTotal = r.total; });
  try {
    const resp = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    const j = await resp.json();
    const m = (j.text || '').replace(/```json|```/g, '').match(/\[[\s\S]*\]/);
    if (m) JSON.parse(m[0]).forEach((o) => {
      const r = cands[(o.no | 0) - 1];
      if (r) { r.axes.nature = Math.max(0, Math.min(100, o.nat | 0)); if (o.tip) r.tip = String(o.tip); }
    });
  } catch (e) {}
  cands.forEach((r) => {
    if (r.axes.nature == null) r.axes.nature = 55; // 평가 누락 시 중립값
    r.total = Math.round(r.baseTotal * (1 - NATURE_W) + r.axes.nature * NATURE_W);
    if (!r.tip) r.tip = strengthTip(r, saju); // Gemini tip 누락 시 로컬 강점
  });
  cands.sort((a, b) => b.total - a.total);
  return cands.slice(0, 10);
}

/* ---------- 내 이름 점수 (한글) ---------- */
let mnChart = null;
function renderMyRadar(r) {
  $('mn-title').innerHTML = `${r.hangul} — 총점 ${r.total}`;
  const order = AXIS_ORDER.filter((k) => r.axes[k] != null);
  const labels = order.map((k) => AXIS_LABELS[k]);
  const data = order.map((k) => r.axes[k]);
  if (mnChart) mnChart.destroy();
  mnChart = new Chart($('mnRadar'), {
    type: 'radar',
    data: { labels, datasets: [{ label: r.hangul, data, fill: true,
      backgroundColor: 'rgba(139,94,52,.18)', borderColor: '#8b5e34', pointBackgroundColor: '#8b5e34' }] },
    options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }, plugins: { legend: { display: false } } },
  });
  $('mn-detail').innerHTML = order
    .map((k) => `<div><span>${AXIS_LABELS[k]}</span><b>${r.axes[k]}</b></div>`).join('') +
    `<div><span>인격/지격/외격/총격</span><b>${r.gyeok.in.num}·${r.gyeok.ji.num}·${r.gyeok.oe.num}·${r.gyeok.chong.num}</b></div>`;
}
async function explainAI(r) {
  const el = $('mn-ai');
  el.textContent = '🔮 AI 해설 생성 중...';
  const axesStr = AXIS_ORDER.filter((k) => r.axes[k] != null).map((k) => `${AXIS_LABELS[k]}: ${r.axes[k]}`).join(', ');
  const prompt = `너는 한국 성명학 전문가다. 아래는 '${r.hangul}'님이 이미 쓰고 있는 본인 이름의 채점 결과다. 본인에게 직접 말하듯 4~6문장으로 따뜻하게 해설해줘.
[필수] '당신의 이름은~'처럼 이름의 주인 본인을 향해 말할 것. '아기·자녀·자녀분·부모님·짓다·작명' 같은 '새로 이름 짓기' 표현은 절대 쓰지 마라(이미 사용 중인 이름을 평가하는 것이다).
점수 의미와 강점·보완점을 짚되 단정적 운세는 피하고 참고용임을 전제로.
이름: ${r.hangul}
총점: ${r.total}
${axesStr}
수리 4격(인지외총): ${r.gyeok.in.num}/${r.gyeok.ji.num}/${r.gyeok.oe.num}/${r.gyeok.chong.num}`;
  try {
    const resp = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    const j = await resp.json();
    if (j.text) el.textContent = '🔮 ' + j.text;
    else el.textContent = `AI 해설을 불러오지 못했습니다.${j.note ? ' (' + j.note + ')' : ''}`;
  } catch (e) { el.textContent = 'AI 해설 미연결 (서버 함수/GEMINI_KEY 필요)'; }
}
function mnPopulateSeong() {
  const seong = $('mnSeong').value.trim();
  const arr = DICT.surname[seong] || [];
  $('mnSeongHanja').innerHTML = '<option value="">한자 없음</option>' +
    arr.map((a) => `<option value="${a.hanja}">${a.hanja} (${a.strokes}획·${a.wuxing})</option>`).join('');
}
function mnPopulateName() {
  const name = $('mnName').value.trim();
  $('mnNameHanjaWrap').innerHTML = [...name].map((h) => {
    const cands = DICT.pool.filter((p) => p.hangul === h);
    const opts = '<option value="">한자 없음</option>' +
      cands.map((c) => `<option value="${c.hanja}">${c.hanja} (${c.strokes}획·${c.wuxing})</option>`).join('');
    return `<label>${h} 한자<select class="mnNameHanja">${opts}</select></label>`;
  }).join('');
}
function mnBirthSaju() {
  const birth = getBirth();
  if (!birth.year) return null;
  return window.Saju.computeSaju(birth);
}
function scoreMyName() {
  const seong = $('mnSeong').value.trim();
  const name = $('mnName').value.trim();
  if (!seong || !name) { alert('성과 이름을 입력하세요'); return; }
  const sHanja = $('mnSeongHanja').value;
  const nameSels = [...document.querySelectorAll('.mnNameHanja')].map((s) => s.value);
  const chars2 = [...name];
  const fullHanja = sHanja && chars2.length === 2 && nameSels.length === 2 && nameSels.every((v) => v);
  let r;
  if (fullHanja) {
    const saju = mnBirthSaju();
    if (!saju) { alert('한자 6항목 채점은 위 출생 정보(생년월일·시각)가 필요합니다'); return; }
    const surnameObj = (DICT.surname[seong] || []).find((x) => x.hanja === sHanja)
      || { hangul: seong, hanja: sHanja, strokes: 0, wuxing: '토' };
    const chars = chars2.map((h, i) => (DICT.pool.find((p) => p.hangul === h && p.hanja === nameSels[i]))
      || { hangul: h, hanja: nameSels[i], strokes: 0, wuxing: '토' });
    r = window.Naming.scoreName(saju, surnameObj, chars);
  } else {
    if (!window.HangulStroke) { alert('한글 모듈 로드 실패'); return; }
    r = window.Naming.scoreNameHangul(seong, name);
  }
  $('mnResult').classList.remove('hidden');
  renderMyRadar(r);
  explainAI(r);
}

/* ---------- 결과 이미지 저장 ---------- */
// 클론에 canvas는 png img로 치환(cloneNode는 비트맵 복사 안 됨)
function cloneWithCanvas(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll('button').forEach((b) => b.remove()); // 캡처에 버튼 제외
  const orig = node.querySelectorAll('canvas');
  const cloned = clone.querySelectorAll('canvas');
  orig.forEach((oc, i) => {
    const img = document.createElement('img');
    img.src = oc.toDataURL('image/png');
    img.style.cssText = oc.style.cssText;
    img.style.width = (oc.style.width || oc.width + 'px');
    img.style.height = (oc.style.height || oc.height + 'px');
    if (cloned[i]) cloned[i].replaceWith(img);
  });
  return clone;
}

async function saveReportImage() {
  if (typeof html2canvas === 'undefined') { alert('이미지 라이브러리 로드 실패 — 잠시 후 다시 시도하세요.'); return; }
  // 화면에 떠있는(생성된) 결과 블록만 수집
  const sections = [];
  const add = (title, el, on) => { if (el && on) sections.push([title, el]); };
  add('🔮 사주풀이', $('usResult'), $('usResult') && !$('usResult').classList.contains('hidden'));
  add('📷 관상', $('us-gwansang'), $('us-gwansang') && $('us-gwansang').textContent.trim());
  add('📊 내 이름 점수', $('mnResult'), $('mnResult') && !$('mnResult').classList.contains('hidden'));
  add('✨ 작명 추천', $('result-card'), $('result-card') && !$('result-card').classList.contains('hidden'));
  if (!sections.length) { alert('저장할 결과가 없습니다. 먼저 분석을 실행해 주세요.'); return; }

  const btn = $('saveImgBtn');
  const label = btn.textContent; btn.disabled = true; btn.textContent = '이미지 생성 중...';
  // 캡처 전용 컨테이너(화면 밖)
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-99999px;top:0;width:720px;background:#fff;color:#222;padding:28px;box-sizing:border-box;font-family:inherit';
  const seong = ($('mnSeong').value || '').trim();
  const name = ($('mnName').value || '').trim();
  const head = document.createElement('div');
  head.style.cssText = 'border-bottom:2px solid #8b5e34;padding-bottom:10px;margin-bottom:18px';
  head.innerHTML = `<div style="font-size:22px;font-weight:700;color:#8b5e34">🔮 사주풀이 · 관상 · 작명 결과</div>` +
    `<div style="font-size:14px;color:#555;margin-top:4px">${(seong + name) || ''} ${$('birthdate').value ? '· ' + $('birthdate').value : ''} · ${new Date().toLocaleDateString('ko-KR')}</div>`;
  wrap.appendChild(head);
  for (const [title, el] of sections) {
    const block = document.createElement('div');
    block.style.cssText = 'margin-bottom:22px';
    const h = document.createElement('div');
    h.style.cssText = 'font-size:17px;font-weight:700;margin:0 0 8px;color:#5a3d22';
    h.textContent = title;
    block.appendChild(h);
    block.appendChild(cloneWithCanvas(el));
    wrap.appendChild(block);
  }
  const foot = document.createElement('div');
  foot.style.cssText = 'border-top:1px solid #ddd;padding-top:8px;margin-top:6px;font-size:11px;color:#999';
  foot.textContent = '※ 통용 명리·성명학 기반 참고용 · naming-app-five.vercel.app';
  wrap.appendChild(foot);
  document.body.appendChild(wrap);

  try {
    const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const a = document.createElement('a');
    const tag = (seong + name) || 'saju';
    a.download = `${tag}_사주작명_${new Date().toISOString().slice(0, 10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (e) {
    alert('이미지 생성 실패: ' + (e.message || e));
  } finally {
    document.body.removeChild(wrap);
    btn.disabled = false; btn.textContent = label;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  populateCity();
  $('dataStatus').textContent = '데이터 불러오는 중...';
  await loadDictionary();
  $('usBtn').addEventListener('click', usAnalyze);
  $('usDeepBtn').addEventListener('click', deepAnalysis);
  $('gsPhoto').addEventListener('change', gsHandleFile);
  $('usGwansangBtn').addEventListener('click', gwansangReading);
  $('analyze').addEventListener('click', analyze);
  $('mnBtn').addEventListener('click', scoreMyName);
  $('mnSeong').addEventListener('input', mnPopulateSeong);
  $('mnName').addEventListener('input', mnPopulateName);
  $('saveImgBtn').addEventListener('click', saveReportImage);
  $('timeUnknown').addEventListener('change', (e) => { $('birthtime').disabled = e.target.checked; });
});
