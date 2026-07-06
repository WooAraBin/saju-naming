# -*- coding: utf-8 -*-
# 인명용 한자 8142(+이체) → data/hanja.js 생성
# 음/한자: 위키 인명용 한자표 파싱본(/tmp/inmyeong_pairs.json)
# 획수: 엑셀 있으면 엑셀, 없으면 Unihan총획 + 부수보정
# 자원오행: 엑셀 있으면 엑셀, 없으면 부수규칙
import json, openpyxl
from collections import defaultdict, Counter

WX = {'木': '목', '火': '화', '土': '토', '金': '금', '水': '수'}

# 1) 엑셀 2407: 한자 -> (획수, 자원오행 한글)
wb = openpyxl.load_workbook('/Users/gururung/Downloads/자원오행 발음오행구분표.xlsx', read_only=True)
ws = wb['Sheet1']
xl = {}
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0:
        continue
    e, h, s, hoek, b, bl, j, bg = row
    if h and hoek and j:
        xl[h] = (int(hoek), WX.get(j, j))

# 2) Unihan: 한자 -> 총획, 부수번호
tot = {}; radn = {}
for line in open('/tmp/Unihan_IRGSources.txt', encoding='utf-8'):
    if line.startswith('#') or '\t' not in line:
        continue
    p = line.rstrip('\n').split('\t')
    if len(p) < 3:
        continue
    ch = chr(int(p[0][2:], 16))
    if p[1] == 'kTotalStrokes':
        tot[ch] = int(p[2].split()[0])
    elif p[1] == 'kRSUnicode':
        radn[ch] = p[2].split()[0].split('.')[0].replace("'", '')

# 3) 규칙 (엑셀 ∩ Unihan)
rad_wx = defaultdict(Counter); rad_delta = defaultdict(Counter)
for h, (hk, j) in xl.items():
    if h in radn:
        rad_wx[radn[h]][j] += 1
        if h in tot:
            rad_delta[radn[h]][hk - tot[h]] += 1
wx_rule = {r: c.most_common(1)[0][0] for r, c in rad_wx.items()}
delta_rule = {r: c.most_common(1)[0][0] for r, c in rad_delta.items()}

def strokes_of(h):
    if h in xl:
        return xl[h][0]
    if h in tot:
        return tot[h] + delta_rule.get(radn.get(h), 0)
    return None

def wx_of(h):
    if h in xl:
        return xl[h][1]
    r = radn.get(h)
    return wx_rule.get(r) if r else None

# 4) 두음법칙: 음 -> 두음 변형 음 (ㄹ/ㄴ 초성)
YI = {2, 3, 6, 7, 12, 17, 20}  # ㅑㅒㅕㅖㅛㅠㅣ 계열 중성
def duum(eum):
    c = ord(eum) - 0xAC00
    if c < 0 or c > 11171:
        return None
    cho, jung, jong = c // 588, (c % 588) // 28, c % 28
    if cho == 5:  # ㄹ
        ncho = 11 if jung in YI else 2  # ㅇ or ㄴ
    elif cho == 2 and jung in YI:  # ㄴ + 이/야 계열 → ㅇ
        ncho = 11
    else:
        return None
    if ncho == cho:
        return None
    return chr(0xAC00 + ncho * 588 + jung * 28 + jong)

# 5) 파싱본 로드 → 음별 그룹 (+두음 음)
pairs = json.load(open('/tmp/inmyeong_pairs.json'))
HANJA = defaultdict(dict)  # 음 -> {한자: [획수, 오행]}
miss = 0
for eum, h in pairs:
    st, wx = strokes_of(h), wx_of(h)
    if st is None or wx is None:
        miss += 1
        continue
    HANJA[eum][h] = [st, wx]
    du = duum(eum)
    if du:
        HANJA[du][h] = [st, wx]

