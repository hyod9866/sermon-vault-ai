'use strict';

const {
  Plugin,
  ItemView,
  FuzzySuggestModal,
  Notice,
  PluginSettingTab,
  Setting,
  MarkdownView,
  MarkdownRenderer,
  Platform,
  setIcon,
  requestUrl
} = require('obsidian');

const VIEW_TYPE_VAULT_AI = 'sermon-vault-ai-view';
const CONTEXT_WINDOW_LIMIT = 1048576;

// Internal system folders always excluded from markdown note search
const SYSTEM_EXCLUDED_FOLDERS = [
  '_bibles',
  '_strong',
  '_strong_json',
  '_설교마인드맵_글꼴',
  '_설교마인드맵_필기',
  'copilot',
  '.obsidian',
  '.trash',
  '.agents',
  '.claude',
  '.copilot',
  '.opencode',
  'HTML import'
];

// Commentary vault folder prefix (included only when "주석" checkbox is checked)
const COMMENTARY_FOLDER_PREFIX = '02 성경 연구/05 주석, 강해';

const MODEL_OPTIONS = [
  { value: 'gemini-3.5-flash-lite', label: '3.5 Flash-Lite (초고속·절약)' },
  { value: 'gemini-3.5-flash', label: '3.5 Flash (최신·균형 추천)' },
  { value: 'gemini-3-flash-preview', label: '3.0 Flash (고성능 프리뷰)' },
  { value: 'gemini-2.5-flash-lite', label: '2.5 Flash-Lite (경량·빠름)' },
  { value: 'gemini-2.5-flash', label: '2.5 Flash (안정적 표준)' },
  { value: 'gemini-2.5-pro', label: '2.5 Pro (심층 신학·설교 분석)' }
];

const MODEL_CANDIDATE_CHAINS = {
  'gemini-3.5-flash-lite': ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite-preview', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash'],
  'gemini-3.5-flash': ['gemini-3.5-flash', 'gemini-3.5-flash-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash'],
  'gemini-3-flash-preview': ['gemini-3-flash-preview', 'gemini-2.5-flash'],
  'gemini-2.5-flash-lite': ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
  'gemini-2.5-flash': ['gemini-2.5-flash', 'gemini-3-flash-preview'],
  'gemini-2.5-pro': ['gemini-2.5-pro', 'gemini-3-flash-preview', 'gemini-2.5-flash']
};

const BOOKS_INFO = [
  { no: 1, num: '01', full: '창세기', short: '창' },
  { no: 2, num: '02', full: '출애굽기', short: '출' },
  { no: 3, num: '03', full: '레위기', short: '레' },
  { no: 4, num: '04', full: '민수기', short: '민' },
  { no: 5, num: '05', full: '신명기', short: '신' },
  { no: 6, num: '06', full: '여호수아', short: '수' },
  { no: 7, num: '07', full: '사사기', short: '삿' },
  { no: 8, num: '08', full: '룻기', short: '룻' },
  { no: 9, num: '09', full: '사무엘상', short: '삼상' },
  { no: 10, num: '10', full: '사무엘하', short: '삼하' },
  { no: 11, num: '11', full: '열왕기상', short: '왕상' },
  { no: 12, num: '12', full: '열왕기하', short: '왕하' },
  { no: 13, num: '13', full: '역대상', short: '대상' },
  { no: 14, num: '14', full: '역대하', short: '대하' },
  { no: 15, num: '15', full: '에스라', short: '스' },
  { no: 16, num: '16', full: '느헤미야', short: '느' },
  { no: 17, num: '17', full: '에스더', short: '에' },
  { no: 18, num: '18', full: '욥기', short: '욥' },
  { no: 19, num: '19', full: '시편', short: '시' },
  { no: 20, num: '20', full: '잠언', short: '잠' },
  { no: 21, num: '21', full: '전도서', short: '전' },
  { no: 22, num: '22', full: '아가', short: '아' },
  { no: 23, num: '23', full: '이사야', short: '사' },
  { no: 24, num: '24', full: '예레미야', short: '렘' },
  { no: 25, num: '25', full: '예레미야애가', short: '애' },
  { no: 26, num: '26', full: '에스겔', short: '겔' },
  { no: 27, num: '27', full: '다니엘', short: '단' },
  { no: 28, num: '28', full: '호세아', short: '호' },
  { no: 29, num: '29', full: '요엘', short: '욜' },
  { no: 30, num: '30', full: '아모스', short: '암' },
  { no: 31, num: '31', full: '오바댜', short: '옵' },
  { no: 32, num: '32', full: '요나', short: '욘' },
  { no: 33, num: '33', full: '미가', short: '미' },
  { no: 34, num: '34', full: '나훔', short: '나' },
  { no: 35, num: '35', full: '하박국', short: '합' },
  { no: 36, num: '36', full: '스바냐', short: '습' },
  { no: 37, num: '37', full: '학개', short: '학' },
  { no: 38, num: '38', full: '스가랴', short: '슥' },
  { no: 39, num: '39', full: '말라기', short: '말' },
  { no: 40, num: '40', full: '마태복음', short: '마' },
  { no: 41, num: '41', full: '마가복음', short: '막' },
  { no: 42, num: '42', full: '누가복음', short: '눅' },
  { no: 43, num: '43', full: '요한복음', short: '요' },
  { no: 44, num: '44', full: '사도행전', short: '행' },
  { no: 45, num: '45', full: '로마서', short: '롬' },
  { no: 46, num: '46', full: '고린도전서', short: '고전' },
  { no: 47, num: '47', full: '고린도후서', short: '고후' },
  { no: 48, num: '48', full: '갈라디아서', short: '갈' },
  { no: 49, num: '49', full: '에베소서', short: '엡' },
  { no: 50, num: '50', full: '빌립보서', short: '빌' },
  { no: 51, num: '51', full: '골로새서', short: '골' },
  { no: 52, num: '52', full: '데살로니가전서', short: '살전' },
  { no: 53, num: '53', full: '데살로니가후서', short: '살후' },
  { no: 54, num: '54', full: '디모데전서', short: '딤전' },
  { no: 55, num: '55', full: '디모데후서', short: '딤후' },
  { no: 56, num: '56', full: '디도서', short: '딛' },
  { no: 57, num: '57', full: '빌레몬서', short: '몬' },
  { no: 58, num: '58', full: '히브리서', short: '히' },
  { no: 59, num: '59', full: '야고보서', short: '약' },
  { no: 60, num: '60', full: '베드로전서', short: '벧전' },
  { no: 61, num: '61', full: '베드로후서', short: '벧후' },
  { no: 62, num: '62', full: '요한일서', short: '요일', alt: '요한1서' },
  { no: 63, num: '63', full: '요한이서', short: '요이', alt: '요한2서' },
  { no: 64, num: '64', full: '요한삼서', short: '요삼', alt: '요한3서' },
  { no: 65, num: '65', full: '유다서', short: '유' },
  { no: 66, num: '66', full: '요한계시록', short: '계', alt: '계시록' }
];

const BOOK_LOOKUP = new Map();
const ALL_BOOK_KEYS = [];
for (const b of BOOKS_INFO) {
  BOOK_LOOKUP.set(b.full, b);
  BOOK_LOOKUP.set(b.short, b);
  ALL_BOOK_KEYS.push(b.full, b.short);
  if (b.alt) {
    BOOK_LOOKUP.set(b.alt, b);
    ALL_BOOK_KEYS.push(b.alt);
  }
}
ALL_BOOK_KEYS.sort((a, b) => b.length - a.length);
const BOOK_REGEX_STR = ALL_BOOK_KEYS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

const BIBLICAL_CONCEPT_MAP = [
  { triggers: ['선악과', '하와', '에덴동산', '가죽옷', '무화과나무 잎'], refs: ['창 3'], terms: ['선악을 알게 하는 나무', '가죽옷', '타락'] },
  { triggers: ['가인', '아벨'], refs: ['창 4', '히 11:4'], terms: ['가인', '아벨', '피의 제사', '제물'] },
  { triggers: ['노아', '방주', '홍수 심판'], refs: ['창 6', '창 7', '창 8'], terms: ['노아', '방주', '홍수'] },
  { triggers: ['바벨탑'], refs: ['창 11'], terms: ['바벨탑', '시날 평지'] },
  { triggers: ['멜기세덱'], refs: ['창 14', '히 7'], terms: ['멜기세덱', '살렘 왕', '대제사장'] },
  { triggers: ['소돔', '고모라', '롯의 처'], refs: ['창 19'], terms: ['소돔', '고모라', '롯'] },
  { triggers: ['이삭 바치', '모리아산', '독자 이삭', '아브라함의 시험'], refs: ['창 22'], terms: ['이삭', '모리아', '번제', '여호와 이레'] },
  { triggers: ['장자권', '팥죽', '야곱과 에서', '에서의'], refs: ['창 25', '창 27', '히 12:16'], terms: ['장자의 명분', '에서', '야곱', '축복'] },
  { triggers: ['얍복강', '환도뼈', '이스라엘로'], refs: ['창 32'], terms: ['얍복', '환도뼈', '야곱'] },
  { triggers: ['유월절', '문설주', '어린양의 피'], refs: ['출 12'], terms: ['유월절', '어린양', '피를 볼 때'] },
  { triggers: ['홍해'], refs: ['출 14'], terms: ['홍해', '애굽 군대'] },
  { triggers: ['만나', '메추라기', '마라의 쓴물'], refs: ['출 15', '출 16'], terms: ['만나', '마라', '광야'] },
  { triggers: ['십계명', '시내산 율법'], refs: ['출 20'], terms: ['십계명', '율법'] },
  { triggers: ['성막', '법궤', '언약궤', '속죄소', '지성소'], refs: ['출 25', '레 16', '히 9'], terms: ['성막', '지성소', '속죄소', '대속죄일'] },
  { triggers: ['번제', '소제', '화목제', '속죄제', '속건제', '5대 제사', '안수'], refs: ['레 1', '레 2', '레 3', '레 4', '레 5', '레 16'], terms: ['안수', '속죄제', '번제', '피'] },
  { triggers: ['문둥병', '나병'], refs: ['레 13', '레 14', '왕하 5'], terms: ['문둥병', '정결', '나아만'] },
  { triggers: ['놋뱀', '불뱀'], refs: ['민 21', '요 3:14'], terms: ['놋뱀', '광야', '쳐다본즉'] },
  { triggers: ['도피성'], refs: ['민 35', '수 20'], terms: ['도피성', '대제사장'] },
  { triggers: ['기생 라합', '붉은 줄', '여리고'], refs: ['수 2', '수 6'], terms: ['라합', '여리고', '붉은 줄'] },
  { triggers: ['기드온', '삼백 용사', '횃불과 항아리'], refs: ['삿 6', '삿 7'], terms: ['기드온', '항아리', '횃불'] },
  { triggers: ['삼손', '들릴라', '나실인'], refs: ['삿 13', '삿 16'], terms: ['삼손', '나실인'] },
  { triggers: ['보아스', '기업 무를 자', '나오미'], refs: ['룻 2', '룻 3', '룻 4'], terms: ['보아스', '룻', '기업 무를 자'] },
  { triggers: ['골리앗', '물맷돌'], refs: ['삼상 17'], terms: ['골리앗', '다윗', '물매'] },
  { triggers: ['아둘람', '사울과 다윗'], refs: ['삼상 22', '삼상 24'], terms: ['아둘람', '다윗', '사울'] },
  { triggers: ['므비보셋', '로드발'], refs: ['삼하 9'], terms: ['므비보셋', '요나단', '다윗'] },
  { triggers: ['밧세바', '우리야'], refs: ['삼하 11', '삼하 12', '시 51'], terms: ['밧세바', '우리야', '나단', '회개'] },
  { triggers: ['압살롬'], refs: ['삼하 15', '삼하 18'], terms: ['압살롬', '다윗'] },
  { triggers: ['갈멜산', '바알 선지자', '사르밧 과부'], refs: ['왕상 17', '왕상 18'], terms: ['엘리야', '갈멜산', '사르밧'] },
  { triggers: ['나아만', '요단강 일곱 번'], refs: ['왕하 5'], terms: ['나아만', '엘리사', '문둥병', '요단강'] },
  { triggers: ['네 명의 문둥이', '사마리아 성문'], refs: ['왕하 7'], terms: ['문둥이 네 사람', '아람 진', '아름다운 소식'] },
  { triggers: ['히스기야', '해그림자'], refs: ['왕하 20', '사 38'], terms: ['히스기야', '기도', '병'] },
  { triggers: ['산상수훈', '팔복', '심령이 가난한'], refs: ['마 5', '마 6', '마 7'], terms: ['팔복', '산상수훈', '심령이 가난한'] },
  { triggers: ['씨 뿌리는', '씨뿌리는', '네 가지 밭', '옥토', '가시떨기'], refs: ['마 13', '막 4', '눅 8'], terms: ['씨 뿌리는', '옥토', '길가', '돌밭', '가시떨기'] },
  { triggers: ['일만 달란트', '백 데나리온', '용서'], refs: ['마 18:21'], terms: ['일만 달란트', '탕감', '백 데나리온'] },
  { triggers: ['열 처녀', '슬기로운 다섯', '기름 준비'], refs: ['마 25:1'], terms: ['열 처녀', '등과 기름', '신랑'] },
  { triggers: ['달란트 비유', '다섯 달란트', '한 달란트'], refs: ['마 25:14'], terms: ['달란트', '충성된 종'] },
  { triggers: ['양과 염소'], refs: ['마 25:31'], terms: ['양과 염소', '지극히 작은 자'] },
  { triggers: ['혈루증', '열두 해 혈루증', '야이로'], refs: ['막 5', '눅 8'], terms: ['혈루증', '옷가에 손을'] },
  { triggers: ['선한 사마리아', '강도 만난 자', '여리고로 내려가다가'], refs: ['눅 10:25', '눅 10:30'], terms: ['선한 사마리아인', '강도 만난 자', '기름과 포도주'] },
  { triggers: ['마르다', '마리아'], refs: ['눅 10:38', '요 11', '요 12'], terms: ['마르다', '마리아', '옥합'] },
  { triggers: ['탕자', '둘째 아들', '집 나간 아들', '잃은 양', '드라크마'], refs: ['눅 15'], terms: ['탕자', '둘째 아들', '아버지', '살진 송아지'] },
  { triggers: ['부자와 나사로'], refs: ['눅 16:19'], terms: ['부자와 나사로', '아브라함의 품'] },
  { triggers: ['바리새인과 세리'], refs: ['눅 18:9'], terms: ['바리새인과 세리', '불쌍히 여기소서'] },
  { triggers: ['삭개오', '뽕나무'], refs: ['눅 19:1'], terms: ['삭개오', '세리장', '구원이 이 집에'] },
  { triggers: ['엠마오'], refs: ['눅 24:13'], terms: ['엠마오', '마음이 뜨겁지'] },
  { triggers: ['가나 혼인', '물과 포도주'], refs: ['요 2:1'], terms: ['가나 혼인 잔치', '포도주'] },
  { triggers: ['니고데모', '거듭남', '물과 성령으로'], refs: ['요 3'], terms: ['니고데모', '거듭나지 아니하면', '물과 성령'] },
  { triggers: ['수가성', '사마리아 여인', '우물가', '남편 다섯', '생수'], refs: ['요 4'], terms: ['사마리아 여인', '수가성', '우물', '남편', '신령과 진정'] },
  { triggers: ['베데스다', '삼십팔 년 된 병자', '38년 된 병자'], refs: ['요 5'], terms: ['베데스다', '38년', '자리를 들고'] },
  { triggers: ['오병이어', '생명의 떡'], refs: ['요 6', '마 14'], terms: ['오병이어', '생명의 떡'] },
  { triggers: ['간음 중에 잡힌', '간음한 여인', '돌로 치라'], refs: ['요 8:1'], terms: ['간음', '죄 없는 자가 먼저 돌로'] },
  { triggers: ['나면서 소경', '실로암'], refs: ['요 9'], terms: ['실로암', '소경', '하나님의 하시는 일을'] },
  { triggers: ['선한 목자', '양의 문'], refs: ['요 10'], terms: ['선한 목자', '양의 문'] },
  { triggers: ['나사로 살리', '나사로야 나오라'], refs: ['요 11'], terms: ['나사로', '부활이요 생명이니'] },
  { triggers: ['향유 옥합', '마리아의 옥합'], refs: ['요 12', '마 26', '막 14'], terms: ['향유', '옥합', '장사할 날'] },
  { triggers: ['세족식', '발을 씻기', '목욕한 자'], refs: ['요 13'], terms: ['발을 씻기', '이미 목욕한 자'] },
  { triggers: ['참 포도나무', '가지가 붙어'], refs: ['요 15'], terms: ['포도나무', '내 안에 거하라', '열매'] },
  { triggers: ['오순절', '성령 강림'], refs: ['행 2'], terms: ['오순절', '성령', '방언'] },
  { triggers: ['미문', '안은뱅이', '은과 금은 내게 없거니와'], refs: ['행 3'], terms: ['성전 미문', '안은뱅이', '나사렛 예수'] },
  { triggers: ['아나니아와 삽비라'], refs: ['행 5'], terms: ['아나니아', '삽비라'] },
  { triggers: ['스데반'], refs: ['행 7'], terms: ['스데반', '순교'] },
  { triggers: ['에디오피아 내시', '빌립 집사'], refs: ['행 8:26'], terms: ['내시', '빌립', '이사야의 글'] },
  { triggers: ['다메섹', '사울의 회심'], refs: ['행 9'], terms: ['다메섹', '사울', '아나니아'] },
  { triggers: ['고넬료', '백부장'], refs: ['행 10'], terms: ['고넬료', '베드로', '이방인'] },
  { triggers: ['빌립보 감옥', '루디아', '간수', '어떻게 하여야 구원을'], refs: ['행 16'], terms: ['빌립보', '간수', '주 예수를 믿으라'] },
  { triggers: ['합력하여 선', '성령의 탄식', '정죄함이 없나니', '양자의 영'], refs: ['롬 8'], terms: ['롬 8:1', '롬 8:28', '합력하여 선', '정죄'] },
  { triggers: ['산 제사', '영적 예배', '이 세대를 본받지'], refs: ['롬 12:1', '롬 12:2'], terms: ['산 제사', '영적 예배', '마음을 새롭게'] },
  { triggers: ['사랑장', '사랑은 오래 참고'], refs: ['고전 13'], terms: ['고전 13', '사랑은 오래 참고'] },
  { triggers: ['부활장', '부활의 첫 열매'], refs: ['고전 15'], terms: ['고전 15', '부활'] },
  { triggers: ['질그릇에 담긴 보배', '속사람', '겉사람'], refs: ['고후 4'], terms: ['질그릇', '보배', '속사람'] },
  { triggers: ['새로운 피조물', '화목하게 하는 직책'], refs: ['고후 5:17'], terms: ['새로운 피조물', '화목'] },
  { triggers: ['육체의 소욕', '성령의 열매', '아홉 가지 열매'], refs: ['갈 5:16', '갈 5:22'], terms: ['성령의 열매', '육체의 소욕'] },
  { triggers: ['전신갑주', '영적 전쟁', '마귀의 궤계'], refs: ['엡 6:10', '엡 6:11'], terms: ['전신갑주', '구원의 투구', '성령의 검'] },
  { triggers: ['그리스도의 마음', '자기를 비워 종의 형체'], refs: ['빌 2:5'], terms: ['빌 2:5', '자기를 비워', '겸손'] },
  { triggers: ['염려하지 말고', '감사함으로 하나님께'], refs: ['빌 4:6'], terms: ['염려', '기도와 간구', '평강'] },
  { triggers: ['영원한 속죄', '단번에 제사', '염소와 송아지의 피'], refs: ['히 9:12', '히 10:10', '히 10:14'], terms: ['영원한 속죄', '단번에', '온전케'] },
  { triggers: ['믿음장', '바라는 것들의 실상'], refs: ['히 11'], terms: ['히 11:1', '바라는 것들의 실상', '믿음으로'] },
  { triggers: ['징계', '구름 같이 둘러싼 허다한 증인'], refs: ['히 12'], terms: ['히 12', '징계', '믿음의 주요'] },
  { triggers: ['왕 같은 제사장', '신령한 집', '산 돌'], refs: ['벧전 2:5', '벧전 2:9'], terms: ['왕 같은 제사장', '거룩한 제사장'] },
  { triggers: ['빛 가운데 행하면', '자백하면'], refs: ['요일 1:7', '요일 1:9'], terms: ['요일 1:7', '요일 1:9', '깨끗하게'] },
  { triggers: ['일곱 교회', '에베소 교회', '라오디게아', '문 밖에 서서 두드리'], refs: ['계 2', '계 3'], terms: ['일곱 교회', '첫사랑', '라오디게아', '계 3:20'] }
];

