export interface HebrewAlphabetEntry {
  letter: string;
  name: string;
  value: number;
  picture: string;
  meaning: string;
}

export const HEBREW_ALPHABET_INTRO =
  "히브리어 알파벳은 단순한 글자가 아니라 고대 히브리인들의 그림 언어에서 발전했습니다. 다만 아래 표의 상형의 의미는 문자의 고대 기원을 설명하는 것이며, 성경 해석의 절대 기준은 아닙니다. 성경 연구에서는 항상 문자적 의미(Peshat)를 먼저 살펴야 합니다.";

export const HEBREW_ALPHABET: HebrewAlphabetEntry[] = [
  {
    letter: "א",
    name: "알레프 (Aleph)",
    value: 1,
    picture: "소의 머리",
    meaning: "힘, 지도자, 첫째, 하나님",
  },
  {
    letter: "ב",
    name: "베트 (Bet)",
    value: 2,
    picture: "집",
    meaning: "집, 가족, 내부, 언약",
  },
  {
    letter: "ג",
    name: "기멜 (Gimel)",
    value: 3,
    picture: "낙타",
    meaning: "이동, 공급, 은혜",
  },
  {
    letter: "ד",
    name: "달렛 (Dalet)",
    value: 4,
    picture: "문",
    meaning: "출입, 길, 선택",
  },
  {
    letter: "ה",
    name: "헤 (He)",
    value: 5,
    picture: "창문/숨",
    meaning: "계시, 생명, 하나님의 숨결",
  },
  {
    letter: "ו",
    name: "바브 (Vav)",
    value: 6,
    picture: "못, 갈고리",
    meaning: "연결, 결합, 연합",
  },
  {
    letter: "ז",
    name: "자인 (Zayin)",
    value: 7,
    picture: "무기",
    meaning: "싸움, 보호, 양식",
  },
  {
    letter: "ח",
    name: "헤트 (Chet)",
    value: 8,
    picture: "울타리",
    meaning: "경계, 생명, 새로운 시작",
  },
  {
    letter: "ט",
    name: "테트 (Tet)",
    value: 9,
    picture: "뱀/감긴 것",
    meaning: "감춰진 선함",
  },
  {
    letter: "י",
    name: "요드 (Yod)",
    value: 10,
    picture: "손",
    meaning: "행위, 창조, 능력",
  },
  {
    letter: "כ",
    name: "카프 (Kaf)",
    value: 20,
    picture: "손바닥",
    meaning: "받음, 덮음, 축복",
  },
  {
    letter: "ל",
    name: "라메드 (Lamed)",
    value: 30,
    picture: "목자의 지팡이",
    meaning: "가르침, 권위, 인도",
  },
  {
    letter: "מ",
    name: "멤 (Mem)",
    value: 40,
    picture: "물",
    meaning: "생명, 말씀, 변화",
  },
  {
    letter: "נ",
    name: "눈 (Nun)",
    value: 50,
    picture: "씨앗/물고기",
    meaning: "생명, 후손, 지속성",
  },
  {
    letter: "ס",
    name: "사멕 (Samekh)",
    value: 60,
    picture: "기둥",
    meaning: "지지, 보호, 의지",
  },
  {
    letter: "ע",
    name: "아인 (Ayin)",
    value: 70,
    picture: "눈",
    meaning: "봄, 깨달음, 통찰",
  },
  {
    letter: "פ",
    name: "페 (Pe)",
    value: 80,
    picture: "입",
    meaning: "말, 선포, 창조적 언어",
  },
  {
    letter: "צ",
    name: "차디 (Tsadi)",
    value: 90,
    picture: "의인",
    meaning: "의, 겸손, 순종",
  },
  {
    letter: "ק",
    name: "코프 (Qof)",
    value: 100,
    picture: "태양/뒤통수",
    meaning: "거룩함, 순환, 영성",
  },
  {
    letter: "ר",
    name: "레쉬 (Resh)",
    value: 200,
    picture: "머리",
    meaning: "시작, 우두머리",
  },
  {
    letter: "ש",
    name: "쉰 (Shin)",
    value: 300,
    picture: "이빨",
    meaning: "불, 변화, 소비",
  },
  {
    letter: "ת",
    name: "타브 (Tav)",
    value: 400,
    picture: "표식(X)",
    meaning: "언약, 인침, 완성",
  },
];
