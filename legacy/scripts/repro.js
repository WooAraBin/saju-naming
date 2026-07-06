// 작명 후보 재현 harness — 브라우저 없이 엔진 직접 실행
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Lunar = require(path.join(ROOT, 'node_modules/lunar-javascript'));

global.window = {};
global.Solar = Lunar.Solar;
global.Lunar = Lunar.Lunar;

const files = ['data/hanja.js', 'js/hangul.js', 'js/saju.js', 'js/sugri.js', 'js/eumohaeng.js', 'js/naming.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  vm.runInThisContext(code, { filename: f });
}

// 로컬 사전 구성
const local = window.HanjaDB;
const surname = {};
for (const [hangul, arr] of Object.entries(local.SURNAME)) surname[hangul] = arr.map(([hanja, strokes, wuxing]) => ({ hangul, hanja, strokes, wuxing }));
const pool = [];
for (const [hangul, arr] of Object.entries(local.HANJA)) arr.forEach(([hanja, strokes, wuxing]) => pool.push({ hangul, hanja, strokes, wuxing }));

// 케이스: 1985-02-13 21:13 남, 김씨, 서울
const saju = window.Saju.computeSaju({ year: 1985, month: 2, day: 13, hour: 21, minute: 13, lon: 126.98, applyLocalTime: true, gender: 'M' });
console.log('일간', saju.dayGan, saju.dayWx, saju.isStrong ? '신강' : '신약', '용신', saju.yongsin, '부족', saju.lacking);

const sn = surname['김'][0];
const cands = window.Naming.suggest(saju, sn, pool, { limit: 56, maxPerFirstChar: 4, naturalN: 42, highN: 14 });
console.log('후보수', cands.length);
const nat = cands.filter((c) => c.isNatural);
console.log('자연수', nat.length);
console.log('\n[자연 후보 상위 25]');
nat.slice(0, 25).forEach((c) => console.log(`  ${c.hangul} ${c.hanja} 총${c.total}`));
console.log('\n[고득점(비자연)]');
cands.filter((c) => !c.isNatural).slice(0, 14).forEach((c) => console.log(`  ${c.hangul} ${c.hanja} 총${c.total}`));
