/* =========================================================================
 * naming.js — 작명 채점 엔진 (육각형 6항목 + 총점)
 *
 * 6개 평가 항목(각 0~100), 가중 합산으로 총점(0~100):
 *   1) 사주보완 (weight 25) — 이름 한자의 자원오행이 용신/부족오행을 보충
 *   2) 수리길흉 (weight 20) — 81수리 4격(인/지/외/총)
 *   3) 발음오행 (weight 20) — 성→이름 초성오행 상생 흐름
 *   4) 자원조화 (weight 15) — 이름 두 글자 자원오행이 상생/비화
 *   5) 음양조화 (weight 10) — 획수 홀짝(음양) 배열
 *   6) 발음편의 (weight 10) — 부르기 좋은 정도(중복음/된소리 회피)
 * ========================================================================= */

const WEIGHTS = { saju: 25, sugri: 20, eum: 20, jawon: 15, eumyang: 10, call: 10 };
const NM_SAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const NM_GEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

// 두음법칙: 이름 첫 글자에 적용 (렬→열, 령→영, 려→여, 로→노, 리→이 …)
function duum(ch) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return ch;
  let cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28), jong = code % 28;
  const yOrI = [2, 3, 6, 7, 12, 17, 20].indexOf(jung) >= 0; // ㅑㅒㅕㅖㅛㅠㅣ
  if (cho === 5) cho = yOrI ? 11 : 2;        // ㄹ→ㅇ(i/y) / ㄴ(기타)
  else if (cho === 2) { if (yOrI) cho = 11; } // ㄴ→ㅇ(i/y)
  else return ch;
  return String.fromCharCode(0xac00 + cho * 588 + jung * 28 + jong);
}

function relWx(a, b) {
  if (a === b) return '비화';
  if (NM_SAENG[a] === b) return '상생';
  if (NM_GEUK[a] === b) return '상극';
  if (NM_SAENG[b] === a) return '역생';
  return '역극';
}

// 1) 사주보완: 자원오행이 용신(우선순위)·부족오행을 보충하는가 (두 글자 평균)
function scoreSaju(saju, chars) {
  const yong = saju.yongsin || [];      // [primary, secondary]
  const lack = new Set(saju.lacking || []);
  const val = (wx) => {
    if (wx === yong[0]) return 100;      // 1순위 용신
    if (yong.includes(wx)) return 82;    // 2순위 용신
    if (lack.has(wx)) return 62;         // 부족오행 보충
    return 35;                           // 한신(영향 적음)
  };
  return Math.round((val(chars[0].wuxing) + val(chars[1].wuxing)) / 2);
}

// 2) 수리길흉 — 인격·총격을 더 비중 있게 가중
function scoreSugri(gyeok) {
  const pt = { 길: 100, 반길: 55, 흉: 15 };
  const w = { in: 0.35, ji: 0.20, oe: 0.15, chong: 0.30 };
  let s = 0;
  for (const k in w) s += (pt[gyeok[k].grade] ?? 0) * w[k];
  return Math.round(s);
}

// 3) 발음오행 (성+이1+이2 초성 흐름, 전이 평균)
function scoreEum(evalResult) {
  const pt = { 상생: 100, 비화: 78, 역생: 55, 역극: 28, 상극: 5 };
  const f = evalResult.flow;
  if (!f.length) return 60;
  return Math.round(f.reduce((a, x) => a + (pt[x.rel] ?? 0), 0) / f.length);
}

// 4) 자원조화 (이름 두 글자끼리)
function scoreJawon(chars) {
  if (chars.length < 2) return 60;
  const r = relWx(chars[0].wuxing, chars[1].wuxing);
  return { 상생: 100, 비화: 82, 역생: 58, 상극: 28, 역극: 20 }[r];
}

// 5) 음양조화 (획수 홀짝). 성+이1+이2가 한쪽 음양으로 쏠리면 흉.
function scoreEumyang(seongStrokes, chars) {
  const par = [seongStrokes, ...chars.map((c) => c.strokes)].map((n) => n % 2);
  const allSame = par.every((p) => p === par[0]);
  return allSame ? 35 : 100; // 3글자는 3:0(쏠림) 또는 2:1(조화) 두 경우
}

// 6) 발음편의
function scoreCall(seongHangul, nameHangul) {
  let s = 100;
  if (nameHangul[0] === nameHangul[1]) s -= 50;            // 이름 두 글자 동일
  const cho = (ch) => {
    const code = ch.charCodeAt(0) - 0xac00;
    return code >= 0 ? Math.floor(code / 588) : -1;
  };
  if (cho(seongHangul) === cho(nameHangul[0])) s -= 10;    // 성-이름 초성 동일
  const dens = ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'];
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  [...nameHangul].forEach((ch) => { if (dens.includes(CHO[cho(ch)])) s -= 10; });
  return Math.max(0, s);
}

