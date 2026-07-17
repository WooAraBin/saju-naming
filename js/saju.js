/* =========================================================================
 * saju.js — 사주(만세력) 계산 + 오행 분포 + 간이 억부 용신
 *
 * 만세력 변환은 검증된 라이브러리 lunar-javascript(6tail)를 사용합니다.
 * (index.html에서 CDN으로 Solar/Lunar 전역 객체를 로드)
 *
 * 보정:
 *  - 지방시(진태양시) 보정: 한국 표준시(동경135°) ↔ 실제 출생지 경도 차이를
 *    분 단위로 보정합니다. 자시(23~01시) 부근 출생자의 일주/시주에 영향.
 *    보정량(분) = (135 - 경도) * 4
 * ========================================================================= */

const WX = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' };
const WX_KO = ['목', '화', '토', '금', '수'];

// 천간(天干) → 오행
const GAN_WX = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
};
// 지지(地支) → 오행
const ZHI_WX = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
};

// 상생: A生B (A가 B를 낳음)   목→화→토→금→수→목
const SAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
// 상극: A剋B (A가 B를 이김)   목→토→수→화→금→목
const GEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

// 나를 생하는 오행(인성)
function generatedBy(o) { return Object.keys(SAENG).find((k) => SAENG[k] === o); }
// 나를 극하는 오행(관성)
function controlledBy(o) { return Object.keys(GEUK).find((k) => GEUK[k] === o); }

// 천간 음양 (1=양, 0=음)
const YINYANG = { 甲:1, 乙:0, 丙:1, 丁:0, 戊:1, 己:0, 庚:1, 辛:0, 壬:1, 癸:0 };
// 지지 본기(本氣) 천간 — 십신 계산용
const ZHI_HIDDEN = { 子:'癸', 丑:'己', 寅:'甲', 卯:'乙', 辰:'戊', 巳:'丙', 午:'丁', 未:'己', 申:'庚', 酉:'辛', 戌:'戊', 亥:'壬' };

// 지지 지장간(支藏干) — 여기(餘氣)→중기(中氣)→정기(正氣) 표준 순서 (정기=마지막=본기)
const ZHI_HIDDEN_FULL = {
  子:['壬','癸'], 丑:['癸','辛','己'], 寅:['戊','丙','甲'], 卯:['甲','乙'],
  辰:['乙','癸','戊'], 巳:['戊','庚','丙'], 午:['丙','己','丁'], 未:['丁','乙','己'],
  申:['戊','壬','庚'], 酉:['庚','辛'], 戌:['辛','丁','戊'], 亥:['戊','甲','壬'],
};

// 천간 합/충
const GAN_HAP = { 甲:['己','土'],己:['甲','土'],乙:['庚','金'],庚:['乙','金'],丙:['辛','水'],辛:['丙','水'],丁:['壬','木'],壬:['丁','木'],戊:['癸','火'],癸:['戊','火'] };
const GAN_CHUNG = { 甲:'庚',庚:'甲',乙:'辛',辛:'乙',丙:'壬',壬:'丙',丁:'癸',癸:'丁' };
const _PN = ['연','월','일','시'];
function cheonganRel(gans) {
  const hap = [], chung = [];
  for (let i = 0; i < gans.length; i++) for (let j = i + 1; j < gans.length; j++) {
    const a = gans[i], b = gans[j];
    if (GAN_HAP[a] && GAN_HAP[a][0] === b) hap.push(`${a}${b}합(合, 化${GAN_HAP[a][1]}는 월령 조건부, ${_PN[i]}·${_PN[j]})`);
    if (GAN_CHUNG[a] === b) chung.push(`${a}${b}충(${_PN[i]}·${_PN[j]})`);
  }
  return { hap, chung };
}

