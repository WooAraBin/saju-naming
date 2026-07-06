// node 검증 harness — 브라우저 전역(window)을 흉내내어 모듈 로드
global.window = global;
const lunar = require('lunar-javascript');
global.Solar = lunar.Solar;
global.Lunar = lunar.Lunar;

require('../data/hanja.js');
require('../js/saju.js');
require('../js/sugri.js');
require('../js/eumohaeng.js');
require('../js/naming.js');

// 1) 사주 계산 (1990-05-20 10:30, 서울 경도 보정)
const saju = window.Saju.computeSaju({
  year: 1990, month: 5, day: 20, hour: 10, minute: 30,
  lon: 127.0, applyLocalTime: true,
});
console.log('=== 사주 ===');
console.log('팔자:', saju.pillars);
console.log('일간/오행:', saju.dayGan, saju.dayWx);
console.log('오행분포:', saju.count);
console.log('신강?', saju.isStrong, '| 용신:', saju.yongsin, '| 부족:', saju.lacking);
console.log('보충타깃:', saju.target);
console.log('지방시보정(분):', saju.offsetMin, '| 적용시각:', saju.solarStr);

// 2) 수리 4격
console.log('\n=== 수리(김8 + 지7 + 우6) ===');
console.log(window.Sugri.computeGyeok(8, 12, 6));

// 3) 발음오행
console.log('\n=== 발음오행 (김지우) ===');
console.log(window.Eum.evaluate(['김', '지', '우']));

// 4) 작명 추천 (성: 김)
const surname = { hangul: '김', hanja: '金', strokes: 8, wuxing: '금' };
const pool = [];
for (const [hangul, arr] of Object.entries(window.HanjaDB.HANJA)) {
  arr.forEach(([hanja, strokes, wuxing]) => pool.push({ hangul, hanja, strokes, wuxing }));
}
console.log('\n=== 추천 TOP 10 (성:김, pool', pool.length, '자) ===');
const t0 = Date.now();
const res = window.Naming.suggest(saju, surname, pool, { limit: 10 });
console.log('계산시간(ms):', Date.now() - t0, '| 조합수≈', pool.length * pool.length);
res.forEach((r, i) => {
  console.log(
    `${i + 1}. ${r.hangul}(${r.hanja}) 총점 ${r.total} ` +
    `[사주${r.axes.saju} 수리${r.axes.sugri} 발음${r.axes.eum} 자원${r.axes.jawon} 음양${r.axes.eumyang} 편의${r.axes.call}]`
  );
});
