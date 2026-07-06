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

// 흔히 쓰는 이름 음절 — 추천 자연스러움(점수보다 부를 수 있는 이름 우선)
const COMMON_SYLL = new Set((
  '가 강 건 경 결 겸 계 고 관 광 교 구 권 규 근 금 기 길 나 남 노 누 다 단 담 대 덕 도 동 ' +
  '라 람 래 려 련 령 로 루 류 린 림 마 만 명 모 무 문 미 민 바 백 범 별 보 복 봄 부 빈 ' +
  '사 산 삼 상 새 서 석 선 설 성 세 소 솔 송 수 숙 순 슬 승 시 신 ' +
  '아 안 애 야 양 어 언 여 연 열 영 예 오 온 완 요 용 우 욱 운 원 월 위 유 윤 율 으 은 의 이 인 일 ' +
  '자 잔 재 정 제 조 종 주 준 중 지 진 찬 창 채 천 철 청 초 최 추 춘 충 치 ' +
  '태 택 하 한 함 해 향 헌 혁 현 형 혜 호 홍 화 환 회 효 후 휘 희 빛 늘 ').trim().split(/\s+/)
);
// 흔한 작명 음절인지 (두음법칙 포함) — 자연스러움 결정적 판정용
function isCommonSyll(h) { return COMMON_SYLL.has(h) || COMMON_SYLL.has(duum(h)); }

// 실제 작명에 흔히 쓰는 이름 한자 화이트리스트 — 희귀자(奲·夭·纜 등) 추천 방지용
const COMMON_NAME_HANJA = new Set((
  '佳 嘉 可 家 康 江 强 姜 剛 健 建 乾 慶 京 敬 璟 景 卿 炅 桂 啓 高 寬 觀 光 廣 敎 喬 求 玖 九 權 圭 奎 珪 規 根 槿 瑾 ' +
  '金 錦 琴 基 起 琦 麒 奇 騏 吉 娜 南 楠 魯 盧 路 露 多 茶 丹 端 潭 大 德 度 道 桃 都 燾 韜 東 棟 桐 童 桐 動 ' +
  '羅 蘭 嵐 來 麗 呂 蓮 連 玲 怜 祿 綠 柳 流 琉 麟 璘 潾 林 琳 霖 馬 萬 滿 晩 明 銘 鳴 命 模 慕 武 茂 舞 文 紋 門 ' +
  '美 渼 薇 媄 民 旼 玟 珉 旻 敏 閔 朴 璞 白 百 伯 柏 範 范 凡 寶 普 保 甫 輔 福 馥 復 富 阜 彬 斌 賓 玭 濱 頻 ' +
  '思 史 司 山 珊 三 杉 相 尙 商 祥 庠 翔 常 璽 瑞 書 序 舒 抒 棲 西 緖 徐 敍 碩 錫 石 奭 晳 析 善 宣 璇 瑄 鮮 先 渲 銑 ' +
  '雪 卨 燮 涉 成 性 星 聖 城 誠 晟 盛 珹 世 洗 細 歲 勢 素 韶 沼 紹 昭 邵 笑 蘇 松 宋 頌 淞 ' +
  '秀 洙 守 修 壽 樹 殊 琇 銖 粹 邃 淑 叔 琡 璹 肅 順 純 旬 淳 舜 珣 洵 瑟 璱 承 昇 勝 丞 升 陞 ' +
  '始 詩 時 施 是 蒔 信 新 伸 愼 申 莘 紳 宸 娥 雅 兒 亞 我 安 晏 愛 艾 陽 揚 楊 養 亮 彦 言 余 與 汝 ' +
  '演 妍 然 延 淵 緣 沇 娟 涓 硏 悅 烈 永 榮 英 映 瑛 泳 暎 詠 營 渶 煐 寧 藝 睿 禮 譽 芮 叡 預 ' +
  '五 吾 悟 旿 晤 溫 瑥 完 玩 婉 莞 堯 曜 瑤 耀 龍 容 鎔 庸 溶 用 勇 鏞 瑢 ' +
  '宇 祐 雨 佑 玗 禹 右 優 友 旴 羽 瑀 旭 昱 煜 郁 彧 雲 運 芸 沄 元 源 媛 苑 院 圓 原 瑗 願 沅 嫄 月 越 偉 渭 衛 緯 韋 ' +
  '裕 維 由 柔 兪 有 侑 宥 喩 楡 瑜 潤 允 玧 鈗 胤 尹 贇 律 聿 恩 銀 殷 誾 垠 珢 義 宜 儀 意 毅 懿 ' +
  '利 怡 伊 珥 仁 寅 印 一 日 逸 鎰 溢 任 子 慈 滋 紫 姿 在 才 宰 載 栽 財 裁 梓 縡 齋 ' +
  '正 政 貞 廷 庭 晶 禎 精 鼎 靖 整 定 淨 楨 玎 渟 婷 鄭 珽 偵 旌 帝 制 濟 齊 諸 提 題 際 朝 趙 照 祚 肇 調 ' +
  '周 主 株 珠 柱 朱 宙 注 洲 疇 湊 鍾 宗 種 倧 琮 綜 從 ' +
  '俊 準 峻 浚 晙 駿 埈 焌 雋 竣 儁 濬 樽 中 重 仲 智 知 志 之 池 芝 持 旨 址 祉 紙 枝 芷 砥 沚 ' +
  '鎭 振 眞 珍 進 晉 陳 璡 瑨 溱 榛 秦 津 燦 贊 璨 瓚 餐 讚 昌 暢 唱 倡 滄 彰 蒼 采 彩 蔡 埰 寀 ' +
  '天 千 川 泉 哲 喆 鐵 澈 徹 淸 晴 靑 初 草 楚 礎 崔 秋 楸 春 忠 充 沖 致 治 ' +
  '泰 太 兌 台 胎 澤 宅 擇 河 夏 賀 昰 荷 漢 韓 翰 澣 閑 寒 咸 函 海 解 諧 偕 香 鄕 珦 憲 軒 獻 赫 爀 奕 ' +
  '賢 顯 炫 鉉 玹 現 弦 絃 峴 晛 泫 亨 炯 瀅 馨 螢 瑩 衡 惠 慧 蕙 寭 浩 鎬 昊 豪 湖 虎 皓 顥 澔 晧 護 扈 祜 灝 ' +
  '弘 洪 泓 鴻 紅 和 華 火 花 煥 桓 換 環 會 懷 孝 曉 涍 厚 后 候 侯 後 珝 勳 訓 焄 熏 薰 壎 輝 徽 彙 ' +
  '熙 喜 姬 熹 禧 僖 嬉 凞 晞 羲 曦 暿').trim().split(/\s+/)
);