// 지지 합/충/형/파/해
// 지지 육합. 午未는 화기(化氣) 없음(무화) — 합만 되고 오행 변화 없음(정설).
const YUKHAP = { 子丑:'土',丑子:'土',寅亥:'木',亥寅:'木',卯戌:'火',戌卯:'火',辰酉:'金',酉辰:'金',巳申:'水',申巳:'水',午未:'無',未午:'無' };
const SAMHAP = [['申','子','辰','水'],['寅','午','戌','火'],['巳','酉','丑','金'],['亥','卯','未','木']];
const BANGHAP = [['寅','卯','辰','木'],['巳','午','未','火'],['申','酉','戌','金'],['亥','子','丑','水']];
const CHUNG6 = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
const HAE6 = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
const PA6 = [['子','酉'],['午','卯'],['巳','申'],['寅','亥'],['辰','丑'],['戌','未']];
function jijiRel(zhis) {
  const o = { yukhap:[], samhap:[], banhap:[], banghap:[], chung:[], hyeong:[], pa:[], hae:[] };
  const pos = {}; zhis.forEach((z, i) => { (pos[z] = pos[z] || []).push(i); });
  const has = (z) => !!pos[z];
  const pair = (list, a, b) => list.some((c) => (c[0]===a&&c[1]===b)||(c[1]===a&&c[0]===b));
  for (let i = 0; i < zhis.length; i++) for (let j = i + 1; j < zhis.length; j++) {
    const a = zhis[i], b = zhis[j], near = (Math.abs(i-j)===1) ? '인접' : '원격';
    if (YUKHAP[a+b]) { const w = YUKHAP[a+b]; o.yukhap.push(`${a}${b}육합(${w === '無' ? '化氣 없음(무화)' : '化' + w}, ${_PN[i]}·${_PN[j]}, ${near})`); }
    if (pair(CHUNG6,a,b)) o.chung.push(`${a}${b}충(${_PN[i]}·${_PN[j]}, ${near})`);
    if (pair(HAE6,a,b)) o.hae.push(`${a}${b}해(${_PN[i]}·${_PN[j]})`);
    if (pair(PA6,a,b)) o.pa.push(`${a}${b}파(${_PN[i]}·${_PN[j]})`);
  }
  ['辰','午','酉','亥'].forEach((z) => { if ((pos[z]||[]).length >= 2) o.hyeong.push(`${z}${z}자형`); });
  if (has('寅')&&has('巳')&&has('申')) o.hyeong.push('寅巳申 삼형');
  else { if (has('寅')&&has('巳')) o.hyeong.push('寅巳 형'); if (has('巳')&&has('申')) o.hyeong.push('巳申 형'); }
  if (has('丑')&&has('戌')&&has('未')) o.hyeong.push('丑戌未 삼형');
  else { if (has('丑')&&has('戌')) o.hyeong.push('丑戌 형'); if (has('戌')&&has('未')) o.hyeong.push('戌未 형'); }
  if (has('子')&&has('卯')) o.hyeong.push('子卯 상형');
  SAMHAP.forEach(([a,b,c,wx]) => { const n=[a,b,c].filter(has); if (n.length===3) o.samhap.push(`${a}${b}${c} 삼합(${wx}局)`); else if (n.length===2 && n.includes(b)) o.banhap.push(`${n.join('')} 반합(${wx})`); });
  BANGHAP.forEach(([a,b,c,wx]) => { if ([a,b,c].every(has)) o.banghap.push(`${a}${b}${c} 방합(${wx}局)`); });
  return o;
}

