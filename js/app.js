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
  '춘천': 127.73, '강릉': 128.90, '청주': 127.49, '세종': 127.29, '대전': 127.38,
  '천안': 127.15, '전주': 127.15, '광주': 126.85, '목포': 126.39, '여수': 127.66,
  '순천': 127.49, '대구': 128.60, '안동': 128.73, '포항': 129.36, '경주': 129.22,
  '부산': 129.08, '울산': 129.31, '창원': 128.68, '진주': 128.11, '제주': 126.53,
  '개성(북)': 126.55, '평양(북)': 125.75,
  '해외·모름': null,
};
function populateCity() {
  $('city').innerHTML = Object.keys(CITY).map((c) => `<option value="${c}">${c}</option>`).join('');
  $('city').value = '서울';
}
// 공용 출생정보 → computeSaju 입력
function getBirth() {
  const [y, m, d] = ($('birthdate').value || '').split('-').map(Number);
  const [hh, mm] = ($('birthtime').value || '').split(':').map(Number);
  const city = $('city').value, lon = CITY[city];
  return {
    year: y, month: m, day: d, hour: hh, minute: mm,
    lon: lon == null ? 127.0 : lon,
    applyLocalTime: lon != null, // 도시 알면 보정, 해외/모름이면 미보정
    gender: $('gender').value,
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
function sajuPillarsHtml(saju) {
  const KO = { year: '연주', month: '월주', day: '일주', time: '시주' };
  const ps = ['year', 'month', 'day', 'time'];
  const sip = (saju.sip && saju.sip.pillars) || {};
  const dt = saju.detail || {};
  const GW = window.Saju.GAN_WX, ZW = window.Saju.ZHI_WX;
  const gan = (p) => saju.pillars[p][0], zhi = (p) => saju.pillars[p][1];
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
    (saju.offsetMin ? `<br><span class="muted">지방시 보정 ${saju.offsetMin}분</span>` : '');
}
function sajuPrompt(saju, forNaming) {
  const gc = (saju.sip && saju.sip.groupCount) || {};
  const sipStr = Object.keys(gc).filter((k) => gc[k]).map((k) => `${k}${gc[k]}`).join(', ');
  const dw = saju.daewoon, sw = saju.sewoon;
  return `너는 한국 사주명리 전문가다. 아래 사주를 ${forNaming ? '6~9' : '8~12'}문장으로 깊이 있게, 따뜻하게 풀어줘.
타고난 성향(일간·오행), 강약과 용신의 의미, 십신 분포가 말하는 성격/적성, 현재 대운과 올해 세운의 흐름을 유기적으로 연결할 것. 단정적 운세는 피하고 '~일 수 있어요' 톤.${forNaming ? ' 마지막에 이름에 보충하면 좋은 오행을 자연스럽게 언급.' : ' 직업·재물·관계·건강 흐름도 짚어줘.'}
사주팔자: ${saju.pillars.year} ${saju.pillars.month} ${saju.pillars.day} ${saju.pillars.time}
일간: ${saju.dayGan}(${saju.dayWx}), ${saju.isStrong ? '신강' : '신약'}
오행 분포: ${window.Saju.WX_KO.map((o) => o + saju.count[o]).join(' ')}
십신 분포: ${sipStr}
용신/보충오행: ${saju.target.join(', ')}
${dw ? `현재 대운: ${dw.ganzhi}(${dw.sipsin}, ${dw.startAge}세~)` : ''}
${sw ? `올해 세운: ${sw.year} ${sw.ganzhi}(${sw.sipsin})` : ''}`;
}
async function explainSajuInto(elId, saju, forNaming) {
  const el = $(elId); if (!el) return;
  el.textContent = '🔮 사주 해설 생성 중...';
  try {
    const resp = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: sajuPrompt(saju, forNaming) }) });
    const j = await resp.json();
    el.textContent = j.text ? '🔮 ' + j.text : '';
  } catch (e) { el.textContent = ''; }
}

