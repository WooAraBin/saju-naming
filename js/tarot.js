/* =========================================================================
 * tarot.js — 타로 78장 덱 + 오행 매핑 + 사주 가중 카드선택
 *
 * 오행→원소 매핑(사용자 설계):
 *   화=완드(Wands) · 수=컵(Cups) · 금=소드(Swords) · 토=펜타클(Pentacles)
 *   목=메이저 아르카나의 성장/순환 카드에 배분
 * 가중: 용신 오행 카드↑, 부족 오행 카드↑, 과다 오행 카드↓ → 비복원 추출
 * ========================================================================= */

// 마이너 아르카나 수트 → 오행
const _SUIT = {
  완드: { wx: '화', el: '불' }, 컵: { wx: '수', el: '물' },
  소드: { wx: '금', el: '바람' }, 펜타클: { wx: '토', el: '흙' },
};
const _RANK = ['에이스', '2', '3', '4', '5', '6', '7', '8', '9', '10', '시종', '기사', '여왕', '왕'];
const _KW = {
  완드: ['새 시작·영감', '계획·결정', '확장·전망', '안정·축하', '경쟁·마찰', '승리·인정', '방어·맞섬', '신속·전개', '인내·경계', '부담·책임', '탐색·열정', '모험·돌진', '자신감·매력', '리더십·통솔'],
  컵: ['사랑의 시작', '결합·교감', '우정·축하', '권태·무관심', '상실·아쉬움', '추억·순수', '환상·선택', '떠남·전환', '소망 성취', '정서적 행복', '감수성·꿈', '낭만·이상', '공감·배려', '평정·포용'],
  소드: ['돌파·명료함', '교착·보류', '상심·아픔', '휴식·회복', '갈등·자존심', '이동·회복', '전략·기지', '속박·제약', '불안·근심', '종결·바닥', '호기심·관찰', '돌진·결단', '통찰·독립', '이성·권위'],
  펜타클: ['기회·물질', '균형·유연', '협업·기반', '소유·집착', '결핍·불안', '나눔·균형', '평가·인내', '숙련·노력', '풍요·자립', '유산·안정', '학습·실용', '성실·끈기', '실속·현실', '풍요·관리'],
};

// 메이저 아르카나 22장: [번호로마자, 한글명, 영문, 오행, 키워드]
const _MAJOR = [
  ['0', '바보', 'The Fool', '목', '시작·모험·순수'],
  ['I', '마법사', 'The Magician', '화', '의지·창조·실행'],
  ['II', '여사제', 'The High Priestess', '수', '직관·내면의 지혜'],
  ['III', '여제', 'The Empress', '목', '풍요·돌봄·결실'],
  ['IV', '황제', 'The Emperor', '토', '권위·안정·체계'],
  ['V', '교황', 'The Hierophant', '토', '전통·배움·신뢰'],
  ['VI', '연인', 'The Lovers', '목', '관계·선택·조화'],
  ['VII', '전차', 'The Chariot', '화', '추진·의지·돌파'],
  ['VIII', '힘', 'Strength', '화', '용기·인내·내적 힘'],
  ['IX', '은둔자', 'The Hermit', '토', '성찰·고독·탐구'],
  ['X', '운명의 수레바퀴', 'Wheel of Fortune', '목', '변화·순환·전환점'],
  ['XI', '정의', 'Justice', '금', '균형·결단·인과'],
  ['XII', '매달린 사람', 'The Hanged Man', '수', '전환·내려놓음·관점'],
  ['XIII', '죽음', 'Death', '수', '끝과 시작·변형'],
  ['XIV', '절제', 'Temperance', '수', '조화·중용·치유'],
  ['XV', '악마', 'The Devil', '화', '집착·욕망·속박'],
  ['XVI', '탑', 'The Tower', '화', '격변·붕괴·각성'],
  ['XVII', '별', 'The Star', '수', '희망·치유·영감'],
  ['XVIII', '달', 'The Moon', '수', '불안·무의식·환영'],
  ['XIX', '태양', 'The Sun', '화', '성취·활력·기쁨'],
  ['XX', '심판', 'Judgement', '화', '각성·부활·결산'],
  ['XXI', '세계', 'The World', '토', '완성·통합·성취'],
];

// 78장 덱 생성
function buildDeck() {
  const deck = [];
  _MAJOR.forEach(([num, ko, en, wx, kw]) => {
    deck.push({ type: '메이저', num, ko, en, wx, el: '—', kw, name: `${ko} (${en})` });
  });
  Object.keys(_SUIT).forEach((suit) => {
    const { wx, el } = _SUIT[suit];
    _RANK.forEach((rank, i) => {
      deck.push({ type: '마이너', num: rank, ko: `${suit} ${rank}`, en: suit, wx, el, kw: _KW[suit][i], name: `${suit} ${rank}` });
    });
  });
  return deck;
}
const DECK = buildDeck();

// 사주 가중 비복원 추출
function draw(saju, n = 3) {
  // 과다 오행(최다)
  let strong = null, max = -1;
  (window.Saju.WX_KO || ['목', '화', '토', '금', '수']).forEach((o) => {
    const c = (saju.count && saju.count[o]) || 0;
    if (c > max) { max = c; strong = o; }
  });
  const yong = saju.yongsin || [];
  const lack = saju.lacking || [];
  const pool = DECK.map((card) => {
    let w = 1;
    if (yong.includes(card.wx)) w *= 2.5;   // 용신 오행 강조
    if (lack.includes(card.wx)) w *= 1.8;   // 부족 오행 강조
    if (card.wx === strong) w *= 0.6;        // 과다 오행 약화
    return { card, w };
  });
  const picked = [];
  for (let k = 0; k < n && pool.length; k++) {
    const total = pool.reduce((a, b) => a + b.w, 0);
    let x = Math.random() * total, idx = 0;
    for (let i = 0; i < pool.length; i++) { x -= pool[i].w; if (x <= 0) { idx = i; break; } }
    const c = { ...pool[idx].card, reversed: Math.random() < 0.4 }; // 40% 역방향
    picked.push(c);
    pool.splice(idx, 1);
  }
  return picked;
}

window.Tarot = { DECK, draw, buildDeck };