const STOP_WORDS = new Set([
  '설교', '설교문', '설교에서', '설교문에서', '설교중에', '설교들', '말씀', '말씀에서',
  '목사님', '목사님들', '목사님이', '목사님의', '목사', '전도인', '강사', '강해',
  '내용', '내용을', '내용이', '부분', '부분을', '대해', '대해서', '대한', '관해', '관한',
  '어떻게', '무엇', '무엇인가', '무엇인지', '뭔가', '뭔지', '어떤', '어디', '언제', '누가', '왜',
  '찾아줘', '찾아봐', '찾아', '알려줘', '알려', '보여줘', '설명해줘', '설명해', '설명',
  '요약해줘', '요약해', '요약', '정리해줘', '정리해', '정리', '비교해줘', '해석',
  '있는', '있는지', '있나', '있나요', '하는', '하고', '에서', '에게', '으로', '로',
  '그리고', '그러나', '하지만', '그래서', '또한', '혹시', '그냥', '일단', '내가', '내', '우리',
  '볼트', '노트', '노트에서', '기존', '질문', '답변', '얘기', '이야기', '말하는', '말씀하시는',
  '좀', '더', '자세히', '구체적으로', '쉽게', '풀어서', '해봐', '봐'
]);

const KOR_PARTICLES = /(?:에서는|에서부터|으로부터|에게는|에게서|에대해|에대한|이라고|라는|이란|으로|로써|로서|에서|에게|부터|까지|처럼|만큼|보다|하고|이나|나마|조차|마저|은|는|이|가|을|를|의|에|로|와|과|도|만)$/;