// 신살(神殺) — 핵심
const CHEONEUL = { 甲:'丑未',戊:'丑未',庚:'丑未',乙:'子申',己:'子申',丙:'亥酉',丁:'亥酉',壬:'卯巳',癸:'卯巳',辛:'寅午' };
const DOHWA = { 申:'酉',子:'酉',辰:'酉',寅:'卯',午:'卯',戌:'卯',巳:'午',酉:'午',丑:'午',亥:'子',卯:'子',未:'子' };
const YEOKMA = { 申:'寅',子:'寅',辰:'寅',寅:'申',午:'申',戌:'申',巳:'亥',酉:'亥',丑:'亥',亥:'巳',卯:'巳',未:'巳' };
const HWAGAE = { 申:'辰',子:'辰',辰:'辰',寅:'戌',午:'戌',戌:'戌',巳:'丑',酉:'丑',丑:'丑',亥:'未',卯:'未',未:'未' };
const YANGIN = { 甲:'卯',丙:'午',戊:'午',庚:'酉',壬:'子' };
const MUNCHANG = { 甲:'巳',乙:'午',丙:'申',戊:'申',丁:'酉',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯' };
const GWAEGANG = ['庚辰','庚戌','壬辰','戊戌'];
const BAEKHO = ['甲辰','乙未','丙戌','丁丑','戊辰','壬戌','癸丑'];
function sinsalList(dayGan, zhis, pillarGZ, yearZhi) {
  const r = [], has = (z) => zhis.includes(z);
  [...(CHEONEUL[dayGan]||'')].forEach((z) => { if (has(z)) r.push('천을귀인('+z+')'); });
  [['도화살',DOHWA],['역마살',YEOKMA],['화개살',HWAGAE]].forEach(([nm,tbl]) => { const t = tbl[yearZhi]; if (t && has(t)) r.push(nm+'('+t+')'); });
  if (YANGIN[dayGan] && has(YANGIN[dayGan])) r.push('양인('+YANGIN[dayGan]+')');
  if (MUNCHANG[dayGan] && has(MUNCHANG[dayGan])) r.push('문창귀인('+MUNCHANG[dayGan]+')');
  pillarGZ.forEach((gz, i) => { if (GWAEGANG.includes(gz)) r.push('괴강('+_PN[i]+'주)'); if (BAEKHO.includes(gz)) r.push('백호('+_PN[i]+'주)'); });
  return [...new Set(r)];
}

// 조후(調候) — 월지 계절 한난 + 조후용신(火/水) 힌트. 억부용신과 별개.
const SEASON = { 寅:'초봄', 卯:'봄', 辰:'늦봄', 巳:'초여름', 午:'여름', 未:'늦여름', 申:'초가을', 酉:'가을', 戌:'늦가을', 亥:'초겨울', 子:'겨울', 丑:'늦겨울' };
function computeJohu(dayGan, monthZhi, allZhis) {
  const season = SEASON[monthZhi] || '';
  const cold = ['亥', '子', '丑', '寅'].includes(monthZhi); // 한랭
  const hot = ['巳', '午', '未', '申'].includes(monthZhi);  // 염열
  const hiddenFire = allZhis.some((z) => (ZHI_HIDDEN_FULL[z] || []).some((g) => GAN_WX[g] === '화'));
  const hiddenWater = allZhis.some((z) => (ZHI_HIDDEN_FULL[z] || []).some((g) => GAN_WX[g] === '수'));
  let need = null, note = '';
  if (cold) { need = '화'; note = `${season} 한랭 — 온기(火)가 조후용신. ` + (hiddenFire ? '지장간에 火 있어 온기 공급(다만 火가 관살·습토를 데우면 일간 자윤 손실 주의).' : '火 미약하면 냉습으로 정체.'); }
  else if (hot) { need = '수'; note = `${season} 염열 — 자윤(水)이 조후용신. ` + (hiddenWater ? '지장간 水로 열기 완화.' : '水 부족하면 조열·건조.'); }
  else { note = `${season} 온난 환절 — 조후 급하지 않음(억부 우선).`; }
  return { season, 한난: cold ? '寒' : hot ? '熱' : '平', need, hiddenFire, hiddenWater, note };
}

// 십신(十神): 일간 기준 대상 천간의 관계
function sipsin(dayGan, gan) {
  if (!gan || !GAN_WX[gan]) return '';
  const dWx = GAN_WX[dayGan], gWx = GAN_WX[gan];
  const same = (YINYANG[dayGan] === YINYANG[gan]); // 같은 음양
  if (gWx === dWx) return same ? '비견' : '겁재';        // 동기 = 비겁
  if (SAENG[dWx] === gWx) return same ? '식신' : '상관';  // 내가 생 = 식상
  if (GEUK[dWx] === gWx) return same ? '편재' : '정재';   // 내가 극 = 재성
  if (GEUK[gWx] === dWx) return same ? '편관' : '정관';   // 나를 극 = 관성
  if (SAENG[gWx] === dWx) return same ? '편인' : '정인';  // 나를 생 = 인성
  return '';
}
const SIPSIN_GROUP = {
  비견:'비겁', 겁재:'비겁', 식신:'식상', 상관:'식상',
  편재:'재성', 정재:'재성', 편관:'관성', 정관:'관성', 편인:'인성', 정인:'인성',
};
// 띠(생년 지지) / 십이운성 — lunar의 중국어 표기 → 한글
const TTI = { 鼠:'쥐', 牛:'소', 虎:'호랑이', 兔:'토끼', 龙:'용', 蛇:'뱀', 马:'말', 羊:'양', 猴:'원숭이', 鸡:'닭', 狗:'개', 猪:'돼지' };
const UNSEONG = { 长生:'장생', 沐浴:'목욕', 冠带:'관대', 临官:'건록', 帝旺:'제왕', 衰:'쇠', 病:'병', 死:'사', 墓:'묘', 绝:'절', 胎:'태', 养:'양' };

/**
 * 지방시 보정량(분) 계산. 동경 135° 기준.
 * @param {number} lon 출생지 경도 (기본 서울 127.0)
 */
function localTimeOffsetMin(lon) {
  return Math.round((135 - lon) * 4);
}

/**
 * 사주 계산
 * @param {object} opt {year, month, day, hour, minute, lon, applyLocalTime}
 * @returns {object} 사주 결과
 */
function computeSaju(opt) {
  const { year, month, day, hour, minute = 0, lon = 127.0, applyLocalTime = true, gender = 'M', timeUnknown = false, isLunar = false, isLeap = false } = opt;
  // 0) 음력 입력이면 양력으로 변환 (윤달 = 음수 월)
  let sy = year, sm = month, sd = day;
  if (isLunar) {
    try { const so = Lunar.fromYmd(year, isLeap ? -month : month, day).getSolar(); sy = so.getYear(); sm = so.getMonth(); sd = so.getDay(); } catch (e) {}
  }
  // 출생시각 모름: 정오(午, 12:00)로 팔자 계산하되 시주는 분석에서 제외(아래 parts). 정오는 자시 일자경계를 넘지 않아 일주가 안전.
  const hourEff = timeUnknown ? 12 : hour;
  const minuteEff = timeUnknown ? 0 : minute;

  // 1) 지방시 보정 — 입력 시각에서 보정 분을 가감
  let adj = new Date(sy, sm - 1, sd, hourEff, minuteEff, 0);
  let offsetMin = 0;
  if (applyLocalTime) {
    offsetMin = localTimeOffsetMin(lon); // 양수면 표준시가 빠름 → 빼줌
    adj = new Date(adj.getTime() - offsetMin * 60000);
  }

  // 2) lunar-javascript로 팔자 계산
  const solar = Solar.fromYmdHms(
    adj.getFullYear(), adj.getMonth() + 1, adj.getDate(),
    adj.getHours(), adj.getMinutes(), 0
  );
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const pillars = {
    year: ec.getYear(),   // "庚午" 형태
    month: ec.getMonth(),
    day: ec.getDay(),
    time: ec.getTime(),
  };
  // 시간 모름이면 시주를 모든 집계(오행·십신·상세)에서 제외
  const parts = timeUnknown ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'time'];

  const dayGan = pillars.day[0];       // 일간(日干) = 본인
  const dayWx = GAN_WX[dayGan];        // 일간 오행

  // 3) 오행 분포 — 표시용은 raw(천간+지지). 월령 가중은 강약 판정에만 별도 적용. (시간 모름이면 시주 제외)
  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const add = (o) => { if (o) count[o] += 1; };
  parts.forEach((p) => {
    add(GAN_WX[pillars[p][0]]);
    add(ZHI_WX[pillars[p][1]]);
  });
  const total = Object.values(count).reduce((a, b) => a + b, 0); // = 8

  // 4) 간이 억부 — 일간 강약 판정 (월령 가중 +1 적용한 별도 집계 사용)
  const wcount = Object.assign({}, count);
  if (ZHI_WX[pillars.month[1]]) wcount[ZHI_WX[pillars.month[1]]] += 1;
  const same = dayWx;
  const inseong = generatedBy(dayWx); // 나를 생함
  const support = wcount[same] + wcount[inseong]; // 비겁 + 인성 (월령 가중 포함)
  const wtotal = Object.values(wcount).reduce((a, b) => a + b, 0);
  const isStrong = support >= wtotal / 2;

  // 5) 용신(보충 권장 오행) 결정
  let yongsin = [];
  let reason = '';
  if (isStrong) {
    // 신강 → 빼주거나 눌러주는 오행: 식상(내가 생) / 관성(나를 극) / 재성(내가 극)
    const sikSang = SAENG[dayWx];     // 내가 생하는 오행(설기)
    const gwanSeong = controlledBy(dayWx); // 나를 극하는 오행
    yongsin = [gwanSeong, sikSang];
    reason = `일간(${dayWx})이 강합니다(신강). 기운을 눌러주는 관성(${gwanSeong})·설기하는 식상(${sikSang}) 오행이 용신입니다.`;
  } else {
    // 신약 → 보태주는 오행: 인성(나를 생) / 비겁(같은 오행)
    yongsin = [inseong, same];
    reason = `일간(${dayWx})이 약합니다(신약). 도와주는 인성(${inseong})·비겁(${same}) 오행이 용신입니다.`;
  }

  // 6) 부족 오행 (개수 1 이하)
  const lacking = WX_KO.filter((o) => count[o] <= 1);

  // 7) 최종 보충 타깃: 용신 우선, 부족오행 보조
  const target = [...new Set([...yongsin, ...lacking])];

  // 8) 십신(十神) — 각 기둥 천간 + 지지 본기
  const sip = { pillars: {}, groupCount: { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 } };
  parts.forEach((p) => {
    const g = (p === 'day') ? '일간' : sipsin(dayGan, pillars[p][0]);
    const z = sipsin(dayGan, ZHI_HIDDEN[pillars[p][1]]);
    sip.pillars[p] = { gan: g, zhi: z };
    if (p !== 'day' && SIPSIN_GROUP[g]) sip.groupCount[SIPSIN_GROUP[g]]++;
    if (SIPSIN_GROUP[z]) sip.groupCount[SIPSIN_GROUP[z]]++;
  });

  // 9) 대운(大運) — lunar-javascript 사용
  const gInt = (gender === 'F' || gender === 0 || gender === '여') ? 0 : 1;
  let daewoon = null, daewoonList = [];
  try {
    const list = ec.getYun(gInt).getDaYun();
    const ageNow = new Date().getFullYear() - year; // 근사(세는 나이 아님)
    daewoonList = (list || []).map((d) => ({ startAge: d.getStartAge(), ganzhi: d.getGanZhi() }))
      .filter((d) => d.ganzhi && d.ganzhi.length === 2);
    for (let i = 0; i < daewoonList.length; i++) {
      const cur = daewoonList[i], nxt = daewoonList[i + 1];
      if (ageNow >= cur.startAge && (!nxt || ageNow < nxt.startAge)) { daewoon = cur; break; }
    }
    if (!daewoon && daewoonList.length) daewoon = daewoonList[0];
    daewoonList.forEach((d) => {
      d.gan = d.ganzhi[0]; d.zhi = d.ganzhi[1];
      d.sipsin = sipsin(dayGan, d.gan); d.wx = { gan: GAN_WX[d.gan], zhi: ZHI_WX[d.zhi] };
    });
  } catch (e) {}

  // 10) 세운(歲運) — 올해 간지
  let sewoon = null;
  try {
    const yNow = new Date().getFullYear();
    const gz = Solar.fromYmd(yNow, 6, 1).getLunar().getYearInGanZhi();
    sewoon = { year: yNow, ganzhi: gz, gan: gz[0], zhi: gz[1], sipsin: sipsin(dayGan, gz[0]), wx: { gan: GAN_WX[gz[0]], zhi: ZHI_WX[gz[1]] } };
  } catch (e) {}

  // 11) 상세(만세력): 지장간·납음·십이운성·공망 + 띠
  const detail = {};
  let tti = '';
  try {
    const PMAP = { year: 'Year', month: 'Month', day: 'Day', time: 'Time' };
    parts.forEach((p) => {
      const P = PMAP[p];
      const ds = ec['get' + P + 'DiShi'] ? ec['get' + P + 'DiShi']() : '';
      detail[p] = {
        hideGan: ZHI_HIDDEN_FULL[pillars[p][1]] ? ZHI_HIDDEN_FULL[pillars[p][1]].join('') : '',
        nayin: ec['get' + P + 'NaYin'] ? ec['get' + P + 'NaYin']() : '',
        unseong: UNSEONG[ds] || ds,
        gongmang: ec['get' + P + 'XunKong'] ? ec['get' + P + 'XunKong']() : '',
      };
    });
    const sx = lunar.getYearShengXiao();
    tti = TTI[sx] || sx;
  } catch (e) {}

  // 12) 천간 합충 · 지지 합충형 · 신살 (시간 모름이면 시주 제외)
  const _gz = parts.map((k) => pillars[k]);
  const _gans = _gz.map((x) => x[0]);
  const _zhis = _gz.map((x) => x[1]);
  const ganRel = cheonganRel(_gans);
  const jiRel = jijiRel(_zhis);
  const sinsal = sinsalList(dayGan, _zhis, _gz, pillars.year[1]);
  const johu = computeJohu(dayGan, pillars.month[1], _zhis);

  if (timeUnknown) pillars.time = null; // 시주 미상 표기

  return {
    sip, daewoon, daewoonList, sewoon, birthYear: year, gender: gInt ? 'M' : 'F',
    detail, tti, timeUnknown, ganRel, jiRel, sinsal, johu,
    pillars, dayGan, dayWx, count, total,
    isStrong, yongsin, lacking, target, reason,
    offsetMin,
    solarStr: `${adj.getFullYear()}-${String(adj.getMonth() + 1).padStart(2, '0')}-${String(adj.getDate()).padStart(2, '0')} ${String(adj.getHours()).padStart(2, '0')}:${String(adj.getMinutes()).padStart(2, '0')}`,
  };
}

