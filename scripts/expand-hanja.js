/* hanja.csv(rycont/hanja-grade-dataset) → data/hanja.js HANJA 확장 생성
 * 자원오행 = 부수(radical) 기반 추정 (작명 통용 방식, 참고용).
 * 기존 시드의 curated 오행/획수는 유지(덮어쓰지 않음).
 */
const fs = require('fs'), vm = require('vm');

// 부수 → 자원오행 (강희 214부수 통용 분류, 일부 유파차 있음)
const RAD_WX = {
  // 水
  '水':'수','氵':'수','氺':'수','冫':'수','雨':'수','魚':'수','龜':'수','黑':'수','子':'수','亥':'수','川':'수','永':'수',
  // 火
  '火':'화','灬':'화','日':'화','心':'화','忄':'화','赤':'화','光':'화','馬':'화','鳥':'화','隹':'화','丶':'화','立':'화','見':'화','目':'화',
  // 木
  '木':'목','艸':'목','艹':'목','竹':'목','禾':'목','米':'목','糸':'목','纟':'목','麻':'목','韭':'목','瓜':'목','工':'목','耒':'목','靑':'목','青':'목','風':'목','气':'목','毛':'목','羽':'목','非':'목',
  // 金
  '金':'금','釒':'금','钅':'금','刀':'금','刂':'금','戈':'금','斤':'금','矛':'금','車':'금','辛':'금','酉':'금','玉':'금','王':'금','玊':'금','貝':'금','石':'금','缶':'금','瓦':'금','革':'금','音':'금','齒':'금','骨':'금',
  // 土
  '土':'토','士':'토','山':'토','田':'토','阜':'토','阝':'토','邑':'토','里':'토','厂':'토','广':'토','宀':'토','穴':'토','黃':'토','黄':'토','黍':'토','禾土':'토','至':'토','瓦土':'토',
  // 사람/획 계열 → 토(중립) 또는 목, 통용상 분류
  '人':'화','亻':'화','大':'화','立心':'화',
  '口':'수','囗':'수','言':'금','辶':'토','彳':'화','女':'토','力':'금','又':'수','寸':'금','尸':'토','巾':'목','干':'목','幺':'화','弓':'화','彡':'화','手':'목','扌':'목','支':'금','攴':'금','攵':'금','文':'수','斗':'화','方':'토','无':'화','曰':'화','月':'수','欠':'금','歹':'화','殳':'금','比':'수','氏':'화','爪':'금','爫':'금','父':'금','爻':'화','爿':'목','片':'목','牙':'금','牛':'토','犬':'토','犭':'토','疒':'수','癶':'화','白':'금','皮':'금','皿':'수','矢':'금','示':'목','礻':'목','禸':'토','网':'목','罒':'목','羊':'토','老':'화','而':'수','臣':'금','自':'금','臼':'토','舌':'화','舛':'화','舟':'목','色':'목','虍':'목','虫':'화','血':'수','行':'화','衣':'목','衤':'목','西':'금','襾':'금','角':'목','谷':'수','豆':'목','豕':'수','豸':'수','足':'토','身':'화','辰':'토','面':'화','韋':'금','頁':'화','食':'수','飠':'수','首':'화','香':'목','高':'목','髟':'화','鬥':'화','鬼':'화','鹵':'수','鹿':'토','鼎':'화','鼓':'금','鼠':'수','鼻':'금','龍':'토','一':'토','丨':'목','丿':'화','乙':'목','亅':'금','二':'화','亠':'화','儿':'화','入':'목','八':'금','冂':'목','冖':'수','几':'목','凵':'수','勹':'목','匕':'금','匚':'금','匸':'금','十':'금','卜':'화','卩':'화','厶':'금','寸金':'금'
};
const VALID=['목','화','토','금','수'];

// 기존 시드 로드(curated 유지)
const win={}; const ctx={window:win}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../data/hanja.js','utf8'),ctx);
const SURNAME=win.HanjaDB.SURNAME, OLD=win.HanjaDB.HANJA;
const curated={}; // "음|한자" → [strokes,wx]
for(const k in OLD)OLD[k].forEach(([hj,st,wx])=>curated[k+'|'+hj]=[st,wx]);

// csv 파싱
const lines=fs.readFileSync(__dirname+'/../hanja.csv','utf8').split('\n').slice(1);
const HANJA={};
let added=0,skip=0;
for(const ln of lines){
  if(!ln.trim())continue;
  // CSV: main_sound,level,hanja,meaning,radical,strokes,total_strokes  (meaning은 쉼표 포함 → 정규식)
  const m=ln.match(/^([^,]+),([^,]*),([^,]+),(.*),([^,]+),([^,]+),([^,]+)\s*$/);
  if(!m)continue;
  const sound=m[1].trim(), hanja=m[3].trim(), radical=m[5].trim(), total=parseInt(m[7],10);
  if(!sound||!hanja||!total)continue;
  let wx=RAD_WX[radical];
  // 기존 curated 우선
  const ck=curated[sound+'|'+hanja];
  let strokes=total;
  if(ck){strokes=ck[0];wx=ck[1];}
  if(!VALID.includes(wx)){skip++;continue;} // 오행 추정 불가 → 제외
  (HANJA[sound]=HANJA[sound]||[]).push([hanja,strokes,wx]);
  added++;
}
// 기존 시드 중 csv에 없던 것 보강
for(const k in OLD)OLD[k].forEach(([hj,st,wx])=>{
  const ex=(HANJA[k]||[]).some(r=>r[0]===hj);
  if(!ex)(HANJA[k]=HANJA[k]||[]).push([hj,st,wx]);
});
// 음절별 중복 한자 제거
for(const k in HANJA){const seen=new Set();HANJA[k]=HANJA[k].filter(r=>seen.has(r[0])?false:(seen.add(r[0]),true));}

let tot=0;for(const k in HANJA)tot+=HANJA[k].length;
console.error('음절키:',Object.keys(HANJA).length,'한자:',tot,'오행추정불가제외:',skip);

// data/hanja.js 재작성 (SURNAME 보존)
function dumpObj(o){return Object.keys(o).map(k=>'  '+JSON.stringify(k)+': '+JSON.stringify(o[k])).join(',\n');}
const out=`/* hanja.js — 한자 사전 시드 (자동확장: 한국어문회 한자 + 부수기반 자원오행 추정)
 * 형식: 한글음 → [ [한자, 성명학획수, 자원오행], ... ]
 * ※ 자원오행 일부는 부수 기반 추정값(참고용). 기존 검수 항목은 유지.
 */
const SURNAME = {
${dumpObj(SURNAME)}
};
const HANJA = {
${dumpObj(HANJA)}
};
window.HanjaDB = { SURNAME, HANJA };
`;
fs.writeFileSync(__dirname+'/../data/hanja.js',out);
console.error('data/hanja.js 재작성 완료');