function getCurrentQuotaDayId() {
  const shifted = new Date(Date.now() - 8 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function formatEditorialMarkdown(markdown) {
  if (!markdown) return '';
  let txt = String(markdown)
    .replace(/\r\n/g, '\n')
    .replace(/\n+(?:---\s*\n+)?#{1,4}\s*(?:출처\s*노트(?:\s*링크)?|참조(?:\s*한)?\s*(?:설교|노트)(?:\s*링크|\s*목록)?|참고\s*(?:설교|노트|자료)(?:\s*링크|\s*목록)?)\s*\n+(?:[ \t]*[-*•\d.]+\s*\[\[[^\]]+\]\][^\n]*\n?)+$/gi, '')
    .trim();

  const lines = txt.split('\n');
  const out = [];
  let deindentChildBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    const topCatMatch = line.match(/^(?:[-*•]|\d+\.)\s+\*\*([^*:\n]+)\*\*\s*:?\s*$/);
    const nextIsIndentedBullet = /^[ \t]{2,}(?:[-*•]|\d+\.)\s+/.test(nextLine);

    if (topCatMatch && nextIsIndentedBullet) {
      const subTitle = topCatMatch[1].trim();
      out.push(`\n### ${subTitle}`);
      deindentChildBlock = true;
      continue;
    }

    if (deindentChildBlock) {
      if (/^[ \t]{2,}(?:[-*•]|\d+\.)\s+/.test(line)) {
        const stripped = line.replace(/^[ \t]{2,4}/, '');
        out.push(stripped);
        continue;
      } else if (line.trim() === '') {
        out.push(line);
        continue;
      } else {
        deindentChildBlock = false;
      }
    }

    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function stripHtmlTags(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<num>(.*?)<\/num>/gi, '[$1]')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const DEFAULT_SETTINGS = {
  geminiApiKeys: '',
  useSharedVaultKeys: true,
  geminiModel: 'gemini-3.5-flash',
  fallbackModels: 'gemini-3-flash-preview, gemini-2.5-flash, gemini-2.5-flash-lite',
  useAiQueryPlanner: true,
  bodyFontSize: 15,
  searchFolderScope: '',
  includeStrong: false,
  includeCommentary: false,
  maxSearchResults: 8,
  maxCharsPerNote: 2800,
  temperature: 0.3,
  dailyQuotaPerKey: 25,
  quotaStats: {
    dayId: '',
    requestsToday: 0,
    promptTokensToday: 0,
    outputTokensToday: 0,
    lastPromptTokens: 0,
    lastOutputTokens: 0,
    exhaustedKeys: []
  },
  systemPrompt:
    '당신은 목회자의 설교 연구와 성경 묵상을 돕는 정확하고 깊이 있는 신학·설교 AI 조교입니다.\n' +
    '반드시 사람이 읽기에 편집이 정돈된 아래의 일관된 마크다운 서식 규칙을 엄격히 지켜 작성하십시오:\n' +
    '1. 대분류 제목은 `## 1. 대제목` 형식을 사용하고, 그 아래 중분류(소제목, 예: 네 가지 밭 각각의 항목 등)는 불릿으로 들여쓰지 말고 반드시 `### 소제목` (H3 헤딩)으로 구분하여 본문보다 글자가 크고 또렷하게 보이도록 하십시오.\n' +
    '2. 소제목이나 대제목 아래의 나열 항목(예: 씨, 씨 뿌리는 자, 밭, 새, 특징, 원인, 결과 등)은 반드시 1단계 글머리 기호(`- **항목명**: 설명...`)를 사용하여 모든 항목 앞에 말머리(`•`)가 일관되게 붙도록 하고, 불필요한 2중·3중 과도한 들여쓰기를 하지 마십시오.\n' +
    '3. 볼트 내 설교문·연구 노트를 인용할 때는 각 설명 문장 끝에 `[[노트제목]]` 형식으로 명시하되, 답변 맨 마지막에 별도의 "### 출처 노트 링크" 목록을 중복해서 다시 나열하지 마십시오.\n' +
    '4. 설교자(예: 이요한P, 홍정현P, 서도석P 등)나 스트롱 원어사전·주석 자료가 함께 주어졌다면 본문과 자연스럽게 어우러지도록 명확히 정리하십시오.',
  saveFolder: '02 성경 연구',
  nasBaseUrl: 'https://seoulpastor.direct.quickconnect.to:5001',
  nasUser: 'pastor',
  nasPass: 'jbcH0691~!',
  nasRootFolder: '/개인폴더/히 최신자료/9 신학원 원고-완료',
  nasNewFolder: 'new',
  nasAutoSyncWeekly: true,
  nasLastSyncTs: 0,
  nasSyncedPaths: {},
  telegramBotToken: '9071996966:AAGtkb9f3Ss4oUagnZ4-9gtB2we7g4lDMPU',
  telegramChatId: '',
  chatHistory: []
};

/* ============================================================================
 * PURE-JS DOCUMENT EXTRACTOR (.hwp / .hwpx / .docx -> text) & NAS SYNC HELPERS
 * Works identically on Windows, MacBook (macOS), and iPad (iPadOS)
 * ============================================================================ */

async function inflateRawBytesPureJs(compBytes) {
  if (typeof require === 'function') {
    try {
      const zlib = require('zlib');
      if (zlib && typeof zlib.inflateRawSync === 'function') {
        const out = zlib.inflateRawSync(compBytes);
        return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
      }
    } catch (e) {}
  }
  if (typeof DecompressionStream === 'function') {
    const ds = new DecompressionStream('deflate-raw');
    const readerPromise = new Response(ds.readable).arrayBuffer();
    const writer = ds.writable.getWriter();
    await writer.write(compBytes);
    await writer.close();
    return new Uint8Array(await readerPromise);
  }
  throw new Error('이 기기에서 DEFLATE 압축 해제를 지원하지 않습니다.');
}

function parseZipEntriesPureJs(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocdOffset = -1;
  const minOff = Math.max(0, u8.length - 65558);
  for (let i = u8.length - 22; i >= minOff; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('유효한 ZIP(DOCX/HWPX) 파일이 아닙니다.');
  const totalEntries = dv.getUint16(eocdOffset + 10, true);
  const cdOffset = dv.getUint32(eocdOffset + 16, true);
  const dec = new TextDecoder('utf-8');
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (p + 46 > u8.length || dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const uncompSize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localHeaderOffset = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    entries.push({ name, method, compSize, uncompSize, localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readZipEntryBytesPureJs(u8, entry) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const lh = entry.localHeaderOffset;
  if (lh + 30 > u8.length || dv.getUint32(lh, true) !== 0x04034b50) {
    throw new Error(`ZIP 로컬 헤더 손상: ${entry.name}`);
  }
  const lfNameLen = dv.getUint16(lh + 26, true);
  const lfExtraLen = dv.getUint16(lh + 28, true);
  const dataStart = lh + 30 + lfNameLen + lfExtraLen;
  const compSlice = u8.subarray(dataStart, dataStart + entry.compSize);
  if (entry.method === 0) return new Uint8Array(compSlice);
  if (entry.method === 8) return await inflateRawBytesPureJs(compSlice);
  throw new Error(`지원하지 않는 압축 방식(${entry.method}): ${entry.name}`);
}

async function extractDocxTextPureJs(u8) {
  const entries = parseZipEntriesPureJs(u8);
  const docEntry = entries.find((e) => e.name === 'word/document.xml');
  if (!docEntry) return '';
  const xmlBytes = await readZipEntryBytesPureJs(u8, docEntry);
  const xmlStr = new TextDecoder('utf-8').decode(xmlBytes);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
  const paragraphs = [];
  const pNodes = xmlDoc.getElementsByTagName('*');
  for (let i = 0; i < pNodes.length; i++) {
    const el = pNodes[i];
    if (el.localName === 'p') {
      const texts = [];
      const children = el.getElementsByTagName('*');
      for (let j = 0; j < children.length; j++) {
        if (children[j].localName === 't' && children[j].textContent) {
          texts.push(children[j].textContent);
        }
      }
      const line = texts.join('').trim();
      if (line) paragraphs.push(line);
    }
  }
  return paragraphs.join('\n');
}

async function extractHwpxTextPureJs(u8) {
  const entries = parseZipEntriesPureJs(u8);
  const secEntries = entries
    .filter((e) => /^Contents\/section\d+\.xml$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const parser = new DOMParser();
  const paragraphs = [];
  for (const entry of secEntries) {
    const xmlBytes = await readZipEntryBytesPureJs(u8, entry);
    const xmlStr = new TextDecoder('utf-8').decode(xmlBytes);
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
    const allNodes = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allNodes.length; i++) {
      const el = allNodes[i];
      if (el.localName === 'p') {
        const texts = [];
        const children = el.getElementsByTagName('*');
        for (let j = 0; j < children.length; j++) {
          if (children[j].localName === 't' && children[j].textContent) {
            texts.push(children[j].textContent);
          }
        }
        const line = texts.join('').trim();
        if (line) paragraphs.push(line);
      }
    }
  }
  return paragraphs.join('\n');
}

function parseHwpSectionRecordsPureJs(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const paragraphs = [];
  let pos = 0;
  const extendedControls = new Set([1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23]);
  const inlineControls = new Set([4, 5, 6, 7, 8, 9, 19, 20]);

  while (pos + 4 <= buf.length) {
    const header = dv.getUint32(pos, true);
    pos += 4;
    const tagId = header & 0x3ff;
    let size = (header >>> 20) & 0xfff;
    if (size === 0xfff) {
      if (pos + 4 > buf.length) break;
      size = dv.getUint32(pos, true);
      pos += 4;
    }
    if (pos + size > buf.length) break;

    if (tagId === 67) {
      // HWPTAG_PARA_TEXT
      const chars = [];
      let i = 0;
      while (i + 1 < size) {
        const code = dv.getUint16(pos + i, true);
        if (code === 0) {
          i += 2;
        } else if (extendedControls.has(code)) {
          i += 16;
        } else if (inlineControls.has(code)) {
          i += 16;
        } else if (code === 10 || code === 13) {
          chars.push('\n');
          i += 2;
        } else if (code === 24) {
          chars.push('-');
          i += 2;
        } else if (code === 30 || code === 31) {
          chars.push(' ');
          i += 2;
        } else if (code < 32) {
          i += 2;
        } else {
          chars.push(String.fromCharCode(code));
          i += 2;
        }
      }
      const line = chars.join('').trim();
      if (line) paragraphs.push(line);
    }
    pos += size;
  }
  return paragraphs.join('\n');
}

async function extractHwpV5TextPureJs(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  // Check OLE2 magic signature D0 CF 11 E0 A1 B1 1A E1
  if (u8.length < 512 || dv.getUint32(0, true) !== 0xe011cfd0 || dv.getUint32(4, true) !== 0xe11ab1a1) {
    // Some .hwp files are actually HWPX (ZIP) with .hwp extension
    if (dv.getUint32(0, true) === 0x04034b50) {
      return await extractHwpxTextPureJs(u8);
    }
    throw new Error('유효한 HWP(OLE2/HWPX) 파일이 아닙니다.');
  }

  const sectorShift = dv.getUint16(30, true);
  const miniSectorShift = dv.getUint16(32, true);
  const sectorSize = 1 << sectorShift;
  const miniSectorSize = 1 << miniSectorShift;
  const numFatSectors = dv.getUint32(44, true);
  const firstDirSector = dv.getUint32(48, true);
  const miniStreamCutoff = dv.getUint32(56, true);
  const firstMiniFatSector = dv.getUint32(60, true);
  const numMiniFatSectors = dv.getUint32(64, true);
  const firstDifatSector = dv.getUint32(68, true);
  const numDifatSectors = dv.getUint32(72, true);

  const sectorOffset = (secId) => (secId + 1) * sectorSize;

  const fatSectors = [];
  for (let i = 0; i < 109 && fatSectors.length < numFatSectors; i++) {
    const sid = dv.getUint32(76 + i * 4, true);
    if (sid !== 0xffffffff && sid !== 0xfffffffe) fatSectors.push(sid);
  }
  let difatSec = firstDifatSector;
  for (let d = 0; d < numDifatSectors && difatSec < 0xfffffffe; d++) {
    const off = sectorOffset(difatSec);
    const entriesPerSec = (sectorSize >>> 2) - 1;
    for (let i = 0; i < entriesPerSec && fatSectors.length < numFatSectors; i++) {
      const sid = dv.getUint32(off + i * 4, true);
      if (sid !== 0xffffffff && sid !== 0xfffffffe) fatSectors.push(sid);
    }
    difatSec = dv.getUint32(off + entriesPerSec * 4, true);
  }

  const fatEntriesPerSector = sectorSize >>> 2;
  const fat = new Uint32Array(fatSectors.length * fatEntriesPerSector);
  for (let i = 0; i < fatSectors.length; i++) {
    const off = sectorOffset(fatSectors[i]);
    for (let j = 0; j < fatEntriesPerSector; j++) {
      if (off + j * 4 + 4 <= u8.length) {
        fat[i * fatEntriesPerSector + j] = dv.getUint32(off + j * 4, true);
      }
    }
  }

  const readRegularStream = (startSec, streamSize = null) => {
    const chunks = [];
    let total = 0;
    let sec = startSec;
    const visited = new Set();
    while (sec < 0xfffffffe && !visited.has(sec)) {
      visited.add(sec);
      const off = sectorOffset(sec);
      if (off >= u8.length) break;
      const slice = u8.subarray(off, Math.min(u8.length, off + sectorSize));
      chunks.push(slice);
      total += slice.length;
      if (streamSize !== null && total >= streamSize) break;
      sec = fat[sec] !== undefined ? fat[sec] : 0xfffffffe;
    }
    const finalLen = streamSize !== null ? Math.min(total, streamSize) : total;
    const out = new Uint8Array(finalLen);
    let pos = 0;
    for (const c of chunks) {
      const take = Math.min(c.length, finalLen - pos);
      if (take <= 0) break;
      out.set(c.subarray(0, take), pos);
      pos += take;
    }
    return out;
  };

  const dirStream = readRegularStream(firstDirSector);
  const dirDv = new DataView(dirStream.buffer, dirStream.byteOffset, dirStream.byteLength);
  const numDirs = Math.floor(dirStream.length / 128);
  const dirs = [];

  for (let i = 0; i < numDirs; i++) {
    const base = i * 128;
    const nameByteLen = dirDv.getUint16(base + 64, true);
    const objType = dirStream[base + 66];
    if (objType === 0 || nameByteLen < 2) {
      dirs.push(null);
      continue;
    }
    const charCount = (nameByteLen >>> 1) - 1;
    let name = '';
    for (let c = 0; c < charCount; c++) {
      name += String.fromCharCode(dirDv.getUint16(base + c * 2, true));
    }
    const leftId = dirDv.getUint32(base + 68, true);
    const rightId = dirDv.getUint32(base + 72, true);
    const childId = dirDv.getUint32(base + 76, true);
    const startSec = dirDv.getUint32(base + 116, true);
    const sizeLow = dirDv.getUint32(base + 120, true);
    dirs.push({ id: i, name, objType, leftId, rightId, childId, startSec, size: sizeLow });
  }

  let miniFat = new Uint32Array(0);
  if (numMiniFatSectors > 0 && firstMiniFatSector < 0xfffffffe) {
    const mfBytes = readRegularStream(firstMiniFatSector, numMiniFatSectors * sectorSize);
    miniFat = new Uint32Array(mfBytes.buffer, mfBytes.byteOffset, mfBytes.byteLength >>> 2);
  }

  const rootEntry = dirs[0];
  const miniStreamBytes =
    rootEntry && rootEntry.startSec < 0xfffffffe && rootEntry.size > 0
      ? readRegularStream(rootEntry.startSec, rootEntry.size)
      : new Uint8Array(0);

  const readEntryBytes = (entry) => {
    if (!entry || entry.size === 0) return new Uint8Array(0);
    if (entry.size < miniStreamCutoff && miniStreamBytes.length > 0) {
      const out = new Uint8Array(entry.size);
      let pos = 0;
      let mSec = entry.startSec;
      const visited = new Set();
      while (mSec < 0xfffffffe && pos < entry.size && !visited.has(mSec)) {
        visited.add(mSec);
        const off = mSec * miniSectorSize;
        const take = Math.min(miniSectorSize, entry.size - pos, Math.max(0, miniStreamBytes.length - off));
        if (take <= 0) break;
        out.set(miniStreamBytes.subarray(off, off + take), pos);
        pos += take;
        mSec = miniFat[mSec] !== undefined ? miniFat[mSec] : 0xfffffffe;
      }
      return out;
    }
    return readRegularStream(entry.startSec, entry.size);
  };

  let isCompressed = true;
  const fileHeaderEntry = dirs.find((d) => d && d.name === 'FileHeader');
  if (fileHeaderEntry) {
    const fh = readEntryBytes(fileHeaderEntry);
    if (fh.length >= 40) {
      const flags = new DataView(fh.buffer, fh.byteOffset, fh.byteLength).getUint32(36, true);
      isCompressed = (flags & 1) !== 0;
    }
  }

  const sectionEntries = dirs
    .filter((d) => d && d.objType === 2 && /^Section\d+$/i.test(d.name))
    .sort((a, b) => {
      const na = parseInt(a.name.replace(/\D+/g, ''), 10) || 0;
      const nb = parseInt(b.name.replace(/\D+/g, ''), 10) || 0;
      return na - nb;
    });

  const allSectionTexts = [];
  for (const secEntry of sectionEntries) {
    let rawBytes = readEntryBytes(secEntry);
    if (isCompressed && rawBytes.length > 0) {
      try {
        rawBytes = await inflateRawBytesPureJs(rawBytes);
      } catch (e) {}
    }
    const text = parseHwpSectionRecordsPureJs(rawBytes);
    if (text) allSectionTexts.push(text);
  }
  return allSectionTexts.join('\n\n');
}

async function extractDocumentTextPureJs(fileName, arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const ext = String(fileName || '').toLowerCase().split('.').pop();
  if (ext === 'docx') return await extractDocxTextPureJs(u8);
  if (ext === 'hwpx') return await extractHwpxTextPureJs(u8);
  if (ext === 'hwp') return await extractHwpV5TextPureJs(u8);
  return new TextDecoder('utf-8').decode(u8);
}

function normForNasMatch(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\.(?:hwp|hwpx|docx|doc|md|pdf|txt)$/i, '')
    .replace(/[\s_\-.,()\[\]~:'"“”‘’!]+/g, '');
}

function parseNasCourseFolder(folderName) {
  const m = String(folderName).match(/^(?:(\d+)\.\s*)?([^_]+?)(?:\s*_\s*(.+))?$/);
  const courseNum = m && m[1] ? parseInt(m[1], 10) : null;
  const courseTitle = m && m[2] ? m[2].trim() : folderName;
  const instructor = m && m[3] ? m[3].replace(/목사님|목사|[pP]$/g, '').trim() : '';
  let bookInfo = null;
  if (courseNum && courseNum >= 1 && courseNum <= 66) {
    const found = BOOKS.find((b) => b[0] === courseNum);
    if (found) bookInfo = { no: found[0], num: String(found[0]).padStart(2, '0'), full: found[1], short: found[2] };
  }
  if (!bookInfo && BOOK_LOOKUP.has(courseTitle)) {
    bookInfo = BOOK_LOOKUP.get(courseTitle);
  }
  return { courseNum, courseTitle, instructor, bookInfo };
}

function formatKstDateDot(mtimeSec) {
  const kstMs = (Number(mtimeSec) || Math.floor(Date.now() / 1000)) * 1000 + 9 * 3600 * 1000;
  const iso = new Date(kstMs).toISOString().slice(0, 10);
  return iso.replace(/-/g, '.');
}

function findFirstBibleRefInManuscript(rawBaseTitle, extractedText, courseMeta) {
  const cleanText = String(extractedText || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n');

  const chVerseRegex = new RegExp(
    `(?:^|[\\s(\\[“"‘'])` +
      `(${BOOK_REGEX_STR})\\s*(\\d{1,3})\\s*(?:장\\s*|:\\s*)(\\d{1,3})(?:\\s*[-~,]\\s*(\\d{1,3}))?\\s*절?`,
    'm'
  );
  const titleChOnlyRegex = new RegExp(`(${BOOK_REGEX_STR})\\s*(\\d{1,3})\\s*(?:장|편)?(?=\\s|_|-|\\)|$)`);

  const titleCvMatch = rawBaseTitle.match(chVerseRegex);
  if (titleCvMatch) {
    const bInfo = BOOK_LOOKUP.get(titleCvMatch[1]);
    if (bInfo) {
      const ch = titleCvMatch[2];
      const v1 = titleCvMatch[3];
      const v2 = titleCvMatch[4];
      return { ...bInfo, refStr: v2 ? `${ch}_${v1}-${v2}` : `${ch}_${v1}` };
    }
  }

  const titleChMatch = rawBaseTitle.match(titleChOnlyRegex);
  if (titleChMatch) {
    const bInfo = BOOK_LOOKUP.get(titleChMatch[1]);
    const targetCh = titleChMatch[2];
    if (bInfo) {
      const opening = cleanText.slice(0, 1200);
      const specificRegex = new RegExp(
        `(?:${bInfo.full}|${bInfo.short})\\s*${targetCh}\\s*(?:장\\s*|:)\\s*(\\d{1,3})(?:\\s*[-~,]\\s*(\\d{1,3}))?`
      );
      const specMatch = opening.match(specificRegex);
      if (specMatch) {
        const v1 = specMatch[1];
        const v2 = specMatch[2];
        return { ...bInfo, refStr: v2 ? `${targetCh}_${v1}-${v2}` : `${targetCh}_${v1}` };
      }
      return { ...bInfo, refStr: `${targetCh}` };
    }
  }

  const bodyCvMatch = cleanText.match(chVerseRegex);
  if (bodyCvMatch) {
    const bInfo = BOOK_LOOKUP.get(bodyCvMatch[1]);
    if (bInfo) {
      const ch = bodyCvMatch[2];
      const v1 = bodyCvMatch[3];
      const v2 = bodyCvMatch[4];
      return { ...bInfo, refStr: v2 ? `${ch}_${v1}-${v2}` : `${ch}_${v1}` };
    }
  }

  if (courseMeta.bookInfo) {
    const fallbackCh = cleanText.slice(0, 1500).match(titleChOnlyRegex);
    if (fallbackCh) {
      const bInfo = BOOK_LOOKUP.get(fallbackCh[1]) || courseMeta.bookInfo;
      return { ...bInfo, refStr: `${fallbackCh[2]}` };
    }
    return { ...courseMeta.bookInfo, refStr: '0' };
  }
  return null;
}

function buildTargetNasMdPlacement(nasFileName, courseMeta, extractedText, mtimeSec) {
  const rawBase = nasFileName.replace(/\.(?:hwp|hwpx|docx|doc)$/i, '').trim();
  const instrTag = courseMeta.instructor ? `${courseMeta.instructor}p` : '';
  const dateTag = formatKstDateDot(mtimeSec);
  const ct = String(courseMeta.courseTitle || '');

  // 1. Check special thematic folders under "02 성경 연구"
  if (ct.includes('성경 해석의 원칙') || rawBase.includes('성경 해석의 원칙')) {
    const parts = ['ths', instrTag, rawBase, dateTag].filter(Boolean);
    const fileName = parts.join(' ').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() + '.md';
    return { folder: '02 성경 연구/01 주제/성경 해석의 원칙 - 신용철P', fileName };
  }
  if (ct.includes('교사 교육') || rawBase.includes('교사 교육')) {
    const parts = ['ths', instrTag, rawBase, dateTag].filter(Boolean);
    const fileName = parts.join(' ').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() + '.md';
    return { folder: '02 성경 연구/01 주제/교사 교육 - 오세일p', fileName };
  }
  if (ct.includes('바른 구원관') || rawBase.includes('바른 구원관')) {
    const parts = ['ths', instrTag, rawBase, dateTag].filter(Boolean);
    const fileName = parts.join(' ').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() + '.md';
    return { folder: '02 성경 연구/01 주제/바른 구원관(서도석P)', fileName };
  }
  if (ct.includes('그리스도인의 4단계 훈련')) {
    const parts = ['ths', instrTag, rawBase, dateTag].filter(Boolean);
    const fileName = parts.join(' ').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() + '.md';
    return { folder: '02 성경 연구/01 주제/그리스도인의 4단계 훈련 - 서도석P', fileName };
  }
  if (ct.includes('성경지명') || rawBase.includes('성경지명과 사건')) {
    const fileName = rawBase.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() + '.md';
    return { folder: '02 성경 연구/03 지역', fileName };
  }

  // 2. Find the first Bible reference in the manuscript
  const firstRef = findFirstBibleRefInManuscript(rawBase, extractedText, courseMeta);
  let displayTitle = rawBase;
  if (courseMeta.bookInfo) {
    const bookFull = courseMeta.bookInfo.full;
    if (!rawBase.includes(bookFull)) {
      displayTitle = `${bookFull} ${rawBase}`;
    }
  }

  let fileName = '';
  if (firstRef) {
    const prefix = `${firstRef.num} ${firstRef.short} ${firstRef.refStr}`;
    const parts = [prefix, 'ths', instrTag, displayTitle, dateTag].filter(Boolean);
    fileName = parts.join(' ').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() + '.md';
  } else {
    const parts = ['ths', instrTag, displayTitle, dateTag].filter(Boolean);
    fileName = parts.join(' ').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() + '.md';
  }

  // 3. Determine target folder in 03 구약, 04 신약, or 02 성경 연구
  if (ct.includes('성경의 탐구')) {
    return { folder: '02 성경 연구/01 주제/성경의 탐구 - 서도석P', fileName };
  }
  if (ct.includes('주제별 성경연구')) {
    return { folder: '02 성경 연구/01 주제/주제별 성경연구_변인교', fileName };
  }
  if (ct.includes('성경인물') || ct.includes('인물연구')) {
    return { folder: '02 성경 연구/02 인물', fileName };
  }

  const targetBook = firstRef || courseMeta.bookInfo;
  if (targetBook && targetBook.no >= 1 && targetBook.no <= 39) {
    return { folder: `03 구약/${targetBook.num} ${targetBook.full}`, fileName };
  }
  if (targetBook && targetBook.no >= 40 && targetBook.no <= 66) {
    return { folder: `04 신약/${targetBook.num} ${targetBook.full}`, fileName };
  }

  if (ct.includes('조직신학')) {
    return { folder: '02 성경 연구/01 주제/성경을 중심으로 한 조직신학_홍정현P', fileName };
  }
  return { folder: '02 성경 연구/01 주제', fileName };
}

function formatNasSeminaryMarkdown(rawText, nasFileName, courseMeta) {
  const rawBase = nasFileName.replace(/\.(?:hwp|hwpx|docx|doc)$/i, '').trim();
  let text = String(rawText || '').replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ').trim();

  const lines = text.split('\n').map((l) => l.trimEnd());
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      continue;
    }

    if (
      /^(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]|[IVX]+|\d{1,2})\.\s+[가-힣A-Za-z0-9]/.test(line) &&
      line.length <= 72 &&
      !/[.?!]$/.test(line)
    ) {
      formattedLines.push('');
      formattedLines.push(`# ${line}`);
      formattedLines.push('');
      continue;
    }

    if (/^(?:\(\d{1,2}\)|\d{1,2}\)|[가-하]\.)\s+[가-힣A-Za-z0-9]/.test(line) && line.length <= 72) {
      formattedLines.push('');
      formattedLines.push(`## ${line}`);
      formattedLines.push('');
      continue;
    }

    line = line.replace(/^-\.\s+/, '- ').replace(/\s+-\.\s+/g, '\n- ');
    formattedLines.push(line);
  }

  let body = formattedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!body.startsWith('# ')) {
    body = `# ${rawBase}\n\n${body}`;
  }

  const fmLines = ['---', 'vmark: false'];
  if (courseMeta.instructor) fmLines.push(`강사: ${courseMeta.instructor}P`);
  if (courseMeta.courseTitle) fmLines.push(`과목: ${courseMeta.courseTitle}`);
  fmLines.push('---');

  return `${fmLines.join('\n')}\n${body}\n`;
}

function parseSearchQuery(rawQuery, aiPlan = null) {
  const q = String(rawQuery || '').trim();
  const bibleRefs = [];
  const expandedTerms = new Set();
  const bookFilters = new Set();
  const preachers = new Set();

  const combinedRefText = [q, ...(aiPlan?.bibleRefs || [])].join(' ');

  const refRegex = new RegExp(
    `(${BOOK_REGEX_STR})\\s*(?:제\\s*)?(\\d{1,3})(?:\\s*(?:장|:\\s*|_)\\s*(?:(\\d{1,3})(?:\\s*[-~]\\s*(\\d{1,3}))?\\s*절?)?|(?=\\s|$|[,.)]))`,
    'g'
  );
  let m;
  let queryWithoutRefs = q;
  while ((m = refRegex.exec(combinedRefText)) !== null) {
    const bookRaw = m[1];
    const ch = parseInt(m[2], 10);
    const vStart = m[3] ? parseInt(m[3], 10) : null;
    const vEnd = m[4] ? parseInt(m[4], 10) : null;
    const bInfo = BOOK_LOOKUP.get(bookRaw);
    if (bInfo && ch > 0) {
      bibleRefs.push({ bInfo, ch, vStart, vEnd, raw: m[0].trim() });
      bookFilters.add(bInfo.full);
      bookFilters.add(bInfo.short);
      bookFilters.add(`${bInfo.num} ${bInfo.full}`);
      bookFilters.add(`${bInfo.num} ${bInfo.short}`);

      expandedTerms.add(`${bInfo.short} ${ch}_`);
      expandedTerms.add(`${bInfo.short} ${ch}:`);
      expandedTerms.add(`${bInfo.short} ${ch} `);
      expandedTerms.add(`${bInfo.full} ${ch}장`);
      if (vStart !== null) {
        expandedTerms.add(`${bInfo.short} ${ch}:${vStart}`);
        expandedTerms.add(`${bInfo.short} ${ch}_${vStart}`);
        expandedTerms.add(`${ch}:${vStart}`);
        expandedTerms.add(`${ch}_${vStart}`);
      }
      queryWithoutRefs = queryWithoutRefs.replace(m[0], ' ');
    }
  }

  const qLower = q.toLowerCase();
  for (const concept of BIBLICAL_CONCEPT_MAP) {
    if (concept.triggers.some((trig) => qLower.includes(trig.toLowerCase()))) {
      for (const r of concept.refs) {
        const subMatch = new RegExp(`^(${BOOK_REGEX_STR})\\s*(\\d{1,3})(?::(\\d{1,3}))?$`).exec(r.trim());
        if (subMatch) {
          const bInfo = BOOK_LOOKUP.get(subMatch[1]);
          const ch = parseInt(subMatch[2], 10);
          const v = subMatch[3] ? parseInt(subMatch[3], 10) : null;
          if (bInfo) {
            if (!bibleRefs.some((br) => br.bInfo.no === bInfo.no && br.ch === ch)) {
              bibleRefs.push({ bInfo, ch, vStart: v, vEnd: null, raw: r });
            }
            bookFilters.add(bInfo.full);
            bookFilters.add(bInfo.short);
            bookFilters.add(`${bInfo.num} ${bInfo.full}`);
            bookFilters.add(`${bInfo.num} ${bInfo.short}`);
            expandedTerms.add(`${bInfo.short} ${ch}_`);
            expandedTerms.add(`${bInfo.short} ${ch}:`);
            if (v !== null) {
              expandedTerms.add(`${bInfo.short} ${ch}:${v}`);
              expandedTerms.add(`${bInfo.short} ${ch}_${v}`);
            }
          }
        }
      }
      for (const t of concept.terms) {
        expandedTerms.add(t);
      }
    }
  }

  const standaloneBookRegex = new RegExp(`(?:^|[\\s(])(${BOOK_REGEX_STR})(?=[\\s).,?!]|에|의|을|를|은|는|에서|$)`, 'g');
  while ((m = standaloneBookRegex.exec(queryWithoutRefs)) !== null) {
    const bookRaw = m[1];
    if (bookRaw.length === 1 && !['창', '출', '롬', '행', '마', '막', '눅', '요', '시', '잠', '히', '계', '엡', '갈', '빌', '골', '약'].includes(bookRaw)) {
      continue;
    }
    const bInfo = BOOK_LOOKUP.get(bookRaw);
    if (bInfo) {
      bookFilters.add(bInfo.full);
      bookFilters.add(bInfo.short);
      bookFilters.add(`${bInfo.num} ${bInfo.full}`);
      bookFilters.add(`${bInfo.num} ${bInfo.short}`);
    }
  }

  const preacherRegex = /([가-힣]{2,4})\s*(?:목사님|목사|전도인|강사님|강사|[pP]\b)/g;
  while ((m = preacherRegex.exec(q)) !== null) {
    const name = m[1].trim();
    if (!STOP_WORDS.has(name) && !BOOK_LOOKUP.has(name)) {
      preachers.add(name);
    }
  }
  const knownPreachers = ['이요한', '홍정현', '서도석', '신용철', '박옥수', '스펄전', '김용대'];
  for (const kp of knownPreachers) {
    if (q.includes(kp)) preachers.add(kp);
  }
  if (aiPlan && Array.isArray(aiPlan.preachers)) {
    for (const p of aiPlan.preachers) {
      const cleanP = String(p || '').replace(/(?:목사님|목사|전도인|강사|[pP])$/g, '').trim();
      if (cleanP.length >= 2) preachers.add(cleanP);
    }
  }

  // Extract explicit Strong's codes like G26, H2617
  const strongCodes = [];
  const strongMatches = q.match(/\b([GHgh]\d{1,4})\b/g);
  if (strongMatches) {
    for (const sc of strongMatches) strongCodes.push(sc.toUpperCase());
  }

  const rawTokens = queryWithoutRefs
    .replace(/[^\w가-힣:_-]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const keywords = [];
  const seenKw = new Set();

  const addKeyword = (word) => {
    const w = String(word || '').trim();
    if (w.length < 2 || STOP_WORDS.has(w)) return;
    const stripped = w.replace(KOR_PARTICLES, '');
    const candidate = stripped.length >= 2 ? stripped : w;
    if (STOP_WORDS.has(candidate)) return;
    if (BOOK_LOOKUP.has(candidate) && candidate.length >= 3) return;
    const low = candidate.toLowerCase();
    if (!seenKw.has(low)) {
      seenKw.add(low);
      keywords.push(candidate);
    }
  };

  if (aiPlan && Array.isArray(aiPlan.keywords)) {
    for (const kw of aiPlan.keywords) addKeyword(kw);
  }
  for (const tok of rawTokens) addKeyword(tok);

  const isHeuristicFollowUp =
    /(?:그\s*중에서|그중에서|거기서|거기에|아까|방금|위에서|직전|이전\s*답변|그\s*설교|이\s*설교|첫\s*번째|두\s*번째|세\s*번째|네\s*번째|[1-8]\s*번\s*(?:설교|노트|문서))/.test(q);

  return {
    raw: q,
    isFollowUp: Boolean(aiPlan?.isFollowUp || isHeuristicFollowUp),
    targetNoteOrd: aiPlan?.targetNoteOrd || null,
    bibleRefs,
    bookFilters: Array.from(bookFilters),
    expandedTerms: Array.from(expandedTerms),
    preachers: Array.from(preachers),
    strongCodes,
    keywords
  };
}

function extractBestSnippets(content, parsedQuery, maxChars) {
  const norm = String(content || '').replace(/\r\n/g, '\n');
  if (!norm.trim()) return '';

  const blocks = norm.split(/\n{2,}/);
  const allTerms = [
    ...parsedQuery.expandedTerms,
    ...parsedQuery.keywords,
    ...parsedQuery.preachers
  ].filter(Boolean);

  if (allTerms.length === 0 || norm.length <= maxChars) {
    return norm.slice(0, maxChars);
  }

  const scoredBlocks = blocks.map((blk, idx) => {
    const lower = blk.toLowerCase();
    let score = 0;
    for (const refTerm of parsedQuery.expandedTerms) {
      if (lower.includes(refTerm.toLowerCase())) score += 18;
    }
    for (const kw of parsedQuery.keywords) {
      const kwLow = kw.toLowerCase();
      if (lower.includes(kwLow)) {
        score += 11;
        const parts = lower.split(kwLow);
        if (parts.length > 2) score += Math.min(8, (parts.length - 2) * 2);
      }
    }
    if (blk.startsWith('#')) score += 2;
    if (idx <= 2) score += 1;
    return { idx, blk: blk.trim(), score };
  });

  const topBlocks = scoredBlocks
    .filter((b) => b.score > 0 && b.blk.length > 0)
    .sort((a, b) => b.score - a.score);

  if (topBlocks.length === 0) {
    return norm.slice(0, maxChars);
  }

  const selectedIndices = new Set();
  let currentLen = 0;

  if (blocks[0] && blocks[0].length < 300) {
    selectedIndices.add(0);
    currentLen += blocks[0].length;
  }

  for (const item of topBlocks) {
    if (currentLen >= maxChars) break;
    if (!selectedIndices.has(item.idx)) {
      selectedIndices.add(item.idx);
      currentLen += item.blk.length + 10;
    }
    if (currentLen < maxChars && item.idx + 1 < blocks.length && !selectedIndices.has(item.idx + 1)) {
      const nextBlk = blocks[item.idx + 1].trim();
      if (nextBlk && nextBlk.length < 650) {
        selectedIndices.add(item.idx + 1);
        currentLen += nextBlk.length + 10;
      }
    }
  }

  const orderedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  return orderedIndices.map((i) => blocks[i].trim()).join('\n\n').slice(0, maxChars);
}

class NotePickerModal extends FuzzySuggestModal {
  constructor(app, plugin, onChoose) {
    super(app);
    this.plugin = plugin;
    this.onChoose = onChoose;
    this.setPlaceholder('첨부할 설교문 또는 노트를 검색하세요...');
  }

  getItems() {
    const excluded = this.plugin.getExcludedFolderPrefixes(true);
    return this.app.vault.getMarkdownFiles().filter((f) => {
      for (const prefix of excluded) {
        if (f.path.startsWith(prefix)) return false;
      }
      return true;
    });
  }

  getItemText(file) {
    return file.path.replace(/\.md$/i, '');
  }

  onChooseItem(file) {
    if (this.onChoose) this.onChoose(file);
  }
}

class SermonVaultAIView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.folderScope = plugin.settings.searchFolderScope || '';
    this.attachedFiles = [];
    this.pinnedSelection = '';
    this.isGenerating = false;
  }

  getViewType() {
    return VIEW_TYPE_VAULT_AI;
  }

  getDisplayText() {
    return '제미나이 설교·볼트 AI';
  }

  getIcon() {
    return 'sparkles';
  }

  async onOpen() {
    this.renderView();
  }

  async onClose() {}

  setPinnedSelection(text, sourceFile) {
    this.pinnedSelection = String(text || '').trim();
    if (sourceFile && !this.attachedFiles.some((f) => f.path === sourceFile.path)) {
      this.attachedFiles.push(sourceFile);
    }
    this.renderView();
    if (this.inputEl) this.inputEl.focus();
  }

  applyFontSizeVars() {
    if (!this.rootEl) return;
    const bSize = Math.max(11, Math.min(28, Number(this.plugin.settings.bodyFontSize) || 15));
    const hMain = Math.round(bSize * 1.30);
    const hSub = Math.round(bSize * 1.15);

    this.rootEl.style.setProperty('--svai-body-size', `${bSize}px`);
    this.rootEl.style.setProperty('--svai-h-main', `${hMain}px`);
    this.rootEl.style.setProperty('--svai-h-sub', `${hSub}px`);

    if (this.bodySizeValEl) this.bodySizeValEl.textContent = `${bSize}`;
  }

  async adjustFontSize(delta) {
    const cur = Number(this.plugin.settings.bodyFontSize) || 15;
    this.plugin.settings.bodyFontSize = Math.max(11, Math.min(28, cur + delta));
    this.applyFontSizeVars();
    await this.plugin.saveSettings();
  }

  renderView() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('svai-root');
    this.rootEl = container;
    this.applyFontSizeVars();

    // 1. Header Bar
    const header = container.createDiv({ cls: 'svai-header' });
    const titleWrap = header.createDiv({ cls: 'svai-title-wrap' });
    const iconSpan = titleWrap.createSpan({ cls: 'svai-title-icon' });
    setIcon(iconSpan, 'sparkles');
    titleWrap.createSpan({ text: '제미나이 볼트 AI', cls: 'svai-title-text' });

    const headerActions = header.createDiv({ cls: 'svai-header-actions' });

    const modelSelect = headerActions.createEl('select', { cls: 'svai-model-select', attr: { title: 'Gemini 모델 선택' } });
    for (const m of MODEL_OPTIONS) {
      const opt = modelSelect.createEl('option', { value: m.value, text: m.label });
      if (this.plugin.settings.geminiModel === m.value) opt.selected = true;
    }
    modelSelect.addEventListener('change', async () => {
      this.plugin.settings.geminiModel = modelSelect.value;
      await this.plugin.saveSettings();
    });

    const nasSyncBtn = headerActions.createEl('button', {
      cls: 'svai-icon-btn',
      attr: {
        title: 'NAS 신학원 신규 원고 동기화 (9 신학원 원고-완료 → 03 구약 / 04 신약 / 02 성경 연구 자동 배치)',
        'aria-label': '신학원 원고 동기화'
      }
    });
    setIcon(nasSyncBtn, 'folder-down');
    nasSyncBtn.addEventListener('click', () => {
      this.plugin.syncNasSeminaryToNewFolder(false);
    });

    const saveChatBtn = headerActions.createEl('button', {
      cls: 'svai-icon-btn',
      attr: { title: '현재 대화를 새 노트로 저장', 'aria-label': '대화 저장' }
    });
    setIcon(saveChatBtn, 'file-plus');
    saveChatBtn.addEventListener('click', () => this.saveConversationAsNote());

    const clearBtn = headerActions.createEl('button', {
      cls: 'svai-icon-btn',
      attr: { title: '대화 초기화 (새 대화)', 'aria-label': '새 대화' }
    });
    setIcon(clearBtn, 'trash-2');
    clearBtn.addEventListener('click', async () => {
      this.plugin.settings.chatHistory = [];
      this.pinnedSelection = '';
      this.plugin.settings.quotaStats.lastPromptTokens = 0;
      this.plugin.settings.quotaStats.lastOutputTokens = 0;
      await this.plugin.saveSettings();
      this.renderView();
      new Notice('새 대화가 시작되었습니다.');
    });

    // 2. Context Bar: Folder Scope + [☑ 스트롱] [☑ 주석] Checkboxes + Font Stepper
    const contextBar = container.createDiv({ cls: 'svai-context-bar' });
    const topCtrlRow = contextBar.createDiv({ cls: 'svai-top-ctrl-row' });

    const folderWrap = topCtrlRow.createDiv({ cls: 'svai-folder-wrap' });
    const folderSelect = folderWrap.createEl('select', { cls: 'svai-folder-select', attr: { title: '설교·노트 검색 범위' } });
    folderSelect.createEl('option', { value: '', text: '📂 볼트 전체 검색' });
    const topFolders = this.plugin.getTopLevelContentFolders();
    for (const folder of topFolders) {
      const opt = folderSelect.createEl('option', { value: folder, text: `📁 ${folder}` });
      if (this.folderScope === folder) opt.selected = true;
    }
    folderSelect.addEventListener('change', async () => {
      this.folderScope = folderSelect.value;
      this.plugin.settings.searchFolderScope = this.folderScope;
      await this.plugin.saveSettings();
    });

    // Inline Checkboxes for Strong's Lexicon & Commentaries right next to Folder Scope
    const checkGroup = topCtrlRow.createDiv({ cls: 'svai-check-group' });

    const strongLabel = checkGroup.createEl('label', {
      cls: `svai-check-pill ${this.plugin.settings.includeStrong ? 'is-checked' : ''}`,
      attr: { title: '체크 시 히브리어·헬라어 스트롱 원어사전(_strong_json)도 함께 검색합니다.' }
    });
    const strongCb = strongLabel.createEl('input', { type: 'checkbox' });
    strongCb.checked = Boolean(this.plugin.settings.includeStrong);
    strongLabel.createSpan({ text: '스트롱' });
    strongCb.addEventListener('change', async () => {
      this.plugin.settings.includeStrong = strongCb.checked;
      strongLabel.toggleClass('is-checked', strongCb.checked);
      await this.plugin.saveSettings();
    });

    const commLabel = checkGroup.createEl('label', {
      cls: `svai-check-pill ${this.plugin.settings.includeCommentary ? 'is-checked' : ''}`,
      attr: { title: '체크 시 주석·강해(그랜드·호크마·매튜헨리·스펄전 전집 등)도 함께 검색합니다.' }
    });
    const commCb = commLabel.createEl('input', { type: 'checkbox' });
    commCb.checked = Boolean(this.plugin.settings.includeCommentary);
    commLabel.createSpan({ text: '주석' });
    commCb.addEventListener('change', async () => {
      this.plugin.settings.includeCommentary = commCb.checked;
      commLabel.toggleClass('is-checked', commCb.checked);
      await this.plugin.saveSettings();
    });

    // Single Font Size Stepper
    const fontStepper = topCtrlRow.createDiv({ cls: 'svai-font-stepper', attr: { title: '글자 크기 조절 (대제목·소제목·본문 비례 적용)' } });
    fontStepper.createSpan({ cls: 'svai-font-label', text: '글자' });
    const bMinus = fontStepper.createEl('button', { cls: 'svai-step-btn', text: '−' });
    this.bodySizeValEl = fontStepper.createSpan({
      cls: 'svai-font-val',
      text: `${this.plugin.settings.bodyFontSize || 15}`
    });
    const bPlus = fontStepper.createEl('button', { cls: 'svai-step-btn', text: '+' });
    bMinus.addEventListener('click', () => this.adjustFontSize(-1));
    bPlus.addEventListener('click', () => this.adjustFontSize(1));

    const attachRow = contextBar.createDiv({ cls: 'svai-attach-row' });
    const addNoteBtn = attachRow.createEl('button', {
      cls: 'svai-attach-btn',
      text: '+ 노트 직접 첨부'
    });
    addNoteBtn.addEventListener('click', () => {
      new NotePickerModal(this.app, this.plugin, (file) => {
        if (!this.attachedFiles.some((f) => f.path === file.path)) {
          this.attachedFiles.push(file);
          this.renderView();
        }
      }).open();
    });

    for (const file of this.attachedFiles) {
      const chip = attachRow.createDiv({ cls: 'svai-chip' });
      const linkSpan = chip.createSpan({ text: `📎 ${file.basename}`, cls: 'svai-chip-link' });
      linkSpan.addEventListener('click', () => {
        this.app.workspace.openLinkText(file.path, '', false);
      });
      const rmBtn = chip.createSpan({ text: '×', cls: 'svai-chip-remove' });
      rmBtn.addEventListener('click', () => {
        this.attachedFiles = this.attachedFiles.filter((f) => f.path !== file.path);
        this.renderView();
      });
    }

    if (this.pinnedSelection) {
      const selBox = contextBar.createDiv({ cls: 'svai-pinned-selection' });
      const selHead = selBox.createDiv({ cls: 'svai-pinned-head' });
      selHead.createSpan({ text: `✂️ 선택된 본문 (${this.pinnedSelection.length}자)` });
      const selClear = selHead.createEl('button', { text: '해제', cls: 'svai-mini-btn' });
      selClear.addEventListener('click', () => {
        this.pinnedSelection = '';
        this.renderView();
      });
      selBox.createDiv({
        cls: 'svai-pinned-preview',
        text: this.pinnedSelection.length > 140 ? this.pinnedSelection.slice(0, 140) + '...' : this.pinnedSelection
      });
    }

    // 3. Messages Area
    this.messagesEl = container.createDiv({ cls: 'svai-messages' });
    this.renderMessages();

    // 4. Question Input Area
    const inputWrap = container.createDiv({ cls: 'svai-input-wrap' });
    this.inputEl = inputWrap.createEl('textarea', {
      cls: 'svai-textarea',
      attr: {
        rows: '3',
        placeholder: '편하게 물어보세요 (예: "수가성 여인 설교 찾아줘", "그 중에서 두 번째 설교 더 자세히 알려줘")'
      }
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter' && !e.shiftKey && !Platform.isMobile) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    const sendRow = inputWrap.createDiv({ cls: 'svai-send-row' });
    const hintText = Platform.isMobile
      ? '터치하여 질문 전송 · 후속 질문 지원'
      : 'Enter 전송 · Shift+Enter 줄바꿈 · 후속 대화 맥락 자동 유지';
    sendRow.createSpan({ text: hintText, cls: 'svai-input-hint' });

    this.sendBtn = sendRow.createEl('button', {
      cls: 'svai-send-btn mod-cta',
      text: this.isGenerating ? '생성 중...' : '전송'
    });
    if (this.isGenerating) this.sendBtn.disabled = true;
    this.sendBtn.addEventListener('click', () => this.handleSendMessage());

    // 5. Compact Token & API Quota Gauge Bar (Below Question Input)
    this.gaugeContainer = container.createDiv({ cls: 'svai-gauge-panel' });
    this.renderGaugeBar();
  }

  renderGaugeBar() {
    if (!this.gaugeContainer) return;
    this.gaugeContainer.empty();

    this.plugin.ensureQuotaDayCurrent();
    const stats = this.plugin.settings.quotaStats;
    const allKeys = this.plugin.getAvailableApiKeys();
    const totalKeys = allKeys.length;
    const exhaustedSet = new Set(stats.exhaustedKeys || []);
    const activeKeysCount = allKeys.filter((k) => !exhaustedSet.has(k)).length;

    const perKeyLimit = Math.max(10, Number(this.plugin.settings.dailyQuotaPerKey) || 25);
    const totalDailyCapacity = Math.max(1, totalKeys * perKeyLimit);
    const usedReqs = stats.requestsToday || 0;

    const keyRatio = totalKeys > 0 ? activeKeysCount / totalKeys : 0;
    const reqRemainRatio = Math.max(0, (totalDailyCapacity - usedReqs) / totalDailyCapacity);
    const dailyRemainPct = totalKeys === 0 ? 0 : Math.round(Math.min(keyRatio, reqRemainRatio) * 100);

    const lastTotalPrompt = stats.lastPromptTokens || 0;
    const lastOutput = stats.lastOutputTokens || 0;
    const lastTurnTokens = lastTotalPrompt + lastOutput;
    const ctxRemainPct = Math.max(
      0,
      Math.min(100, Math.round(((CONTEXT_WINDOW_LIMIT - lastTurnTokens) / CONTEXT_WINDOW_LIMIT) * 1000) / 10)
    );
    const todayTotalTokens = (stats.promptTokensToday || 0) + (stats.outputTokensToday || 0);

    const quotaColorCls = dailyRemainPct > 50 ? 'is-good' : dailyRemainPct > 20 ? 'is-warn' : 'is-low';
    const ctxColorCls = ctxRemainPct > 50 ? 'is-good' : ctxRemainPct > 20 ? 'is-warn' : 'is-low';

    const grid = this.gaugeContainer.createDiv({ cls: 'svai-gauge-grid' });

    const col1 = grid.createDiv({ cls: 'svai-gauge-col' });
    const info1 = col1.createDiv({ cls: 'svai-gauge-info' });
    info1.createSpan({ cls: 'svai-gauge-label', text: `🔑 API 잔량 ${dailyRemainPct}%` });
    const right1 = info1.createDiv({ cls: 'svai-gauge-right' });
    right1.createSpan({
      cls: 'svai-gauge-meta',
      text: `키 ${activeKeysCount}/${totalKeys} · ${usedReqs}회`
    });
    if (exhaustedSet.size > 0) {
      const resetKeyBtn = right1.createEl('button', {
        cls: 'svai-gauge-reset-btn',
        text: '초기화',
        attr: { title: '소진 표시된 API 키 상태를 초기화합니다.' }
      });
      resetKeyBtn.addEventListener('click', async () => {
        this.plugin.settings.quotaStats.exhaustedKeys = [];
        await this.plugin.saveSettings();
        this.renderGaugeBar();
        new Notice('API 키 상태가 초기화되었습니다.');
      });
    }
    const bar1 = col1.createDiv({ cls: 'svai-gauge-track' });
    bar1.createDiv({
      cls: `svai-gauge-fill ${quotaColorCls}`,
      attr: { style: `width: ${Math.max(2, dailyRemainPct)}%;` }
    });

    const col2 = grid.createDiv({ cls: 'svai-gauge-col' });
    const info2 = col2.createDiv({ cls: 'svai-gauge-info' });
    info2.createSpan({ cls: 'svai-gauge-label', text: `🪙 토큰 여유 ${ctxRemainPct}%` });
    info2.createSpan({
      cls: 'svai-gauge-meta',
      text: `누적 ${todayTotalTokens.toLocaleString()} tok`
    });
    const bar2 = col2.createDiv({ cls: 'svai-gauge-track' });
    bar2.createDiv({
      cls: `svai-gauge-fill ${ctxColorCls}`,
      attr: { style: `width: ${Math.max(4, ctxRemainPct)}%;` }
    });
  }

  renderMessages() {
    if (!this.messagesEl) return;
    this.messagesEl.empty();

    const history = this.plugin.settings.chatHistory || [];
    if (history.length === 0) {
      const emptyBox = this.messagesEl.createDiv({ cls: 'svai-empty-state' });
      emptyBox.createEl('div', { cls: 'svai-empty-title', text: '✨ 제미나이 설교·볼트 AI' });
      emptyBox.createEl('p', {
        cls: 'svai-empty-desc',
        text:
          '정확한 성경 장·절이나 파일명을 몰라도 일상적인 말로 물어보시면 질문 의도와 성경 사건·비유를 파악해 볼트 내 설교문을 찾아 정리합니다.'
      });
      const tips = emptyBox.createEl('ul', { cls: 'svai-empty-tips' });
      tips.createEl('li', { text: '일상어 질문: "우물가에서 남편 다섯 있던 여인 설교 찾아줘"' });
      tips.createEl('li', { text: '후속 대화: "그 중에서 두 번째 설교 예화만 더 자세히 알려줘"' });
      tips.createEl('li', { text: '상단 [스트롱] / [주석]을 체크하면 원어사전과 주석(그랜드·호크마·스펄전 등)까지 함께 검색합니다.' });
      return;
    }

    for (let i = 0; i < history.length; i++) {
      const msg = history[i];
      const msgBox = this.messagesEl.createDiv({
        cls: `svai-msg ${msg.role === 'user' ? 'svai-msg-user' : 'svai-msg-assistant'}`
      });

      const metaRow = msgBox.createDiv({ cls: 'svai-msg-meta' });
      metaRow.createSpan({
        cls: 'svai-msg-author',
        text: msg.role === 'user' ? '🙋‍♂️ 질문' : `✨ Gemini (${msg.model || this.plugin.settings.geminiModel})`
      });

      const metaBadges = metaRow.createDiv({ cls: 'svai-msg-badges' });
      if (msg.tokenInfo) {
        metaBadges.createSpan({
          cls: 'svai-msg-token-badge',
          text: `🪙 ${msg.tokenInfo.total.toLocaleString()} tok`
        });
      }

      if (msg.sources && msg.sources.length > 0) {
        const srcWrap = msgBox.createDiv({ cls: 'svai-sources-box' });
        srcWrap.createDiv({
          cls: 'svai-sources-title',
          text: `📚 참조한 볼트 설교·노트 (${msg.sources.length}건 — 클릭/터치하면 열림)`
        });
        const srcList = srcWrap.createDiv({ cls: 'svai-sources-list' });
        msg.sources.forEach((src, idx) => {
          const card = srcList.createEl('button', {
            cls: 'svai-source-card',
            attr: { title: `${src.path || src.basename}\n클릭하여 열기` }
          });
          card.createSpan({ cls: 'svai-source-name', text: `${idx + 1}. 📄 ${src.basename}` });
          if (src.folder) {
            card.createSpan({ cls: 'svai-source-folder', text: src.folder });
          }
          card.addEventListener('click', () => {
            if (src.path && !src.isVirtual) {
              this.app.workspace.openLinkText(src.path, '', false);
            } else {
              new Notice(src.basename);
            }
          });
        });
      }

      const bodyEl = msgBox.createDiv({ cls: 'svai-msg-body' });
      const activeFile = this.app.workspace.getActiveFile();
      const sourcePath = activeFile ? activeFile.path : '';
      const displayMarkdown = msg.role === 'assistant' ? formatEditorialMarkdown(msg.content || '') : (msg.content || '');
      MarkdownRenderer.render(this.app, displayMarkdown, bodyEl, sourcePath, this);

      bodyEl.querySelectorAll('a.internal-link').forEach((linkEl) => {
        linkEl.addEventListener('click', (evt) => {
          evt.preventDefault();
          const href = linkEl.getAttribute('data-href') || linkEl.getAttribute('href') || linkEl.textContent;
          if (href) {
            this.app.workspace.openLinkText(href, sourcePath, evt.ctrlKey || evt.metaKey);
          }
        });
      });

      if (msg.role === 'assistant') {
        const actRow = msgBox.createDiv({ cls: 'svai-msg-actions' });

        const copyBtn = actRow.createEl('button', { cls: 'svai-act-btn', text: '📋 복사' });
        copyBtn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(displayMarkdown);
          new Notice('답변이 클립보드에 복사되었습니다.');
        });

        const insertBtn = actRow.createEl('button', { cls: 'svai-act-btn', text: '📥 현재 노트에 삽입' });
        insertBtn.addEventListener('click', () => {
          this.plugin.insertTextToActiveEditor(displayMarkdown);
        });

        const newNoteBtn = actRow.createEl('button', { cls: 'svai-act-btn', text: '📝 새 노트로 저장' });
        newNoteBtn.addEventListener('click', () => {
          const prevUserMsg = i > 0 && history[i - 1].role === 'user' ? history[i - 1].content : '제미나이 답변';
          this.plugin.createNoteFromContent(prevUserMsg, displayMarkdown, msg.sources || []);
        });
      }
    }

    setTimeout(() => {
      if (this.messagesEl) {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }
    }, 30);
  }

  async handleSendMessage(overrideText) {
    if (this.isGenerating) return;
    const userText = overrideText !== undefined ? String(overrideText).trim() : String(this.inputEl?.value || '').trim();
    if (!userText) return;

    if (overrideText === undefined && this.inputEl) {
      this.inputEl.value = '';
    }

    const keys = this.plugin.getAvailableApiKeys();
    if (keys.length === 0) {
      new Notice('제미나이 API 키가 설정되지 않았습니다. 플러그인 설정에서 API 키를 입력해 주세요.');
      return;
    }

    this.isGenerating = true;
    if (this.sendBtn) {
      this.sendBtn.disabled = true;
      this.sendBtn.textContent = '생성 중...';
    }

    const history = this.plugin.settings.chatHistory || [];
    history.push({
      role: 'user',
      content: userText,
      ts: Date.now()
    });
    this.renderMessages();

    const loadingEl = this.messagesEl.createDiv({ cls: 'svai-loading' });
    loadingEl.textContent = '🔍 볼트 내 관련 설교문과 자료를 찾고 제미나이 답변을 작성하고 있습니다...';
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

    try {
      let contextBlocks = [];
      let sources = [];

      let prevSources = [];
      for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].role === 'assistant' && Array.isArray(history[i].sources) && history[i].sources.length > 0) {
          prevSources = history[i].sources;
          break;
        }
      }

      for (const file of this.attachedFiles) {
        try {
          const raw = await this.app.vault.cachedRead(file);
          const snippet = raw.slice(0, this.plugin.settings.maxCharsPerNote * 2);
          contextBlocks.push(`### [첨부 노트: [[${file.basename}]] (경로: ${file.path})]\n${snippet}`);
          sources.push({
            basename: file.basename,
            path: file.path,
            folder: file.parent ? file.parent.path : ''
          });
        } catch (e) {}
      }

      if (this.pinnedSelection) {
        contextBlocks.push(`### [사용자가 에디터에서 선택한 본문]\n${this.pinnedSelection}`);
      }

      let aiPlan = null;
      if (this.plugin.settings.useAiQueryPlanner) {
        aiPlan = await this.plugin.planQueryWithAI(userText, history, prevSources);
      }

      const parsedQuery = parseSearchQuery(userText, aiPlan);

      if (parsedQuery.isFollowUp && prevSources.length > 0) {
        const ord = parsedQuery.targetNoteOrd;
        if (ord && ord >= 1 && ord <= prevSources.length) {
          const targetSrc = prevSources[ord - 1];
          const targetFile = targetSrc.path ? this.app.vault.getAbstractFileByPath(targetSrc.path) : null;
          if (targetFile) {
            const raw = await this.app.vault.cachedRead(targetFile);
            contextBlocks.push(
              `### [사용자가 지목한 직전 ${ord}번 설교 노트 전문: [[${targetFile.basename}]] (경로: ${targetFile.path})]\n${raw.slice(0, 12000)}`
            );
            sources.push(targetSrc);
          }
        } else {
          for (const prevSrc of prevSources.slice(0, 4)) {
            const f = prevSrc.path ? this.app.vault.getAbstractFileByPath(prevSrc.path) : null;
            if (f && !sources.some((s) => s.path === f.path)) {
              const raw = await this.app.vault.cachedRead(f);
              const snippet = extractBestSnippets(raw, parsedQuery, this.plugin.settings.maxCharsPerNote);
              contextBlocks.push(`### [직전 대화 참조 노트: [[${f.basename}]] | 폴더: ${prevSrc.folder}]\n${snippet}`);
              sources.push(prevSrc);
            }
          }
        }
      }

      // Search vault markdown sermon/study notes
      const searchResults = await this.plugin.searchVaultNotes(userText, this.folderScope, parsedQuery);
      for (const item of searchResults) {
        if (sources.some((s) => s.path === item.file.path)) continue;
        if (sources.length >= this.plugin.settings.maxSearchResults) break;
        contextBlocks.push(
          `### [출처 노트 #${sources.length + 1}: [[${item.file.basename}]] | 폴더: ${item.folder} | 설교자/메타: ${item.metaInfo || '없음'}]\n${item.snippet}`
        );
        sources.push({
          basename: item.file.basename,
          path: item.file.path,
          folder: item.folder
        });
      }

      // Optional Checkbox 1: Search Strong's Hebrew/Greek Lexicon (_strong_json/HebGrkKo)
      if (this.plugin.settings.includeStrong) {
        const strongEntries = await this.plugin.searchStrongDictionary(parsedQuery);
        for (const se of strongEntries) {
          contextBlocks.push(`### [스트롱 원어사전 ${se.code}: ${se.head}]\n${se.body}`);
          sources.push({
            basename: `스트롱 원어사전 ${se.code} (${se.head})`,
            path: '',
            folder: '스트롱 원어사전',
            isVirtual: true
          });
        }
      }

      // Optional Checkbox 2: Search Commentary Finder Data (Grand, Hokma, Matthew Henry, etc.)
      if (this.plugin.settings.includeCommentary && parsedQuery.bibleRefs.length > 0) {
        const commExcerpts = await this.plugin.searchCommentaryPluginData(parsedQuery);
        for (const ce of commExcerpts) {
          contextBlocks.push(`### [주석 자료: ${ce.title}]\n${ce.text}`);
          sources.push({
            basename: ce.title,
            path: '',
            folder: '주석 데이터',
            isVirtual: true
          });
        }
      }

      let finalUserPrompt = userText;
      if (contextBlocks.length > 0) {
        finalUserPrompt =
          `다음은 사용자의 옵시디언 볼트에서 찾아낸 설교문·연구 노트 및 참고 자료입니다.\n` +
          `반드시 이 자료들의 내용을 최우선 근거로 삼아 답변하되, 아래 편집 서식을 엄격히 지키세요:\n` +
          `- 대분류는 \`## 1. 대제목\`, 그 하위 구분(소제목)은 들여쓴 불릿이 아니라 반드시 \`### 소제목\`(H3 헤딩)으로 작성하여 본문보다 크게 구분할 것.\n` +
          `- 세부 나열 항목(예: 씨, 씨 뿌리는 자, 밭, 새, 특징, 원인, 결과 등)은 모두 1단계 목록(\`- **항목명**: 내용...\`)으로 작성하여 앞에 말머리(•)가 빠짐없이 붙게 하고, 2중·3중 들여쓰기를 하지 말 것.\n` +
          `- 각 설명 끝에 출처 노트를 \`[[노트제목]]\`으로 표기하되, 답변 맨 아래에 별도의 "출처 노트 링크" 섹션을 중복해서 만들지 말 것.\n\n` +
          `==================== 참고 볼트 자료 (${contextBlocks.length}건) ====================\n\n` +
          contextBlocks.join('\n\n----------------------------------------\n\n') +
          `\n\n====================================================================\n\n` +
          `[사용자 질문]: ${userText}`;
      }

      const recentTurns = history
        .slice(Math.max(0, history.length - 9), history.length - 1)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '').slice(0, 3500) }]
        }));

      recentTurns.push({
        role: 'user',
        parts: [{ text: finalUserPrompt }]
      });

      const res = await this.plugin.callGeminiWithRotation(recentTurns);
      loadingEl.remove();

      const cleanedReply = formatEditorialMarkdown(res.text);

      history.push({
        role: 'assistant',
        content: cleanedReply,
        model: res.model,
        sources,
        tokenInfo: res.tokenInfo,
        ts: Date.now()
      });

      if (history.length > 40) {
        this.plugin.settings.chatHistory = history.slice(history.length - 40);
      }
      await this.plugin.saveSettings();
      this.renderGaugeBar();
      this.renderMessages();
    } catch (err) {
      loadingEl.remove();
      const errMsg = err && err.message ? err.message : String(err);
      history.push({
        role: 'assistant',
        content: `⚠️ **오류가 발생했습니다**: ${errMsg}\n\n플러그인 설정에서 Gemini API 키와 인터넷 연결을 확인해 주세요.`,
        ts: Date.now()
      });
      this.renderGaugeBar();
      this.renderMessages();
    } finally {
      this.isGenerating = false;
      if (this.sendBtn) {
        this.sendBtn.disabled = false;
        this.sendBtn.textContent = '전송';
      }
    }
  }

  async saveConversationAsNote() {
    const history = this.plugin.settings.chatHistory || [];
    if (history.length === 0) {
      new Notice('저장할 대화 내용이 없습니다.');
      return;
    }
    const firstUser = history.find((m) => m.role === 'user');
    const titleHint = firstUser ? firstUser.content.slice(0, 30) : '제미나이 설교 연구 대화';
    const lines = [];
    for (const m of history) {
      if (m.role === 'user') {
        lines.push(`## 🙋‍♂️ 질문\n${m.content}\n`);
      } else {
        lines.push(`## ✨ 제미나이 답변 (${m.model || ''})\n`);
        if (m.sources && m.sources.length > 0) {
          lines.push(`> **참조 노트**: ${m.sources.map((s) => (s.isVirtual ? s.basename : `[[${s.basename}]]`)).join(', ')}\n`);
        }
        lines.push(`${formatEditorialMarkdown(m.content)}\n`);
      }
    }
    await this.plugin.createNoteFromContent(titleHint, lines.join('\n'), []);
  }
}

class SermonVaultAIPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.keyCursor = 0;
    this.vaultContentCache = new Map();
    this.strongDictCache = null; // Lazy-loaded when [스트롱] is checked

    this.registerView(VIEW_TYPE_VAULT_AI, (leaf) => new SermonVaultAIView(leaf, this));

    this.addRibbonIcon('sparkles', '제미나이 설교·볼트 AI 열기', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-sermon-vault-ai',
      name: '제미나이 설교·볼트 AI 사이드바 열기',
      callback: () => this.activateView()
    });

    this.addCommand({
      id: 'sync-nas-seminary-to-new',
      name: 'NAS 신학원 신규 원고 동기화 (9 신학원 원고-완료 → 03 구약 / 04 신약 / 02 성경 연구 자동 배치)',
      callback: () => this.syncNasSeminaryToNewFolder(false)
    });

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.nasAutoSyncWeekly) {
        const WEEK_MS = 7 * 24 * 3600 * 1000;
        const now = Date.now();
        if (!this.settings.nasLastSyncTs || now - this.settings.nasLastSyncTs >= WEEK_MS) {
          setTimeout(() => {
            this.syncNasSeminaryToNewFolder(true);
          }, 8000);
        }
      }
    });

    this.addCommand({
      id: 'send-selection-to-vault-ai',
      name: '선택한 본문을 제미나이 AI 채팅창으로 보내기',
      editorCallback: async (editor, view) => {
        const sel = editor.getSelection();
        if (!sel || !sel.trim()) {
          new Notice('먼저 에디터에서 텍스트를 드래그하여 선택해 주세요.');
          return;
        }
        const aiView = await this.activateView();
        if (aiView) {
          aiView.setPinnedSelection(sel, view.file);
        }
      }
    });

    this.addCommand({
      id: 'refine-selection-with-gemini',
      name: '선택한 설교 문장 자연스럽게 다듬기 (커서 위치 교체)',
      editorCallback: async (editor) => {
        const sel = editor.getSelection();
        if (!sel || !sel.trim()) {
          new Notice('다듬을 문장을 먼저 선택해 주세요.');
          return;
        }
        new Notice('✨ 제미나이가 선택한 문장을 다듬고 있습니다...');
        try {
          const prompt =
            '다음 설교문/글의 원래 의미와 성경 구절 인용, 마크다운 구조는 그대로 보존하면서 어색한 띄어쓰기나 문맥만 자연스럽고 매끄럽게 다듬어 주세요. 부연 설명 없이 다듬어진 결과 본문만 출력하세요.\n\n' +
            sel;
          const res = await this.callGeminiWithRotation([{ role: 'user', parts: [{ text: prompt }] }]);
          if (res && res.text) {
            editor.replaceSelection(res.text.trim());
            new Notice('문장 다듬기가 완료되었습니다.');
          }
        } catch (err) {
          new Notice('오류: ' + (err.message || err));
        }
      }
    });

    this.addCommand({
      id: 'summarize-selection-below',
      name: '선택한 영역 핵심 요약하여 아래에 삽입',
      editorCallback: async (editor) => {
        const sel = editor.getSelection();
        if (!sel || !sel.trim()) {
          new Notice('요약할 본문을 먼저 선택해 주세요.');
          return;
        }
        new Notice('✨ 제미나이가 선택 영역을 요약하고 있습니다...');
        try {
          const prompt = '다음 본문의 핵심 요지와 주요 대지를 간결한 마크다운 불릿 목록으로 요약해 주세요.\n\n' + sel;
          const res = await this.callGeminiWithRotation([{ role: 'user', parts: [{ text: prompt }] }]);
          if (res && res.text) {
            editor.replaceSelection(`${sel}\n\n> [!summary] 핵심 요약\n> ${res.text.trim().replace(/\n/g, '\n> ')}\n`);
            new Notice('요약이 삽입되었습니다.');
          }
        } catch (err) {
          new Notice('오류: ' + (err.message || err));
        }
      }
    });

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        const sel = editor.getSelection();
        if (sel && sel.trim().length > 0) {
          menu.addItem((item) => {
            item
              .setTitle('✨ 제미나이 AI: 선택 본문으로 질문하기')
              .setIcon('sparkles')
              .onClick(async () => {
                const aiView = await this.activateView();
                if (aiView) aiView.setPinnedSelection(sel, view.file);
              });
          });
          menu.addItem((item) => {
            item
              .setTitle('✨ 제미나이 AI: 선택 문장 다듬기')
              .setIcon('wand')
              .onClick(async () => {
                this.app.commands.executeCommandById('sermon-vault-ai:refine-selection-with-gemini');
              });
          });
        }
      })
    );

    this.addSettingTab(new SermonVaultAISettingTab(this.app, this));
  }

  onunload() {
    this.vaultContentCache.clear();
    this.strongDictCache = null;
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULT_AI);
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (!this.settings.telegramBotToken || !String(this.settings.telegramBotToken).trim()) {
      this.settings.telegramBotToken = DEFAULT_SETTINGS.telegramBotToken;
    }
    this.settings.quotaStats = Object.assign({}, DEFAULT_SETTINGS.quotaStats, loaded?.quotaStats || {});
    this.settings.systemPrompt = DEFAULT_SETTINGS.systemPrompt;
    if (Array.isArray(this.settings.chatHistory)) {
      for (const msg of this.settings.chatHistory) {
        delete msg.intentSummary;
        if (msg.role === 'assistant' && msg.content) {
          msg.content = formatEditorialMarkdown(msg.content);
        }
      }
    }
    this.ensureQuotaDayCurrent();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  ensureQuotaDayCurrent() {
    const todayId = getCurrentQuotaDayId();
    if (!this.settings.quotaStats || this.settings.quotaStats.dayId !== todayId) {
      this.settings.quotaStats = {
        dayId: todayId,
        requestsToday: 0,
        promptTokensToday: 0,
        outputTokensToday: 0,
        lastPromptTokens: this.settings.quotaStats?.lastPromptTokens || 0,
        lastOutputTokens: this.settings.quotaStats?.lastOutputTokens || 0,
        exhaustedKeys: []
      };
    }
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_VAULT_AI)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      leaf = rightLeaf || workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_VAULT_AI, active: true });
    }
    workspace.revealLeaf(leaf);
    return leaf.view instanceof SermonVaultAIView ? leaf.view : null;
  }

  getAvailableApiKeys() {
    const rawList = String(this.settings.geminiApiKeys || '')
      .split(/[\r\n,;]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (this.settings.useSharedVaultKeys) {
      try {
        const plugins = this.app.plugins && this.app.plugins.plugins;
        if (plugins) {
          const mmKey = plugins['sermon-mindmap']?.settings?.geminiApiKey;
          if (mmKey && typeof mmKey === 'string' && mmKey.trim()) {
            rawList.push(mmKey.trim());
          }
          const refKeys = plugins['sermon-md-refiner']?.settings?.geminiApiKeys;
          if (refKeys && typeof refKeys === 'string') {
            for (const k of refKeys.split(/[\r\n,;]+/)) {
              if (k.trim()) rawList.push(k.trim());
            }
          }
        }
      } catch (e) {}
    }

    return Array.from(new Set(rawList));
  }

  getExcludedFolderPrefixes(allowCommentary = false) {
    const list = SYSTEM_EXCLUDED_FOLDERS.map((s) => (s.endsWith('/') ? s : s + '/'));
    if (!allowCommentary && !this.settings.includeCommentary) {
      list.push(COMMENTARY_FOLDER_PREFIX + '/');
    }
    return list;
  }

  getTopLevelContentFolders() {
    const excluded = new Set(SYSTEM_EXCLUDED_FOLDERS);
    const folders = new Set();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const slashIdx = file.path.indexOf('/');
      if (slashIdx > 0) {
        const top = file.path.slice(0, slashIdx);
        if (!top.startsWith('.') && !excluded.has(top)) {
          folders.add(top);
        }
      }
    }
    return Array.from(folders).sort((a, b) => a.localeCompare(b, 'ko'));
  }

  /**
   * Search Strong's Hebrew/Greek Korean Lexicon (_strong_json/HebGrkKo) when [스트롱] checkbox is checked
   */
  async searchStrongDictionary(parsedQuery) {
    const results = [];
    try {
      const baseDir = '_strong_json/HebGrkKo';
      if (!(await this.app.vault.adapter.exists(baseDir))) return results;

      if (!this.strongDictCache) {
        this.strongDictCache = [];
        const files = ['G0.json', 'G1.json', 'G2.json', 'G3.json', 'G4.json', 'G5.json', 'H0.json', 'H1.json', 'H2.json', 'H3.json', 'H4.json', 'H5.json', 'H6.json', 'H7.json', 'H8.json'];
        for (const fname of files) {
          const fpath = `${baseDir}/${fname}`;
          if (await this.app.vault.adapter.exists(fpath)) {
            try {
              const raw = await this.app.vault.adapter.read(fpath);
              const obj = JSON.parse(raw);
              for (const [code, html] of Object.entries(obj)) {
                const firstBreak = html.indexOf('<br><br>');
                const headRaw = firstBreak > 0 ? html.slice(0, firstBreak) : html.slice(0, 180);
                const headClean = stripHtmlTags(headRaw).replace(/\n+/g, ' | ');
                this.strongDictCache.push({
                  code,
                  head: headClean,
                  headLow: headClean.toLowerCase(),
                  html
                });
              }
            } catch (_) {}
          }
        }
      }

      const matched = [];
      const codeSet = new Set(parsedQuery.strongCodes || []);

      for (const entry of this.strongDictCache) {
        let score = 0;
        if (codeSet.has(entry.code)) {
          score += 100;
        }
        for (const kw of parsedQuery.keywords) {
          if (kw.length < 2) continue;
          const kwLow = kw.toLowerCase();
          if (entry.headLow.includes(kwLow)) {
            score += 30;
          }
        }
        if (score > 0) {
          matched.push({ entry, score });
        }
      }

      matched.sort((a, b) => b.score - a.score);
      for (const item of matched.slice(0, 3)) {
        results.push({
          code: item.entry.code,
          head: item.entry.head,
          body: stripHtmlTags(item.entry.html).slice(0, 2200)
        });
      }
    } catch (e) {}
    return results;
  }

  /**
   * Search Commentary Finder Plugin Data (Grand, Hokma, Matthew Henry, etc.) when [주석] checkbox is checked
   */
  async searchCommentaryPluginData(parsedQuery) {
    const results = [];
    try {
      const scf = this.app.plugins?.plugins?.['sermon-commentary-finder'];
      if (!scf || typeof scf.loadChapterData !== 'function') return results;

      for (const ref of parsedQuery.bibleRefs.slice(0, 2)) {
        const bNo = ref.bInfo.no;
        const ch = ref.ch;
        const bookData = await scf.loadChapterData(bNo, ch);
        if (!bookData) continue;

        const fi = bNo - 1;
        const texts = [];

        // Check corrected commentary entries first
        if (bookData.corrected) {
          for (const [key, val] of Object.entries(bookData.corrected)) {
            if (!key.startsWith(`${fi}_`) || !val) continue;
            const s = String(val);
            if (ref.vStart) {
              if (s.includes(`${ch}:${ref.vStart}`) || s.includes(`${ref.vStart}절`)) {
                texts.push(s.slice(0, 2500));
              }
            } else {
              texts.push(s.slice(0, 1800));
            }
            if (texts.length >= 2) break;
          }
        }

        // Also check pages if needed
        if (texts.length < 2 && bookData.pages) {
          for (const [key, val] of Object.entries(bookData.pages)) {
            if (!val) continue;
            const s = String(val);
            if (ref.vStart && (s.includes(`${ch}:${ref.vStart}`) || s.includes(`${ch} : ${ref.vStart}`))) {
              texts.push(s.slice(0, 2400));
            } else if (!ref.vStart && texts.length === 0) {
              texts.push(s.slice(0, 2000));
            }
            if (texts.length >= 2) break;
          }
        }

        if (texts.length > 0) {
          results.push({
            title: `${ref.bInfo.full} ${ch}${ref.vStart ? ':' + ref.vStart : '장'} 종합주석`,
            text: texts.join('\n\n---\n\n').slice(0, 3800)
          });
        }
      }
    } catch (e) {}
    return results;
  }

  async planQueryWithAI(userText, history, prevSources) {
    try {
      const prevTitles = (prevSources || []).map((s, idx) => `${idx + 1}번: ${s.basename}`).join(', ');
      const lastUserMsg =
        history.length >= 3
          ? history
              .slice(Math.max(0, history.length - 4), history.length - 1)
              .filter((m) => m.role === 'user')
              .map((m) => m.content)
              .join(' / ')
          : '';

      const plannerPrompt =
        `사용자가 설교·성경 볼트에서 질문했습니다. 질문의 진짜 의도를 분석해 검색용 JSON만 출력하세요(코드블록 없이 순수 JSON만).\n` +
        `- 직전 질문: "${lastUserMsg || '없음'}"\n` +
        `- 직전 검색된 노트 목록: [${prevTitles || '없음'}]\n` +
        `- 현재 질문: "${userText}"\n\n` +
        `출력 JSON 형식:\n` +
        `{\n` +
        `  "isFollowUp": true 또는 false (직전 검색 노트나 직전 답변에 이어서 묻는 후속 질문이면 true),\n` +
        `  "targetNoteOrd": 숫자 또는 null ("두 번째 설교", "2번 노트"처럼 특정 순번 노트를 지목한 경우 1부터 시작하는 번호),\n` +
        `  "bibleRefs": ["요 4", "롬 12:1"] (질문과 관련된 성경 약어 장 또는 장:절 배열),\n` +
        `  "keywords": ["핵심검색어1", "동의어2", "인물/사건명3"] (볼트 설교문 본문이나 제목에 등장할 핵심 명사 키워드 2~6개),\n` +
        `  "preachers": ["이요한"] (특정 설교자/목사님 이름이 언급된 경우만 이름)\n` +
        `}`;

      const res = await this.callGeminiWithRotation(
        [{ role: 'user', parts: [{ text: plannerPrompt }] }],
        {
          preferredModel: 'gemini-3.5-flash-lite',
          maxOutputTokens: 300,
          temperature: 0.1,
          skipSystemPrompt: true
        }
      );

      if (res && res.text) {
        const jsonMatch = res.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {}
    return null;
  }

  async searchVaultNotes(queryText, folderScope = '', preParsed = null) {
    const parsed = preParsed || parseSearchQuery(queryText);
    const excludedPrefixes = this.getExcludedFolderPrefixes(false);
    const maxResults = Math.max(2, Math.min(15, Number(this.settings.maxSearchResults) || 8));
    const maxChars = Math.max(800, Math.min(8000, Number(this.settings.maxCharsPerNote) || 2800));

    const allFiles = this.app.vault.getMarkdownFiles();
    const candidates = [];

    for (const file of allFiles) {
      const p = file.path;
      if (folderScope && !p.startsWith(folderScope + '/')) continue;
      let skip = false;
      for (const ex of excludedPrefixes) {
        if (p.startsWith(ex)) {
          skip = true;
          break;
        }
      }
      if (skip) continue;

      const lowerPath = p.toLowerCase();
      const lowerBase = file.basename.toLowerCase();
      const cache = this.app.metadataCache.getFileCache(file);

      let score = 0;
      let metaInfoParts = [];

      const fm = cache && cache.frontmatter;
      let fmSpeaker = '';
      if (fm) {
        fmSpeaker = String(fm['강사'] || fm['설교자'] || fm['author'] || fm['speaker'] || '').trim();
        if (fmSpeaker) metaInfoParts.push(`강사: ${fmSpeaker}`);
      }

      for (const preacher of parsed.preachers) {
        const pLow = preacher.toLowerCase();
        if (lowerBase.includes(pLow) || fmSpeaker.toLowerCase().includes(pLow)) {
          score += 45;
        } else if (lowerPath.includes(pLow)) {
          score += 25;
        }
      }

      for (const bf of parsed.bookFilters) {
        const bfLow = bf.toLowerCase();
        if (lowerPath.includes(bfLow) || lowerBase.includes(bfLow)) {
          score += 22;
        }
      }

      for (const term of parsed.expandedTerms) {
        const tLow = term.toLowerCase();
        if (lowerBase.includes(tLow)) {
          score += 45;
        }
      }

      for (const kw of parsed.keywords) {
        const kwLow = kw.toLowerCase();
        if (lowerBase.includes(kwLow)) {
          score += 32;
        } else if (lowerPath.includes(kwLow)) {
          score += 14;
        }
      }

      if (cache && Array.isArray(cache.headings)) {
        let headingHits = 0;
        for (const h of cache.headings) {
          const hLow = String(h.heading || '').toLowerCase();
          for (const term of parsed.expandedTerms) {
            if (hLow.includes(term.toLowerCase())) {
              score += 24;
              headingHits++;
            }
          }
          for (const kw of parsed.keywords) {
            if (hLow.includes(kw.toLowerCase())) {
              score += 18;
              headingHits++;
            }
          }
          if (headingHits >= 4) break;
        }
      }

      if (cache && Array.isArray(cache.tags)) {
        for (const t of cache.tags) {
          const tLow = String(t.tag || '').toLowerCase();
          for (const kw of parsed.keywords) {
            if (tLow.includes(kw.toLowerCase())) score += 16;
          }
        }
      }

      candidates.push({
        file,
        stage1Score: score,
        metaInfo: metaInfoParts.join(', '),
        folder: file.parent ? file.parent.path : ''
      });
    }

    candidates.sort((a, b) => {
      if (b.stage1Score !== a.stage1Score) return b.stage1Score - a.stage1Score;
      return (b.file.stat?.mtime || 0) - (a.file.stat?.mtime || 0);
    });

    const startTime = Date.now();
    const TIME_BUDGET_MS = 1100;
    const finalResults = [];

    const strongStage1Count = candidates.filter((c) => c.stage1Score >= 30).length;
    const scanLimit = strongStage1Count >= maxResults ? Math.min(candidates.length, 250) : Math.min(candidates.length, 1600);

    for (let i = 0; i < scanLimit; i++) {
      if (i > 40 && i % 80 === 0) {
        if (Date.now() - startTime > TIME_BUDGET_MS && finalResults.length >= Math.min(3, maxResults)) {
          break;
        }
      }

      const cand = candidates[i];
      const fileSize = cand.file.stat ? cand.file.stat.size : 0;
      const mtime = cand.file.stat ? cand.file.stat.mtime : 0;

      const sizeLimit = this.settings.includeCommentary ? 2500000 : 400000;
      if (cand.stage1Score === 0 && fileSize > sizeLimit) continue;
      if (cand.stage1Score === 0 && finalResults.length >= maxResults * 2 && i > 300) break;

      try {
        let cachedEntry = this.vaultContentCache.get(cand.file.path);
        let content;
        let lowerContent;
        if (cachedEntry && cachedEntry.mtime === mtime) {
          content = cachedEntry.raw;
          lowerContent = cachedEntry.lower;
        } else {
          content = await this.app.vault.cachedRead(cand.file);
          lowerContent = content.toLowerCase();
          if (fileSize < 250000 && this.vaultContentCache.size < 3000) {
            this.vaultContentCache.set(cand.file.path, { mtime, raw: content, lower: lowerContent });
          }
        }

        let contentScore = 0;
        let matchedKeywordCount = 0;

        for (const term of parsed.expandedTerms) {
          if (lowerContent.includes(term.toLowerCase())) {
            contentScore += 26;
          }
        }
        for (const preacher of parsed.preachers) {
          if (lowerContent.includes(preacher.toLowerCase())) {
            contentScore += 20;
          }
        }
        for (const kw of parsed.keywords) {
          const kwLow = kw.toLowerCase();
          const idx = lowerContent.indexOf(kwLow);
          if (idx !== -1) {
            matchedKeywordCount++;
            contentScore += 16;
            if (lowerContent.indexOf(kwLow, idx + kwLow.length) !== -1) {
              contentScore += 8;
            }
          }
        }

        if (matchedKeywordCount >= 2) {
          contentScore += matchedKeywordCount * 15;
        }

        const totalScore = cand.stage1Score + contentScore;
        if (totalScore > 0) {
          finalResults.push({
            file: cand.file,
            folder: cand.folder,
            metaInfo: cand.metaInfo,
            totalScore,
            content
          });
        }
      } catch (e) {}
    }

    finalResults.sort((a, b) => b.totalScore - a.totalScore);
    const topPicked = finalResults.slice(0, maxResults);

    return topPicked.map((item) => ({
      file: item.file,
      folder: item.folder,
      metaInfo: item.metaInfo,
      score: item.totalScore,
      snippet: extractBestSnippets(item.content, parsed, maxChars)
    }));
  }

  async callGeminiWithRotation(contents, options = {}) {
    this.ensureQuotaDayCurrent();
    const keys = this.getAvailableApiKeys();
    if (keys.length === 0) {
      throw new Error('등록된 Gemini API 키가 없습니다.');
    }

    const selectedModel = String(options.preferredModel || this.settings.geminiModel || 'gemini-3.5-flash').trim();
    const candidateChain = MODEL_CANDIDATE_CHAINS[selectedModel] || [selectedModel, 'gemini-3-flash-preview', 'gemini-2.5-flash'];
    const extraFallbacks = String(this.settings.fallbackModels || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const models = Array.from(new Set([...candidateChain, ...extraFallbacks]));

    const exhaustedSet = new Set(this.settings.quotaStats.exhaustedKeys || []);
    let lastError = '';

    for (const model of models) {
      for (let kTry = 0; kTry < keys.length; kTry++) {
        const keyIdx = (this.keyCursor + kTry) % keys.length;
        const apiKey = keys[keyIdx];
        const isStandardKey = apiKey.startsWith('AIza');

        const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const url = isStandardKey ? baseUrl : `${baseUrl}?key=${encodeURIComponent(apiKey)}`;
        const headers = { 'Content-Type': 'application/json' };
        if (isStandardKey) {
          headers['x-goog-api-key'] = apiKey;
        }

        const bodyObj = {
          contents,
          generationConfig: {
            temperature: options.temperature !== undefined ? options.temperature : Number(this.settings.temperature) || 0.3,
            maxOutputTokens: options.maxOutputTokens || 8192
          }
        };

        if (!options.skipSystemPrompt && this.settings.systemPrompt && this.settings.systemPrompt.trim()) {
          bodyObj.systemInstruction = {
            parts: [{ text: this.settings.systemPrompt.trim() }]
          };
        }

        try {
          const resp = await requestUrl({
            url,
            method: 'POST',
            headers,
            body: JSON.stringify(bodyObj),
            throw: false
          });

          if (resp.status === 200 && resp.json) {
            const parts = resp.json?.candidates?.[0]?.content?.parts || [];
            const text = parts.map((p) => p.text || '').join('').trim();
            if (text) {
              this.keyCursor = (keyIdx + 1) % keys.length;

              const usage = resp.json.usageMetadata || {};
              const pTok = Number(usage.promptTokenCount) || Math.round(JSON.stringify(contents).length / 3);
              const cTok = Number(usage.candidatesTokenCount) || Math.round(text.length / 2.5);

              this.settings.quotaStats.requestsToday = (this.settings.quotaStats.requestsToday || 0) + 1;
              this.settings.quotaStats.promptTokensToday = (this.settings.quotaStats.promptTokensToday || 0) + pTok;
              this.settings.quotaStats.outputTokensToday = (this.settings.quotaStats.outputTokensToday || 0) + cTok;
              if (!options.skipSystemPrompt) {
                this.settings.quotaStats.lastPromptTokens = pTok;
                this.settings.quotaStats.lastOutputTokens = cTok;
              }

              if (exhaustedSet.has(apiKey)) {
                exhaustedSet.delete(apiKey);
                this.settings.quotaStats.exhaustedKeys = Array.from(exhaustedSet);
              }

              return {
                text,
                model,
                tokenInfo: {
                  prompt: pTok,
                  output: cTok,
                  total: pTok + cTok
                }
              };
            }
            lastError = '빈 응답이 반환되었습니다.';
          } else if (resp.status === 429 || resp.status === 503) {
            exhaustedSet.add(apiKey);
            this.settings.quotaStats.exhaustedKeys = Array.from(exhaustedSet);
            lastError = `할당량 초과 (${resp.status})`;
            continue;
          } else if (resp.status === 404) {
            lastError = `모델(${model}) 미지원 (404)`;
            break;
          } else {
            const errDetail = resp.json?.error?.message || resp.text || `HTTP ${resp.status}`;
            lastError = errDetail;
            continue;
          }
        } catch (err) {
          lastError = err && err.message ? err.message : String(err);
        }
      }
    }

    throw new Error(lastError || '모든 API 키의 할당량이 소진되었거나 요청에 실패했습니다.');
  }

  insertTextToActiveEditor(text) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.editor) {
      new Notice('삽입할 마크다운 노트가 열려 있지 않습니다. 먼저 노트를 클릭해 주세요.');
      return;
    }
    view.editor.replaceSelection(`\n${text}\n`);
    new Notice('현재 노트 커서 위치에 답변이 삽입되었습니다.');
  }

  async createNoteFromContent(titleHint, content, sources = []) {
    const cleanTitle = String(titleHint || '제미나이 설교 연구')
      .replace(/[\\/:*?"<>|#^\[\]]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 36);
    const dateStr = new Date().toISOString().slice(0, 10);
    const folder = String(this.settings.saveFolder || '').trim().replace(/\/$/, '');

    if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
      try {
        await this.app.vault.createFolder(folder);
      } catch (e) {}
    }

    let basePath = folder ? `${folder}/AI연구_${dateStr}_${cleanTitle}` : `AI연구_${dateStr}_${cleanTitle}`;
    let finalPath = `${basePath}.md`;
    let counter = 2;
    while (this.app.vault.getAbstractFileByPath(finalPath)) {
      finalPath = `${basePath} (${counter}).md`;
      counter++;
    }

    let noteBody = `---\ncreated: ${dateStr}\ntags:\n  - 제미나이AI연구\n---\n\n# ${cleanTitle}\n\n`;
    if (sources && sources.length > 0) {
      noteBody += `> **참조한 설교·연구 노트**: ${sources.map((s) => (s.isVirtual ? s.basename : `[[${s.basename}]]`)).join(', ')}\n\n`;
    }
    noteBody += formatEditorialMarkdown(content);

    const newFile = await this.app.vault.create(finalPath, noteBody);
    await this.app.workspace.getLeaf(false).openFile(newFile);
    new Notice(`새 노트로 저장되었습니다: ${newFile.basename}`);
  }

  async synoRequestJson(url) {
    if (!(Platform && Platform.isMobile) && typeof require === 'function') {
      try {
        const https = require('https');
        const http = require('http');
        const parsed = new URL(url);
        const mod = parsed.protocol === 'https:' ? https : http;
        return await new Promise((resolve, reject) => {
          const req = mod.get(
            url,
            { rejectUnauthorized: false, timeout: 25000 },
            (res) => {
              const chunks = [];
              res.on('data', (c) => chunks.push(c));
              res.on('end', () => {
                try {
                  const txt = Buffer.concat(chunks).toString('utf8');
                  resolve(JSON.parse(txt));
                } catch (e) {
                  reject(e);
                }
              });
            }
          );
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy(new Error('NAS 연결 시간 초과'));
          });
        });
      } catch (e) {}
    }
    const resp = await requestUrl({ url, method: 'GET', throw: false });
    if (resp.json) return resp.json;
    return JSON.parse(resp.text);
  }

  async synoRequestBinary(url) {
    if (!(Platform && Platform.isMobile) && typeof require === 'function') {
      try {
        const https = require('https');
        const http = require('http');
        const parsed = new URL(url);
        const mod = parsed.protocol === 'https:' ? https : http;
        return await new Promise((resolve, reject) => {
          const req = mod.get(
            url,
            { rejectUnauthorized: false, timeout: 45000 },
            (res) => {
              const chunks = [];
              res.on('data', (c) => chunks.push(c));
              res.on('end', () => {
                const buf = Buffer.concat(chunks);
                resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
              });
            }
          );
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy(new Error('NAS 파일 다운로드 시간 초과'));
          });
        });
      } catch (e) {}
    }
    const resp = await requestUrl({ url, method: 'GET', throw: false });
    return resp.arrayBuffer;
  }

  async ensureVaultFolderPath(folderPath) {
    const clean = String(folderPath || '')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    if (!clean) return;
    const parts = clean.split('/');
    let cur = '';
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(cur))) {
        try {
          await this.app.vault.createFolder(cur);
        } catch (e) {}
      }
    }
  }

  async sendTelegramAlertIfConfigured(createdItems) {
    const token = String(this.settings.telegramBotToken || '').trim();
    const chatId = String(this.settings.telegramChatId || '').trim();
    if (!token || !chatId || !createdItems || createdItems.length === 0) return;

    const lines = [
      `📚 *[신학원 원고 자동 업데이트 완료]*`,
      `NAS \`9 신학원 원고-완료\`에서 신규 원고 *${createdItems.length}건*이 옵시디언 각 폴더에 자동 배치되었습니다:`,
      ``
    ];
    for (let i = 0; i < createdItems.length; i++) {
      const item = createdItems[i];
      lines.push(`${i + 1}. 📂 *${item.folder}*\n   └ 📄 \`${item.fileName}\``);
    }
    try {
      await requestUrl({
        url: `https://api.telegram.org/bot${token}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join('\n'),
          parse_mode: 'Markdown'
        }),
        throw: false
      });
    } catch (e) {}
  }

  async syncNasSeminaryToNewFolder(isAutoBackground = false) {
    if (this._isSyncingNas) {
      if (!isAutoBackground) new Notice('이미 NAS 신학원 원고 동기화가 진행 중입니다.');
      return;
    }
    const baseUrl = String(this.settings.nasBaseUrl || 'https://seoulpastor.direct.quickconnect.to:5001')
      .trim()
      .replace(/\/$/, '');
    const user = String(this.settings.nasUser || '').trim();
    const pass = String(this.settings.nasPass || '').trim();
    const rootFolder = String(this.settings.nasRootFolder || '/개인폴더/히 최신자료/9 신학원 원고-완료').trim();

    if (!baseUrl || !user || !pass) {
      if (!isAutoBackground) {
        new Notice('NAS 주소, 아이디, 비밀번호를 플러그인 설정에서 먼저 확인해 주세요.');
      }
      return;
    }

    this._isSyncingNas = true;
    if (!isAutoBackground) {
      new Notice('📥 NAS [9 신학원 원고-완료]에서 신규 원고를 확인하고 있습니다...');
    }

    try {
      // 1. Login to Synology DSM FileStation API
      const loginUrl =
        `${baseUrl}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login` +
        `&account=${encodeURIComponent(user)}&passwd=${encodeURIComponent(pass)}` +
        `&session=FileStation&format=sid`;
      const loginJson = await this.synoRequestJson(loginUrl);
      if (!loginJson || !loginJson.success || !loginJson.data?.sid) {
        throw new Error('NAS 로그인 실패 (아이디/비밀번호 또는 주소를 확인하세요)');
      }
      const sid = loginJson.data.sid;

      // 2. Index existing markdown files in the vault (excluding system folders)
      const allMdFiles = this.app.vault.getMarkdownFiles();
      const vaultFileNorms = [];
      for (const f of allMdFiles) {
        if (f.path.startsWith('.') || f.path.startsWith('_')) {
          continue;
        }
        vaultFileNorms.push({
          name: f.name,
          norm: normForNasMatch(f.basename),
          path: f.path
        });
      }

      const isAlreadyInObsidianVault = (nasFileName) => {
        const rawBase = nasFileName.replace(/\.(?:hwp|hwpx|docx|doc)$/i, '').trim();
        const fullNorm = normForNasMatch(rawBase);
        const strippedTitle = rawBase.replace(/^\d+\s*[._\-)\s]\s*/, '').trim();
        const strippedNorm = normForNasMatch(strippedTitle);
        for (const vf of vaultFileNorms) {
          if (fullNorm.length >= 4 && vf.norm.includes(fullNorm)) return vf.path;
          if (strippedNorm.length >= 6 && vf.norm.includes(strippedNorm)) return vf.path;
        }
        return null;
      };

      // 3. List course folders in NAS rootFolder
      const listUrl = (folderPath) =>
        `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.List&version=2&method=list` +
        `&folder_path=${encodeURIComponent(folderPath)}` +
        `&additional=${encodeURIComponent('["size","time"]')}` +
        `&_sid=${encodeURIComponent(sid)}`;

      const rootJson = await this.synoRequestJson(listUrl(rootFolder));
      if (!rootJson || !rootJson.success) {
        throw new Error(`NAS 폴더 조회 실패: ${rootFolder}`);
      }
      const courseDirs = (rootJson.data?.files || []).filter((f) => f.isdir);

      if (!this.settings.nasSyncedPaths) this.settings.nasSyncedPaths = {};

      const newlyCreated = [];
      let checkedCount = 0;

      for (const dir of courseDirs) {
        const courseMeta = parseNasCourseFolder(dir.name);
        let subFiles = [];
        try {
          const subJson = await this.synoRequestJson(listUrl(dir.path));
          subFiles = subJson?.data?.files || [];
        } catch (e) {
          continue;
        }

        for (const f of subFiles) {
          if (f.isdir) continue;
          const ext = f.name.toLowerCase().split('.').pop();
          if (!['hwp', 'hwpx', 'docx'].includes(ext)) continue;
          checkedCount++;

          const mtime = f.additional?.time?.mtime || f.additional?.time?.crtime || 0;
          const prevSync = this.settings.nasSyncedPaths[f.path];
          if (
            prevSync &&
            prevSync.mtime === mtime &&
            prevSync.targetRelPath &&
            (await this.app.vault.adapter.exists(prevSync.targetRelPath))
          ) {
            continue;
          }

          const existingVaultPath = isAlreadyInObsidianVault(f.name);
          if (existingVaultPath) {
            this.settings.nasSyncedPaths[f.path] = {
              mtime,
              status: 'already_in_vault',
              vaultPath: existingVaultPath
            };
            continue;
          }

          // Missing in vault -> Download and convert pure-JS to Markdown directly into target folder
          const dlUrl =
            `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download` +
            `&path=${encodeURIComponent(f.path)}&mode=download&_sid=${encodeURIComponent(sid)}`;
          const binBuf = await this.synoRequestBinary(dlUrl);
          const extractedText = await extractDocumentTextPureJs(f.name, binBuf);
          if (!extractedText || extractedText.trim().length < 20) {
            continue;
          }

          const placement = buildTargetNasMdPlacement(f.name, courseMeta, extractedText, mtime);
          const mdContent = formatNasSeminaryMarkdown(extractedText, f.name, courseMeta);
          await this.ensureVaultFolderPath(placement.folder);
          const targetRelPath = `${placement.folder}/${placement.fileName}`;

          await this.app.vault.adapter.write(targetRelPath, mdContent);
          this.settings.nasSyncedPaths[f.path] = {
            mtime,
            status: 'synced_to_vault',
            targetFolder: placement.folder,
            targetMd: placement.fileName,
            targetRelPath,
            syncedAt: new Date().toISOString()
          };
          newlyCreated.push({
            folder: placement.folder,
            fileName: placement.fileName,
            relPath: targetRelPath
          });
        }
      }

      this.settings.nasLastSyncTs = Date.now();
      await this.saveSettings();

      if (newlyCreated.length > 0) {
        await this.sendTelegramAlertIfConfigured(newlyCreated);
        const previewLines = newlyCreated
          .slice(0, 4)
          .map((it) => `📂 ${it.folder}\n  └ ${it.fileName}`);
        new Notice(
          `✅ NAS 신학원 신규 원고 ${newlyCreated.length}건이 각 폴더에 저장되었습니다!\n` +
            previewLines.join('\n'),
          10000
        );
      } else if (!isAutoBackground) {
        new Notice(
          `✅ NAS 신학원 원고(${checkedCount}개) 점검 완료: 모든 원고가 이미 옵시디언(03 구약 / 04 신약 / 02 성경 연구)에 최신 상태로 반영되어 있습니다.`,
          6000
        );
      }
    } catch (err) {
      if (!isAutoBackground) {
        new Notice(`❌ NAS 신학원 동기화 오류: ${err && err.message ? err.message : err}`, 8000);
      }
    } finally {
      this._isSyncingNas = false;
    }
  }
}

class SermonVaultAISettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '✨ Sermon Vault AI (제미나이 설교·볼트 도우미) 설정' });

    new Setting(containerEl)
      .setName('기본 글자 크기 (px)')
      .setDesc('본문·인용성구는 1.0배, 소제목(H3)은 1.15배, 대제목(H1/H2)은 1.30배로 자동 비례 적용됩니다.')
      .addSlider((slider) =>
        slider
          .setLimits(11, 28, 1)
          .setValue(this.plugin.settings.bodyFontSize || 15)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.bodyFontSize = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Gemini API 키 목록 (다중 키 자동 로테이션 지원)')
      .setDesc('한 줄에 하나씩(또는 쉼표로 구분하여) 여러 개의 Gemini API 키를 등록하면 할당량 소진 시 자동으로 다음 키로 넘어갑니다.')
      .addTextArea((text) => {
        text
          .setPlaceholder('AIzaSy...\nAQ.Ab8RN6...')
          .setValue(this.plugin.settings.geminiApiKeys)
          .onChange(async (val) => {
            this.plugin.settings.geminiApiKeys = val;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 6;
        text.inputEl.style.width = '100%';
        text.inputEl.style.fontFamily = 'monospace';
      });

    new Setting(containerEl)
      .setName('볼트 내 기존 플러그인(설교 마인드맵 등)의 Gemini API 키 함께 사용')
      .setDesc('켜두면 설교 마인드맵이나 다듬기 플러그인에 등록된 API 키도 자동으로 함께 사용합니다.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useSharedVaultKeys).onChange(async (val) => {
          this.plugin.settings.useSharedVaultKeys = val;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('API 키 연결 테스트')
      .setDesc(`현재 인식된 총 API 키 개수: ${this.plugin.getAvailableApiKeys().length}개`)
      .addButton((btn) =>
        btn
          .setButtonText('연결 테스트')
          .setCta()
          .onClick(async () => {
            btn.setButtonText('테스트 중...');
            try {
              const res = await this.plugin.callGeminiWithRotation([
                { role: 'user', parts: [{ text: '연결 테스트입니다. "제미나이 연결 성공!"이라고만 답하세요.' }] }
              ]);
              new Notice(`✅ ${res.model} 응답: ${res.text}`);
            } catch (err) {
              new Notice(`❌ 연결 실패: ${err.message || err}`);
            } finally {
              btn.setButtonText('연결 테스트');
            }
          })
      );

    new Setting(containerEl)
      .setName('기본 Gemini 모델')
      .setDesc('3.5 Flash-Lite / 3.5 Flash / 3.0 Flash / 2.5 Flash / 2.5 Pro 중 기본 모델을 선택하세요.')
      .addDropdown((dd) => {
        for (const m of MODEL_OPTIONS) {
          dd.addOption(m.value, m.label);
        }
        dd.setValue(this.plugin.settings.geminiModel).onChange(async (val) => {
          this.plugin.settings.geminiModel = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('검색 시 참고할 최대 설교 노트 수')
      .setDesc('볼트 검색에서 한 번에 제미나이에게 전달할 관련 설교문 개수 (기본값: 8)')
      .addSlider((slider) =>
        slider
          .setLimits(3, 15, 1)
          .setValue(this.plugin.settings.maxSearchResults)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.maxSearchResults = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('노트당 최대 발췌 글자 수')
      .setDesc('검색된 각 설교 노트에서 핵심 단락을 발췌할 최대 글자 수 (기본값: 2800자)')
      .addText((text) =>
        text.setValue(String(this.plugin.settings.maxCharsPerNote)).onChange(async (val) => {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num >= 500) {
            this.plugin.settings.maxCharsPerNote = num;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(containerEl)
      .setName('새 노트 저장 폴더')
      .setDesc('답변이나 대화를 새 노트로 저장할 때 생성될 기본 폴더 경로')
      .addText((text) =>
        text
          .setPlaceholder('예: 02 성경 연구')
          .setValue(this.plugin.settings.saveFolder)
          .onChange(async (val) => {
            this.plugin.settings.saveFolder = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('AI 시스템 프롬프트 (역할 지침)')
      .setDesc('제미나이가 설교 연구 및 질문에 답변할 때 따를 기본 지침입니다.')
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.systemPrompt).onChange(async (val) => {
          this.plugin.settings.systemPrompt = val;
          await this.plugin.saveSettings();
        });
        text.inputEl.rows = 5;
        text.inputEl.style.width = '100%';
      });

    containerEl.createEl('h3', { text: '📥 Synology NAS 신학원 원고 자동 동기화 (03 구약 / 04 신약 / 02 성경 연구 자동 배치)' });

    new Setting(containerEl)
      .setName('NAS 서버 주소 (DSM URL)')
      .setDesc('Synology NAS WebAPI 주소 (기본값: https://seoulpastor.direct.quickconnect.to:5001)')
      .addText((text) =>
        text
          .setPlaceholder('https://seoulpastor.direct.quickconnect.to:5001')
          .setValue(this.plugin.settings.nasBaseUrl || '')
          .onChange(async (val) => {
            this.plugin.settings.nasBaseUrl = val.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('NAS 계정 아이디 / 비밀번호')
      .setDesc('신학원 원고 폴더 접근 권한이 있는 NAS 계정 정보')
      .addText((text) =>
        text
          .setPlaceholder('아이디 (예: pastor)')
          .setValue(this.plugin.settings.nasUser || '')
          .onChange(async (val) => {
            this.plugin.settings.nasUser = val.trim();
            await this.plugin.saveSettings();
          })
      )
      .addText((text) => {
        text
          .setPlaceholder('비밀번호')
          .setValue(this.plugin.settings.nasPass || '')
          .onChange(async (val) => {
            this.plugin.settings.nasPass = val.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      });

    new Setting(containerEl)
      .setName('NAS 신학원 원고 폴더 경로')
      .setDesc('신규 원고는 성경 장·절과 과목명을 분석하여 [03 구약/각 권], [04 신약/각 권], [02 성경 연구/각 과목] 폴더로 자동 분류됩니다.')
      .addText((text) =>
        text
          .setPlaceholder('/개인폴더/히 최신자료/9 신학원 원고-완료')
          .setValue(this.plugin.settings.nasRootFolder || '')
          .onChange(async (val) => {
            this.plugin.settings.nasRootFolder = val.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('주 1회 자동 동기화 및 즉시 동기화 실행')
      .setDesc('켜두면 옵시디언 실행 시 마지막 동기화로부터 7일이 지났을 때 백그라운드에서 자동으로 신규 원고를 확인합니다.')
      .addToggle((toggle) =>
        toggle.setValue(Boolean(this.plugin.settings.nasAutoSyncWeekly)).onChange(async (val) => {
          this.plugin.settings.nasAutoSyncWeekly = val;
          await this.plugin.saveSettings();
        })
      )
      .addButton((btn) =>
        btn
          .setButtonText('📥 지금 신학원 신규 원고 동기화')
          .setCta()
          .onClick(async () => {
            await this.plugin.syncNasSeminaryToNewFolder(false);
          })
      );

    containerEl.createEl('h3', { text: '📲 개인 텔레그램 알림 설정 (각자 자신의 옵시디언에 직접 등록)' });

    let chatIdInputEl = null;

    new Setting(containerEl)
      .setName('1단계: 내 텔레그램 봇 토큰 (HTTP API Token)')
      .setDesc('텔레그램 @BotFather 에서 발급받은 본인의 Bot Token을 입력하고, 만든 봇 대화방에서 아무 말(예: "시작")이나 한 번 보낸 뒤 우측 [Chat ID 자동 찾기]를 누르세요.')
      .addText((text) => {
        text
          .setPlaceholder('예: 123456789:ABCdefGHIjklMNO...')
          .setValue(this.plugin.settings.telegramBotToken || '')
          .onChange(async (val) => {
            this.plugin.settings.telegramBotToken = val.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '240px';
      })
      .addButton((btn) =>
        btn.setButtonText('🔍 Chat ID 자동 찾기').onClick(async () => {
          const token = String(this.plugin.settings.telegramBotToken || '').trim();
          if (!token) {
            new Notice('먼저 텔레그램 봇 토큰(HTTP API Token)을 입력해 주세요.');
            return;
          }
          btn.setButtonText('조회 중...');
          try {
            const resp = await requestUrl({
              url: `https://api.telegram.org/bot${token}/getUpdates`,
              method: 'GET',
              throw: false
            });
            const data = resp.json || JSON.parse(resp.text || '{}');
            if (!data.ok) {
              throw new Error(data.description || '유효하지 않은 봇 토큰입니다.');
            }
            const results = data.result || [];
            let foundChatId = '';
            let foundName = '';
            for (let i = results.length - 1; i >= 0; i--) {
              const chat =
                results[i]?.message?.chat ||
                results[i]?.edited_message?.chat ||
                results[i]?.my_chat_member?.chat;
              if (chat && chat.id) {
                foundChatId = String(chat.id);
                foundName = [chat.first_name, chat.last_name, chat.username ? `(@${chat.username})` : '']
                  .filter(Boolean)
                  .join(' ');
                break;
              }
            }
            if (!foundChatId) {
              new Notice(
                '⚠️ 아직 봇과 나눈 대화가 없습니다. 텔레그램에서 방금 만든 봇에게 "안녕"이라고 메시지를 한 번 보낸 뒤 다시 눌러 주세요!',
                8000
              );
              return;
            }
            this.plugin.settings.telegramChatId = foundChatId;
            await this.plugin.saveSettings();
            if (chatIdInputEl) chatIdInputEl.value = foundChatId;
            new Notice(`✅ Chat ID 자동 등록 완료: ${foundChatId} ${foundName ? `(${foundName})` : ''}`);
          } catch (err) {
            new Notice(`❌ Chat ID 조회 실패: ${err.message || err}`);
          } finally {
            btn.setButtonText('🔍 Chat ID 자동 찾기');
          }
        })
      );

    new Setting(containerEl)
      .setName('2단계: 내 텔레그램 Chat ID 및 알림 테스트')
      .setDesc('자동으로 채워진 Chat ID(또는 직접 입력한 ID)로 어느 폴더에 어떤 파일이 담겼는지 테스트 알림을 보냅니다.')
      .addText((text) => {
        chatIdInputEl = text.inputEl;
        text
          .setPlaceholder('Chat ID (예: 123456789)')
          .setValue(this.plugin.settings.telegramChatId || '')
          .onChange(async (val) => {
            this.plugin.settings.telegramChatId = val.trim();
            await this.plugin.saveSettings();
          });
      })
      .addButton((btn) =>
        btn
          .setButtonText('📨 테스트 알림 보내기')
          .setCta()
          .onClick(async () => {
            const token = String(this.plugin.settings.telegramBotToken || '').trim();
            const chatId = String(this.plugin.settings.telegramChatId || '').trim();
            if (!token || !chatId) {
              new Notice('봇 토큰과 Chat ID를 먼저 설정해 주세요.');
              return;
            }
            btn.setButtonText('전송 중...');
            try {
              await this.plugin.sendTelegramAlertIfConfigured([
                {
                  folder: '03 구약/01 창세기',
                  fileName: '01 창 1_1 ths 박경수p 창세기 06. 위치와 질서의 하나님 2026.11.04.md'
                }
              ]);
              new Notice('✅ 텔레그램으로 테스트 알림을 발송했습니다! 텔레그램 앱을 확인해 보세요.');
            } catch (err) {
              new Notice(`❌ 테스트 발송 실패: ${err.message || err}`);
            } finally {
              btn.setButtonText('📨 테스트 알림 보내기');
            }
          })
      );
  }
}

module.exports = SermonVaultAIPlugin;