/* =========================================================================
 * 세운(신년운세) · 일진(오늘의 운세) · 삼재 · 태세충
 * ========================================================================= */
// 삼재(三災) — 띠(연지) 삼합국별 삼재 3년 지지. 들→눌→날 순.
const SAMJAE_TRIPLE = {
  申:['寅','卯','辰'], 子:['寅','卯','辰'], 辰:['寅','卯','辰'],
  寅:['申','酉','戌'], 午:['申','酉','戌'], 戌:['申','酉','戌'],
  巳:['亥','子','丑'], 酉:['亥','子','丑'], 丑:['亥','子','丑'],
  亥:['巳','午','未'], 卯:['巳','午','未'], 未:['巳','午','未'],
};
const SAMJAE_PHASE = ['들삼재', '눌삼재', '날삼재'];
function isChung6(a, b) { return CHUNG6.some((c) => (c[0] === a && c[1] === b) || (c[1] === a && c[0] === b)); }

// 특정 연도 세운(歲運) — 그 해 간지 + 일간 대비 십신·오행 + 태세충·삼재·연신살·용신부합
function sewoonForYear(saju, year) {
  const gz = Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhi(); // 6/1 = 입춘 이후, 그 해 간지
  const gan = gz[0], zhi = gz[1];
  const yearZhi = saju.pillars.year[1], dayZhi = saju.pillars.day[1];
  const tri = SAMJAE_TRIPLE[yearZhi] || [];
  const sjIdx = tri.indexOf(zhi);
  const yong = saju.yongsin || [];
  // 복음(伏吟) — 세운 지지가 원국 지지와 같은 글자로 겹침
  const _pk = saju.timeUnknown ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'time'];
  const _kn = { year: '연지', month: '월지', day: '일지', time: '시지' };
  const bokeumParts = _pk.filter((k) => saju.pillars[k] && saju.pillars[k][1] === zhi).map((k) => _kn[k]);
  const bokeum = bokeumParts.length ? bokeumParts.join('·') + ' 복음(伏吟)' : null;
  const yanginBokeum = (YANGIN[saju.dayGan] === zhi) && bokeumParts.length > 0; // 양인이 세운서 겹침
  // 해당 연도에 유효한 대운. 대운표는 출생 시 확정이라 미래 연도도 오늘 알 수 있음.
  // (기존엔 '오늘 기준 현재 대운'을 썼는데, 그러면 미래 신년운세가 계산 시점에 따라 달라짐)
  let dwYear = null;
  const dl = saju.daewoonList || [];
  if (saju.birthYear && dl.length) {
    const ageInYear = year - saju.birthYear; // computeSaju의 ageNow와 동일 근사(연도차)
    for (let i = 0; i < dl.length; i++) {
      const cur = dl[i], nxt = dl[i + 1];
      if (ageInYear >= cur.startAge && (!nxt || ageInYear < nxt.startAge)) { dwYear = cur; break; }
    }
    if (!dwYear) dwYear = ageInYear < dl[0].startAge ? dl[0] : dl[dl.length - 1];
  }
  return {
    year, ganzhi: gz, gan, zhi, daewoon: dwYear,
    sipsin: sipsin(saju.dayGan, gan),
    wx: { gan: GAN_WX[gan], zhi: ZHI_WX[zhi] },
    bokeum, yanginBokeum,
    chungIl: isChung6(zhi, dayZhi),      // 태세충 = 세운지가 일지(본인)를 충
    chungYear: isChung6(zhi, yearZhi),   // 세운지가 연지를 충
    ganHap: (GAN_HAP[saju.dayGan] && GAN_HAP[saju.dayGan][0] === gan) ? GAN_HAP[saju.dayGan][1] : null,
    ganChung: GAN_CHUNG[saju.dayGan] === gan,
    samjae: sjIdx >= 0 ? SAMJAE_PHASE[sjIdx] : null,
    dohwaYear: DOHWA[yearZhi] === zhi || DOHWA[dayZhi] === zhi,
    yeokmaYear: YEOKMA[yearZhi] === zhi || YEOKMA[dayZhi] === zhi,
    hwagaeYear: HWAGAE[yearZhi] === zhi || HWAGAE[dayZhi] === zhi,
    isYongsin: yong.includes(GAN_WX[gan]) || yong.includes(ZHI_WX[zhi]),
  };
}

