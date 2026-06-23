/* =========================================================================
 * eumohaeng.js — 발음오행(發音五行)
 *
 * 한글 초성(자음)의 오행으로, 성→이름 글자들이 상생으로 흐르는지 봅니다.
 *   ㄱㅋ        → 木
 *   ㄴㄷㄹㅌ     → 火
 *   ㅇㅎ        → 土
 *   ㅅㅈㅊ       → 金
 *   ㅁㅂㅍ       → 水
 * (된소리 ㄲㄸㅃㅆㅉ은 기본 자음과 동일 오행으로 처리)
 * ========================================================================= */

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const CHO_WX = {
  ㄱ: '목', ㄲ: '목', ㅋ: '목',
  ㄴ: '화', ㄷ: '화', ㄸ: '화', ㄹ: '화', ㅌ: '화',
  ㅇ: '토', ㅎ: '토',
  ㅅ: '금', ㅆ: '금', ㅈ: '금', ㅉ: '금', ㅊ: '금',
  ㅁ: '수', ㅂ: '수', ㅃ: '수', ㅍ: '수',
};

const SAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const GEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

/** 한글 음절의 초성 오행 */
function chowx(syllable) {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const cho = CHOSEONG[Math.floor(code / 588)];
  return CHO_WX[cho];
}

function relation(a, b) {
  if (a === b) return '비화'; // 같은 오행
  if (SAENG[a] === b) return '상생';
  if (GEUK[a] === b) return '상극';
  if (SAENG[b] === a) return '역생'; // 뒤가 앞을 생 (무난)
  return '역극'; // 뒤가 앞을 극 (흉)
}

/**
 * 성+이름 음절 배열의 발음오행 흐름 평가
 * @param {string[]} syllables 예) ['김','지','우']
 */
function evaluate(syllables) {
  const wx = syllables.map(chowx);
  const flow = [];
  let score = 0;
  for (let i = 0; i < wx.length - 1; i++) {
    const r = relation(wx[i], wx[i + 1]);
    flow.push({ from: wx[i], to: wx[i + 1], rel: r });
    if (r === '상생') score += 2;
    else if (r === '비화') score += 1;
    else if (r === '역생') score += 0;
    else if (r === '상극') score -= 2;
    else if (r === '역극') score -= 1;
  }
  const good = flow.every((f) => f.rel === '상생' || f.rel === '비화');
  return { wx, flow, score, good };
}

window.Eum = { chowx, evaluate, relation, CHO_WX };