// 이름에 거의 안 쓰는 한자(숫자·문법·부정·불쾌) — 추천에서 제외
const EXCLUDE_HANJA = new Set((
  '一 二 三 四 五 六 七 八 九 十 百 千 萬 万 兆 ' +
  '之 乎 也 矣 焉 兮 而 其 厥 乃 爾 尔 于 且 又 亦 卽 則 哉 耶 邪 夫 凡 ' +
  '亡 死 病 惡 鬼 厄 罪 囚 凶 兇 殺 喪 哭 怒 哀 苦 痛 疾 瘡 醜 賤 卑 奴 婢 妾 ' +
  '寓 案 業 兄 尸 屍 糞 尿 嘔 吐 年 寡 孤 寒 貧 困 危 缺 ' +
  '甲 乙 丙 丁 戊 己 庚 辛 壬 癸').trim().split(/\s+/)
);

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

// 5) 음양조화 (획수 홀짝). 성+이름 전체가 한쪽 음양으로 쏠리면 흉. (복성이면 성 2글자 모두 포함)
function scoreEumyang(seongStrokesArr, chars) {
  const par = [...seongStrokesArr, ...chars.map((c) => c.strokes)].map((n) => n % 2);
  const allSame = par.every((p) => p === par[0]);
  return allSame ? 35 : 100;
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
  // 복성(2글자 성)이면 surname.parts 사용, 아니면 단성 1글자로 취급
  const sParts = surname.parts && surname.parts.length
    ? surname.parts
    : [{ hangul: surname.hangul, strokes: surname.strokes }];
  const sStrokesArr = sParts.map((p) => p.strokes);
  const sHangulArr = sParts.map((p) => p.hangul);
  const sLastHangul = sHangulArr[sHangulArr.length - 1]; // 이름 첫 글자와 인접한 성 글자
  const gyeok = window.Sugri.computeGyeokMulti(sStrokesArr, [chars[0].strokes, chars[1].strokes]);
  const evalEum = window.Eum.evaluate([...sHangulArr, firstH, ...restH]);

  const axes = {
    saju: scoreSaju(saju, chars),
    sugri: scoreSugri(gyeok),
    eum: scoreEum(evalEum),
    jawon: scoreJawon(chars),
    eumyang: scoreEumyang(sStrokesArr, chars),
    call: scoreCall(sLastHangul, nameHangul),
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
  // 흔한 이름 한자만 — 희귀자(奲·夭·纜 등) 배제 (충분할 때만)
  const candN = cand.filter((p) => COMMON_NAME_HANJA.has(p.hanja));
  if (candN.length >= 12) cand = candN;
  // 부를 수 있는 이름 우선: 흔한 이름 음절로 제한(충분할 때만)
  const candC = cand.filter((p) => COMMON_SYLL.has(p.hangul) || COMMON_SYLL.has(duum(p.hangul)));
  if (candC.length >= 30) cand = candC;
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

  // 두 음절 모두 흔한 작명 음절 = 부르기 자연스러운 이름
  const isCommon = (h) => COMMON_SYLL.has(h) || COMMON_SYLL.has(duum(h));
  const natural = (r) => isCommon(r.chars[0].hangul) && isCommon(r.chars[1].hangul);

  const seen = new Set();
  const firstCount = {};
  const take = (r) => {
    if (seen.has(r.hangul)) return false;
    const fc = r.chars[0].hangul;
    if ((firstCount[fc] || 0) >= maxPerFirstChar) return false;
    seen.add(r.hangul); firstCount[fc] = (firstCount[fc] || 0) + 1;
    r.isNatural = natural(r);
    return true;
  };

  // 풀 1) 자연스러운 이름(둘 다 흔한 음절, 총점 80↑) — 점수순 다수
  const naturals = [];
  for (const r of results) {
    if (r.total < 80 || !natural(r)) continue;
    if (take(r)) { naturals.push(r); if (naturals.length >= (opt.naturalN || 40)) break; }
  }
  // 풀 2) 고득점·개성 이름 — 자연 여부 무관 최상위
  const highs = [];
  for (const r of results) {
    if (take(r)) { highs.push(r); if (highs.length >= (opt.highN || 14)) break; }
  }
  // 합쳐서 점수순 반환 (Gemini가 자연 8 + 고득점 2 선별)
  const out = [...naturals, ...highs].sort((a, b) => b.totalRaw - a.totalRaw);
  return out.slice(0, limit);
}

// 한글 전용 채점 (한자 없음): 한글 자모 획수로 수리·음양, 발음 2항목. 4축 재가중.
const WEIGHTS_HANGUL = { eum: 35, sugri: 25, eumyang: 20, call: 20 };
function scoreNameHangul(surnameHangul, nameHangul) {
  const HS = window.HangulStroke;
  const sSyl = [...surnameHangul];                       // 복성이면 2글자
  const sStrokesArr = sSyl.map((h) => HS.syllable(h));
  const chars = [...nameHangul].map((h) => ({ hangul: h, strokes: HS.syllable(h) }));
  const c0 = chars[0] ? chars[0].strokes : 0;
  const c1 = chars[1] ? chars[1].strokes : 0;
  const gyeok = window.Sugri.computeGyeokMulti(sStrokesArr, [c0, c1]);
  const evalEum = window.Eum.evaluate([...sSyl, ...chars.map((c) => c.hangul)]);
  const axes = {
    eum: scoreEum(evalEum),
    sugri: scoreSugri(gyeok),
    eumyang: scoreEumyang(sStrokesArr, chars),
    call: scoreCall(sSyl[sSyl.length - 1], nameHangul),
  };
  let raw = 0; for (const k in WEIGHTS_HANGUL) raw += axes[k] * WEIGHTS_HANGUL[k];
  raw /= 100;
  return {
    hangul: surnameHangul + nameHangul, hanja: '',
    strokes: { surname: sStrokesArr, chars: chars.map((c) => c.strokes) },
    axes, total: Math.round(raw), totalRaw: Math.round(raw * 100) / 100,
    gyeok, evalEum, hangulOnly: true,
  };
}

window.Naming = { scoreName, scoreNameHangul, suggest, WEIGHTS, WEIGHTS_HANGUL, isCommonSyll };