// 특정 날짜 일진(日辰) — 그날 간지 + 일간 대비 십신·오행 + 일지충/천간합
function iljinForDate(saju, date) {
  const l = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar();
  const gz = l.getDayInGanZhi();
  const gan = gz[0], zhi = gz[1], dayZhi = saju.pillars.day[1];
  const yong = saju.yongsin || [];
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    ganzhi: gz, gan, zhi,
    sipsin: sipsin(saju.dayGan, gan),
    zhiSipsin: sipsin(saju.dayGan, ZHI_HIDDEN[zhi]),
    wx: { gan: GAN_WX[gan], zhi: ZHI_WX[zhi] },
    chungIl: isChung6(zhi, dayZhi),
    hapIl: (GAN_HAP[saju.dayGan] && GAN_HAP[saju.dayGan][0] === gan) ? GAN_HAP[saju.dayGan][1] : null,
    dohwa: DOHWA[dayZhi] === zhi,
    yeokma: YEOKMA[dayZhi] === zhi,
    isYongsin: yong.includes(GAN_WX[gan]) || yong.includes(ZHI_WX[zhi]),
  };
}

/* =========================================================================
 * 부부 궁합(宮合)
 * ========================================================================= */
const WONJIN = [['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌']];
function _pairEq(list, a, b) { return list.some((c) => (c[0] === a && c[1] === b) || (c[1] === a && c[0] === b)); }
function _zhiPairRel(a, b) {
  if (a === b) return { t: '동일' };
  if (YUKHAP[a + b]) return { t: '육합', wx: YUKHAP[a + b] };
  for (const [x, y, z, wx] of SAMHAP) { const s = [x, y, z]; if (s.includes(a) && s.includes(b)) return { t: '삼합', wx }; }
  if (_pairEq(CHUNG6, a, b)) return { t: '충' };
  if (_pairEq(WONJIN, a, b)) return { t: '원진' };
  if (_pairEq(HAE6, a, b)) return { t: '해' };
  if (_pairEq(PA6, a, b)) return { t: '파' };
  return { t: '무관' };
}
const _clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));