// 심층 분석 프롬프트 — 만세력 전 데이터 투입, 항목별 깊은 풀이 + 타로 연결
function deepPrompt(saju) {
  const p = saju.pillars, sp = saju.sip.pillars, dt = saju.detail || {};
  const sipLine = `연주 천간 ${p.year[0]}=${sp.year.gan} / 지지 ${p.year[1]}=${sp.year.zhi}, ` +
    `월주 천간 ${p.month[0]}=${sp.month.gan} / 지지 ${p.month[1]}=${sp.month.zhi}, ` +
    `일주 천간 ${p.day[0]}=일간 / 지지 ${p.day[1]}=${sp.day.zhi}, ` +
    `시주 천간 ${p.time[0]}=${sp.time.gan} / 지지 ${p.time[1]}=${sp.time.zhi}`;
  const hide = ['year', 'month', 'day', 'time'].map((k) => `${k === 'year' ? '연' : k === 'month' ? '월' : k === 'day' ? '일' : '시'} ${p[k][1]}(${(dt[k] || {}).hideGan || ''})`).join(', ');
  const dwList = (saju.daewoonList || []).map((d) => `${d.startAge}세~ ${d.ganzhi}(${d.sipsin})`).join(', ');
  const dw = saju.daewoon, sw = saju.sewoon;
  return `너는 한국 최고의 사주명리·타로 전문가다. 아래 한 사람의 사주를 매우 깊이 있게, 전문가가 직접 상담하듯 항목별로 길고 풍부하게 풀이해줘.
반드시 아래 구조의 마크다운으로(## 제목, **굵게**, - 글머리), 단정적 운세는 피하고 '~일 수 있어요/~한 편이에요' 톤으로, 따뜻하지만 디테일하게.

## 사주 원국
- 팔자와 일간(${saju.dayGan}${saju.dayWx})의 물상(物象)·기질을 그림 그리듯 설명

## 오행 분석
- 분포를 보고 강한/약한 오행이 성격·재물·관계·건강에 주는 의미를 핵심 포인트로

## 일간 ${saju.dayGan}의 특성
- 같은 오행이라도 ${saju.dayGan}만의 결을 살려서

## 십신 배치 해석
- 각 기둥 십신이 말하는 성향·적성·직업 코드

## 지지 합충 관계
- 삼합·육합·반합·충·형·해를 직접 찾아 의미 해석 (가장 중요한 충부터)

## 상세 성격 분석
- 2~4개 포인트로 입체적으로

## 대운 흐름
- 전체 대운을 한 줄씩 짚고, **현재 대운**을 심층 분석한 뒤 어울리는 타로 메이저 카드 1장을 연결해 해석

## 올해 세운
- 올해 흐름을 심층 분석하고 타로 카드 1장 연결

## 종합 조언
- 직업·재물·관계·건강을 한 단락씩

[사주 데이터]
사주팔자: 연 ${p.year} / 월 ${p.month} / 일 ${p.day} / 시 ${p.time}
일간: ${saju.dayGan}(${saju.dayWx}), ${saju.isStrong ? '신강' : '신약'}, ${saju.tti}띠
오행 분포: ${window.Saju.WX_KO.map((o) => o + saju.count[o]).join(' ')}
십신 배치: ${sipLine}
지장간: ${hide}
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
// ① 사주풀이 (메인)
function usAnalyze() {
  const birth = getBirth();
  if (!birth.year) { alert('생년월일을 입력하세요'); return; }
  const saju = window.Saju.computeSaju(birth);
  window._usSaju = saju; // 타로 연동용
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
  lastResults = await scoreAndRank(cands, saju.gender, seong);
  btn.disabled = false; btn.textContent = '이름 추천 받기';
  renderList(lastResults);
  renderRadar(lastResults[0]);
}

// 자연스러움 점수 가중치 (최종점수 = 명리점수*(1-W) + 자연스러움*W)
const NATURE_W = 0.45;
// 후보 이름(한글)만 Gemini에 던져 자연스러움 점수를 받고, 기존 명리점수와 합산해 재정렬
async function scoreAndRank(cands, gender, seong) {
  const g = (gender === 'F') ? '여자' : '남자';
  const list = cands.map((r, i) => `${i + 1}. ${seong}${r.hangul}`).join('\n');
  const prompt = `다음은 ${g} 이름 후보다. 오직 '이 이름이 ${g} 이름으로서 얼마나 자연스럽고 듣기 좋은가' 한 가지 기준으로만 0~100점을 매겨라.
절대 보지 말 것: 한자, 뜻, 획수, 사주, 길흉, 작명 이론. 오로지 귀로 들었을 때의 어감·친숙함만 본다.
점수 기준(짜게):
- 실제로 흔히 쓰는 자연스러운 이름: 85~100
- 가능하지만 다소 낯선 이름: 60~84
- 단어처럼 어색하거나(겸단·계로·담운·결단 류) 이름 같지 않은 조합: 0~40
tip은 어감에 대한 한 줄 코멘트만(뜻·한자·사주 언급 금지). 반드시 JSON 배열로만: [{"no":1,"nat":92,"tip":"발음이 부드럽고 친숙해요"}]
이름:
${list}`;
  // 명리 점수 보존
  cands.forEach((r) => { r.baseTotal = r.total; });
  let scored = false;
  try {
    const resp = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    const j = await resp.json();
    const m = (j.text || '').replace(/```json|```/g, '').match(/\[[\s\S]*\]/);
    if (m) {
      JSON.parse(m[0]).forEach((o) => {
        const r = cands[(o.no | 0) - 1];
        if (r) { r.axes.nature = Math.max(0, Math.min(100, o.nat | 0)); r.tip = o.tip || ''; }
      });
      scored = true;
    }
  } catch (e) {}
  cands.forEach((r) => {
    if (r.axes.nature == null) r.axes.nature = 55; // 평가 누락 시 중립값
    r.total = Math.round(r.baseTotal * (1 - NATURE_W) + r.axes.nature * NATURE_W);
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

window.addEventListener('DOMContentLoaded', async () => {
  populateCity();
  $('dataStatus').textContent = '데이터 불러오는 중...';
  await loadDictionary();
  $('usBtn').addEventListener('click', usAnalyze);
  $('usDeepBtn').addEventListener('click', deepAnalysis);
  $('analyze').addEventListener('click', analyze);
  $('mnBtn').addEventListener('click', scoreMyName);
  $('mnSeong').addEventListener('input', mnPopulateSeong);
  $('mnName').addEventListener('input', mnPopulateName);
});