/**
 * 이름 하나 채점
 * @param {object} saju computeSaju 결과
 * @param {object} surname {hangul, hanja, strokes, wuxing}
 * @param {object[]} chars 이름 글자 [{hangul,hanja,strokes,wuxing}, ...] (2개)
 */
function scoreName(saju, surname, chars) {
  const firstH = duum(chars[0].hangul); // 첫 글자 두음법칙
  const restH = chars.slice(1).map((c) => c.hangul);
  const nameHangul = firstH + restH.join('');
  const gyeok = window.Sugri.computeGyeok(surname.strokes, chars[0].strokes, chars[1].strokes);
  const evalEum = window.Eum.evaluate([surname.hangul, firstH, ...restH]);

  const axes = {
    saju: scoreSaju(saju, chars),
    sugri: scoreSugri(gyeok),
    eum: scoreEum(evalEum),
    jawon: scoreJawon(chars),
    eumyang: scoreEumyang(surname.strokes, chars),
    call: scoreCall(surname.hangul, nameHangul),
  };
  let raw = 0;
  for (const k in WEIGHTS) raw += axes[k] * WEIGHTS[k];
  raw = raw / 100;

  return {
    surname, chars,
    hangul: surname.hangul + nameHangul,
    hanja: surname.hanja + chars.map((c) => c.hanja).join(''),
    axes,
    total: Math.round(raw),       // 표시용 정수
    totalRaw: Math.round(raw * 100) / 100, // 정렬용
    gyeok, evalEum,
  };
}

/**
 * 후보 이름 생성 + 랭킹
 * @param {object} saju
 * @param {object} surname
 * @param {object[]} pool 이름 한자 풀 [{hangul,hanja,strokes,wuxing}]
 * @param {object} opt {limit, excludeHyung}
 */
function suggest(saju, surname, pool, opt = {}) {
  const { limit = 20, excludeHyung = false, maxPerFirstChar = 3, maxCand = 220 } = opt;
  // 성능: 용신/부족오행 한자로 후보 압축 후 페어링 (전쌍 채점 방지)
  const targets = new Set([...(saju.yongsin || []), ...(saju.lacking || [])]);
  let cand = targets.size ? pool.filter((p) => targets.has(p.wuxing)) : pool.slice();
  if (!cand.length) cand = pool.slice();
  if (cand.length > maxCand) {
    const step = Math.ceil(cand.length / maxCand);
    cand = cand.filter((_, i) => i % step === 0);
  }
  const results = [];
  for (let i = 0; i < cand.length; i++) {
    for (let j = 0; j < cand.length; j++) {
      if (cand[i].hanja === cand[j].hanja && cand[i].hangul === cand[j].hangul) continue;
      const r = scoreName(saju, surname, [cand[i], cand[j]]);
      if (excludeHyung && r.gyeok.hasHyung) continue;
      results.push(r);
    }
  }
  results.sort((a, b) => b.totalRaw - a.totalRaw || b.axes.saju - a.axes.saju);
  // 같은 한글 이름 중복 제거 + 첫 글자 쏠림 방지(다양성)
  const seen = new Set();
  const firstCount = {};
  const out = [];
  for (const r of results) {
    if (seen.has(r.hangul)) continue;
    const fc = r.chars[0].hangul;
    if ((firstCount[fc] || 0) >= maxPerFirstChar) continue;
    seen.add(r.hangul);
    firstCount[fc] = (firstCount[fc] || 0) + 1;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

// 한글 전용 채점 (한자 없음): 한글 자모 획수로 수리·음양, 발음 2항목. 4축 재가중.
const WEIGHTS_HANGUL = { eum: 35, sugri: 25, eumyang: 20, call: 20 };
function scoreNameHangul(surnameHangul, nameHangul) {
  const HS = window.HangulStroke;
  const sStroke = HS.syllable(surnameHangul);
  const chars = [...nameHangul].map((h) => ({ hangul: h, strokes: HS.syllable(h) }));
  const c0 = chars[0] ? chars[0].strokes : 0;
  const c1 = chars[1] ? chars[1].strokes : 0;
  const gyeok = window.Sugri.computeGyeok(sStroke, c0, c1);
  const evalEum = window.Eum.evaluate([surnameHangul, ...chars.map((c) => c.hangul)]);
  const axes = {
    eum: scoreEum(evalEum),
    sugri: scoreSugri(gyeok),
    eumyang: scoreEumyang(sStroke, chars),
    call: scoreCall(surnameHangul, nameHangul),
  };
  let raw = 0; for (const k in WEIGHTS_HANGUL) raw += axes[k] * WEIGHTS_HANGUL[k];
  raw /= 100;
  return {
    hangul: surnameHangul + nameHangul, hanja: '',
    strokes: { surname: sStroke, chars: chars.map((c) => c.strokes) },
    axes, total: Math.round(raw), totalRaw: Math.round(raw * 100) / 100,
    gyeok, evalEum, hangulOnly: true,
  };
}

window.Naming = { scoreName, scoreNameHangul, suggest, WEIGHTS, WEIGHTS_HANGUL };