// 두 사람 사주로 궁합 계산 (A=본인, B=상대)
function compatibility(A, B) {
  const gA = A.dayGan, gB = B.dayGan, wxA = GAN_WX[gA], wxB = GAN_WX[gB];
  const yA = A.pillars.year[1], yB = B.pillars.year[1];   // 연지 = 띠
  const dzA = A.pillars.day[1], dzB = B.pillars.day[1];    // 일지 = 배우자궁
  const ganHap = (GAN_HAP[gA] && GAN_HAP[gA][0] === gB) ? GAN_HAP[gA][1] : null;
  const ganChung = GAN_CHUNG[gA] === gB;
  let ganRel;
  if (ganHap) ganRel = '천간합';
  else if (ganChung) ganRel = '천간충';
  else if (wxA === wxB) ganRel = '비화';
  else if (SAENG[wxA] === wxB || SAENG[wxB] === wxA) ganRel = '상생';
  else ganRel = '상극';
  const sipAtoB = sipsin(gA, gB); // 상대(B)가 나(A)에게 무슨 십신인지
  const sipBtoA = sipsin(gB, gA);
  const ttiRel = _zhiPairRel(yA, yB);
  const iljiRel = _zhiPairRel(dzA, dzB);
  // 오행 보완: 상대가 내 용신 기운을 넉넉히 가졌나
  const aHelpsB = (B.yongsin || []).some((o) => A.count[o] >= 2);
  const bHelpsA = (A.yongsin || []).some((o) => B.count[o] >= 2);

  const ganScore = { 천간합: 95, 상생: 82, 비화: 68, 상극: 48, 천간충: 36 }[ganRel];
  const zsc = (r) => ({ 육합: 92, 삼합: 88, 동일: 70, 무관: 60, 파: 52, 해: 50, 충: 40, 원진: 34 }[r.t] || 60);
  const ttiScore = zsc(ttiRel), iljiScore = zsc(iljiRel);
  const bosanScore = 50 + (aHelpsB ? 25 : 0) + (bHelpsA ? 25 : 0);
  const goodSip = new Set(['정재', '정관', '정인', '식신', '편재']);
  let sipScore = 55 + (goodSip.has(sipAtoB) ? 16 : 0) + (goodSip.has(sipBtoA) ? 16 : 0)
    - ((sipAtoB === '겁재' || sipBtoA === '겁재') ? 14 : 0) - ((sipAtoB === '편관' && sipBtoA === '편관') ? 8 : 0);
  sipScore = _clamp(sipScore);
  const total = _clamp(ganScore * 0.28 + iljiScore * 0.28 + ttiScore * 0.16 + bosanScore * 0.16 + sipScore * 0.12);
  return {
    gA, gB, wxA, wxB, ganRel, ganHap, ganChung, sipAtoB, sipBtoA, ttiRel, iljiRel,
    aHelpsB, bHelpsA, ttiA: A.tti, ttiB: B.tti,
    axes: { 천간궁합: ganScore, 부부궁: iljiScore, 띠궁합: ttiScore, 오행보완: bosanScore, 십신궁합: sipScore },
    total,
  };
}

