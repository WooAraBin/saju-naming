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
  const { year, month, day, hour, minute = 0, lon = 127.0, applyLocalTime = true } = opt;

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

  return {
    pillars, dayGan, dayWx, count, total,
    isStrong, yongsin, lacking, target, reason,
    offsetMin,
    solarStr: `${adj.getFullYear()}-${String(adj.getMonth() + 1).padStart(2, '0')}-${String(adj.getDate()).padStart(2, '0')} ${String(adj.getHours()).padStart(2, '0')}:${String(adj.getMinutes()).padStart(2, '0')}`,
  };
}

window.Saju = { computeSaju, GAN_WX, ZHI_WX, SAENG, GEUK, WX_KO, localTimeOffsetMin };