# 6) 성씨: 기존 + 보강 (음:대표한자). 획수/오행은 자동
SURNAME_MAP = {
 '김': '金', '이': '李', '박': '朴', '최': '崔', '정': '鄭', '강': '姜', '조': '趙',
 '윤': '尹', '장': '張', '임': '林', '한': '韓', '오': '吳', '서': '徐', '신': '申',
 '권': '權', '황': '黃', '안': '安', '송': '宋', '홍': '洪', '전': '全', '고': '高',
 '문': '文', '손': '孫', '배': '裵', '백': '白', '허': '許', '남': '南', '심': '沈',
 '노': '盧', '하': '河', '곽': '郭', '성': '成', '차': '車', '주': '朱', '우': '禹',
 '구': '具', '민': '閔', '류': '柳', '나': '羅', '여': '呂', '양': '梁', '엄': '嚴',
 '채': '蔡', '천': '千', '방': '方', '공': '孔', '현': '玄', '함': '咸', '변': '邊',
 '염': '廉', '추': '秋', '도': '都', '소': '蘇', '석': '石', '선': '宣', '설': '薛',
 '마': '馬', '연': '延', '위': '魏', '표': '表', '명': '明', '기': '奇', '반': '潘',
 '왕': '王', '금': '琴', '옥': '玉', '육': '陸', '인': '印', '맹': '孟', '제': '諸',
 '모': '牟', '봉': '奉', '사': '史', '부': '夫', '복': '卜', '태': '太', '경': '慶',
 '지': '池', '진': '陳', '엽': '葉', '국': '鞠', '은': '殷', '편': '片', '용': '龍',
 '예': '芮', '경주': '慶', '계': '桂', '음': '陰', '돈': '頓', '동': '童', '두': '杜',
 '림': '林', '명': '明', '무': '武', '미': '米', '반': '班', '뇌': '雷', '단': '段',
 '갈': '葛', '간': '簡', '감': '甘', '강전': '岡', '견': '甄', '경': '景', '구': '丘',
 '국': '國', '궁': '弓', '궉': '鴌', '근': '斤', '낭': '浪', '내': '乃', '뉴': '柳',
}
SURNAME = {}
for eum, h in SURNAME_MAP.items():
    st, wx = strokes_of(h), wx_of(h)
    if st is None or wx is None:
        continue
    SURNAME.setdefault(eum, [])
    if not any(x[0] == h for x in SURNAME[eum]):
        SURNAME[eum].append([h, st, wx])

# 7) 출력
def dump_dict(d):
    lines = []
    for eum in sorted(d.keys()):
        items = sorted(d[eum].items() if isinstance(d[eum], dict) else
                       {x[0]: x[1:] for x in d[eum]}.items(),
                       key=lambda kv: kv[1][0])
        arr = ', '.join('["%s",%d,"%s"]' % (h, v[0], v[1]) for h, v in items)
        lines.append('  "%s": [%s]' % (eum, arr))
    return ',\n'.join(lines)

def dump_surname(d):
    lines = []
    for eum in sorted(d.keys()):
        arr = ', '.join('["%s",%d,"%s"]' % (h, st, wx) for h, st, wx in d[eum])
        lines.append('  "%s": [%s]' % (eum, arr))
    return ',\n'.join(lines)

out = '/* hanja.js — 인명용 한자 8142(+이체) 자동생성\n'
out += ' * 음/한자: 대법원 인명용 한자표(위키 파싱) · 획수/자원오행: 엑셀 검증값 + 부수규칙 보완\n'
out += ' * 형식: 한글음 → [ [한자, 성명학획수, 자원오행], ... ]\n */\n'
out += 'const SURNAME = {\n' + dump_surname(SURNAME) + '\n};\n'
out += 'const HANJA = {\n' + dump_dict(HANJA) + '\n};\n'
out += 'window.HanjaDB = { SURNAME, HANJA };\n'
open('/Users/gururung/Documents/Claude/GitHub/saju-naming/data/hanja.js', 'w').write(out)

total = sum(len(v) for v in HANJA.values())
print('음 종류', len(HANJA), '| 한자엔트리', total, '| 누락(획수/오행없음)', miss)
print('성씨', len(SURNAME), '| 여(呂):', SURNAME.get('여'))
print('엑셀검증 비율: 약 %d/%d' % (sum(1 for e in HANJA for h in HANJA[e] if h in xl), total))
