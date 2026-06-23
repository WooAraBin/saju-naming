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
  const { year, month, day, hour, minute = 0, lon = 127.0, applyLocalTime = true, gender = 'M' } = opt;

  // 1) 지방시 보정 — 입력 시각에서 보정 분을 가감
  let adj = new Date(year, month - 1, day, hour, minute, 0);
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
  const ec = solar.getLunar().getEightChar();

  const pillars = {
    year: ec.getYear(),   // "庚午" 형태
    month: ec.getMonth(),
    day: ec.getDay(),
    time: ec.getTime(),
  };

  const dayGan = pillars.day[0];       // 일간(日干) = 본인
  const dayWx = GAN_WX[dayGan];        // 일간 오행

  // 3) 오행 분포 (천간4 + 지지4 = 8글자). 월지(월령)는 가중치 +1.
  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const add = (o, w = 1) => { if (o) count[o] += w; };
  ['year', 'month', 'day', 'time'].forEach((p) => {
    add(GAN_WX[pillars[p][0]]);
    add(ZHI_WX[pillars[p][1]]);
  });
  add(ZHI_WX[pillars.month[1]], 1); // 월령 가중

  // 4) 간이 억부 — 일간 강약 판정
  const same = dayWx;
  const inseong = generatedBy(dayWx); // 나를 생함
  const support = count[same] + count[inseong]; // 비겁 + 인성
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  const isStrong = support >= total / 2;

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
  ['year', 'month', 'day', 'time'].forEach((p) => {
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

  return {
    sip, daewoon, daewoonList, sewoon, gender: gInt ? 'M' : 'F',
    pillars, dayGan, dayWx, count, total,
    isStrong, yongsin, lacking, target, reason,
    offsetMin,
    solarStr: `${adj.getFullYear()}-${String(adj.getMonth() + 1).padStart(2, '0')}-${String(adj.getDate()).padStart(2, '0')} ${String(adj.getHours()).padStart(2, '0')}:${String(adj.getMinutes()).padStart(2, '0')}`,
  };
}

window.Saju = { computeSaju, sipsin, GAN_WX, ZHI_WX, SAENG, GEUK, WX_KO, SIPSIN_GROUP, localTimeOffsetMin };