/* =========================================================================
 * 이사 택일 — 길방위/흉방위(삼살·대장군) + 손 없는 날
 * ========================================================================= */
const WX_DIR = { 목: '동쪽', 화: '남쪽', 토: '중앙', 금: '서쪽', 수: '북쪽' };
// 그 해 지지 → 삼살방(三殺方, 피함)
const SAMSAL_DIR = {
  申: '남쪽', 子: '남쪽', 辰: '남쪽', 寅: '북쪽', 午: '북쪽', 戌: '북쪽',
  巳: '동쪽', 酉: '동쪽', 丑: '동쪽', 亥: '서쪽', 卯: '서쪽', 未: '서쪽',
};
// 그 해 지지 → 대장군방(大將軍方, 피함) — 3년 주기
const DAEJANGGUN_DIR = {
  亥: '서쪽', 子: '서쪽', 丑: '서쪽', 寅: '북쪽', 卯: '북쪽', 辰: '북쪽',
  巳: '동쪽', 午: '동쪽', 未: '동쪽', 申: '남쪽', 酉: '남쪽', 戌: '남쪽',
};
const _WD = ['일', '월', '화', '수', '목', '금', '토'];
// 이사 안내 (본인 사주 + 대상 연도)
function movingGuide(saju, year) {
  const yz = Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhi()[1];
  const yong = saju.yongsin || [];
  const goodDirs = [...new Set(yong.map((o) => WX_DIR[o]).filter((d) => d && d !== '중앙'))];
  const samsal = SAMSAL_DIR[yz], daejang = DAEJANGGUN_DIR[yz];
  const badDirs = [{ name: samsal, reason: '삼살방(三殺方)' }];
  if (daejang !== samsal) badDirs.push({ name: daejang, reason: '대장군방(大將軍方)' });
  // 손 없는 날: 오늘 이후 그 해 안, 음력 일 끝자리 9·0 (9·10·19·20·29·30)
  const sonNo = [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const from = start.getFullYear() > year ? new Date(year, 0, 1) : (start.getFullYear() < year ? new Date(year, 0, 1) : start);
  const end = new Date(year, 11, 31);
  for (let d = new Date(from); d <= end && sonNo.length < 8; d.setDate(d.getDate() + 1)) {
    const l = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
    const ld = l.getDay();
    if ([9, 10, 19, 20, 29, 30].includes(ld)) {
      sonNo.push({ solar: `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`, wd: _WD[d.getDay()], lunar: `음 ${l.getMonth()}.${ld}` });
    }
  }
  const badNames = badDirs.map((b) => b.name);
  const netGood = goodDirs.filter((d) => !badNames.includes(d));
  const conflict = goodDirs.filter((d) => badNames.includes(d));
  return { year, yearZhi: yz, goodDirs, netGood, conflict, badDirs, sonNo };
}

/* =========================================================================
 * 오행 수치화 — 원국 오행 분포를 0~100 지수로 (레이더용)
 * ========================================================================= */
// 각 오행: 원국 개수(count) + 월령 가중 반영 강도 지수(idx 0~100)
function ohaengScores(saju) {
  const monthWx = ZHI_WX[saju.pillars.month[1]]; // 월지 오행 = 월령
  const out = {};
  WX_KO.forEach((o) => {
    const c = saju.count[o] || 0;
    // 개수 1당 22점(5개=110→상한100), 월령이면 +14 보너스
    let idx = c * 22 + (o === monthWx ? 14 : 0);
    idx = Math.max(0, Math.min(100, Math.round(idx)));
    out[o] = { count: c, idx };
  });
  return out;
}

window.Saju = { computeSaju, sipsin, sewoonForYear, iljinForDate, compatibility, movingGuide, ohaengScores, GAN_WX, ZHI_WX, SAENG, GEUK, WX_KO, SIPSIN_GROUP, localTimeOffsetMin };
