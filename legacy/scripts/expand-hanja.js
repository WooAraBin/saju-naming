/* 자원오행 발음오행구분표.xlsx(검수본) → data/hanja.js HANJA 생성
 * 컬럼: 음, 한자, 소리뜻, 획수, 부수, 발음오행, 자원오행, 비고
 * 자원오행(검수)·획수(검수) 사용. SURNAME(기존 검수)은 유지.
 * 실행: node scripts/expand-hanja.js  (openpyxl 대신 python으로 xlsx→json 추출)
 */
const fs = require('fs'), vm = require('vm'), cp = require('child_process');
const raw = cp.execSync('python3 /tmp/parse_xlsx.py', { maxBuffer: 1 << 26 }).toString();
const rows = JSON.parse(raw);

const WXMAP = { '木':'목','火':'화','土':'토','金':'금','水':'수','목':'목','화':'화','토':'토','금':'금','수':'수' };

// 기존 SURNAME 보존
const win={}; const ctx={window:win}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../data/hanja.js','utf8'),ctx);
const SURNAME = win.HanjaDB.SURNAME;

const HANJA={}; let n=0, skip=0;
for (const [eum, hanja, hs, jw] of rows) {
  const wx = WXMAP[jw];
  const strokes = parseInt(hs,10);
  if (!eum || !hanja || !wx || !strokes) { skip++; continue; }
  (HANJA[eum]=HANJA[eum]||[]).push([hanja, strokes, wx]);
  n++;
}
// 음절별 중복 한자 제거
for (const k in HANJA){const seen=new Set();HANJA[k]=HANJA[k].filter(r=>seen.has(r[0])?false:(seen.add(r[0]),true));}

let tot=0; for (const k in HANJA) tot+=HANJA[k].length;
console.error('음절:',Object.keys(HANJA).length,'한자:',tot,'제외:',skip);

function dump(o){return Object.keys(o).map(k=>'  '+JSON.stringify(k)+': '+JSON.stringify(o[k])).join(',\n');}
fs.writeFileSync(__dirname+'/../data/hanja.js',
`/* hanja.js — 작명 통용 한자 사전 (검수본: 자원오행 발음오행구분표)
 * 형식: 한글음 → [ [한자, 성명학획수, 자원오행], ... ]
 */
const SURNAME = {
${dump(SURNAME)}
};
const HANJA = {
${dump(HANJA)}
};
window.HanjaDB = { SURNAME, HANJA };
`);
console.error('data/hanja.js 재작성 완료');
