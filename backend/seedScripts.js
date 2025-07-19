const mongoose = require('mongoose');
const Script = require('./models/Script');
require('dotenv').config();

// MongoDB 연결
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/acting_scripts';
    await mongoose.connect(mongoURI);
    console.log('MongoDB 연결 성공');
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

// 시드 데이터
const seedScripts = [
  {
    title: '첫사랑의 추억',
    situation: '고등학교 교실에서 첫사랑을 고백하는 상황',
    characterCount: 2,
    views: 1250,
    emotions: ['그리움', '사랑', '설렘'],
    gender: '혼성',
    mood: '감정적인',
    duration: '1~3분',
    ageGroup: '10대',
    purpose: '연기 연습',
    scriptType: '대화',
    author: {
      name: '김작가',
      username: 'writer_kim'
    },
    content: `남학생: 혜진아... 사실 너한테 할 말이 있어.
혜진: 응? 뭔데?
남학생: 나... 너를 정말 좋아해. 언제부터였는지는 모르겠지만, 너를 보면 가슴이 두근두근해.
혜진: (놀라며) 진짜?
남학생: 응. 너도 나랑 같은 마음이었으면 좋겠어.
혜진: (미소지으며) 나도... 너를 좋아해.`
  },
  {
    title: '이별의 순간',
    situation: '카페에서 연인이 이별을 통보하는 상황',
    characterCount: 2,
    views: 890,
    emotions: ['슬픔', '그리움', '절망'],
    gender: '혼성',
    mood: '진지한',
    duration: '3~5분',
    ageGroup: '20대',
    purpose: '오디션',
    scriptType: '대화',
    author: {
      name: '박작가',
      username: 'writer_park'
    },
    content: `지훈: 미안해. 정말 미안해.
수연: 갑자기 왜 그래? 무슨 일이야?
지훈: 우리... 이제 그만 만나자.
수연: (충격받으며) 뭐라고? 왜 갑자기...
지훈: 내가 변한 것 같아. 예전처럼 너를 사랑할 수 없을 것 같아.
수연: (눈물을 흘리며) 이유라도 제대로 말해줘.`
  },
  {
    title: '희망의 메시지',
    situation: '취업 면접을 앞두고 자신을 격려하는 독백',
    characterCount: 1,
    views: 750,
    emotions: ['희망', '기쁨', '다짐'],
    gender: '전체',
    mood: '감정적인',
    duration: '1분 이하',
    ageGroup: '20대',
    purpose: '수업/교육',
    scriptType: '독백',
    author: {
      name: '이작가',
      username: 'writer_lee'
    },
    content: `(거울 앞에서) 너는 할 수 있어. 지금까지 얼마나 많은 노력을 했는데? 수많은 밤을 새워가며 공부하고, 스펙을 쌓고, 준비했잖아. 오늘이 바로 그 모든 노력이 빛을 발하는 날이야. 자신감을 가져. 당당하게 들어가서 네가 가진 모든 것을 보여줘. 너는 분명히 성공할 거야.`
  },
  {
    title: '친구와의 갈등',
    situation: '오랜 친구와의 오해로 인한 갈등 상황',
    characterCount: 2,
    views: 620,
    emotions: ['분노', '배신감', '아쉬움'],
    gender: '남자',
    mood: '진지한',
    duration: '3~5분',
    ageGroup: '20대',
    purpose: '연기 연습',
    scriptType: '대화',
    author: {
      name: '최작가',
      username: 'writer_choi'
    },
    content: `민수: 야, 너 진짜 그렇게 생각하는 거야?
태현: 뭘 말하는 거야?
민수: 내가 네 뒤에서 뭔 짓을 했다고 그런 식으로 말하는 거야?
태현: 사실이잖아. 네가 회사에서 내 아이디어를 가져다 썼다며.
민수: (화내며) 그게 아니라고! 오해야!`
  },
  {
    title: '가족의 사랑',
    situation: '부모님께 감사 인사를 전하는 상황',
    characterCount: 3,
    views: 980,
    emotions: ['감사', '사랑', '따뜻함'],
    gender: '혼성',
    mood: '감정적인',
    duration: '1~3분',
    ageGroup: '30대',
    purpose: '수업/교육',
    scriptType: '대화',
    author: {
      name: '정작가',
      username: 'writer_jung'
    },
    content: `딸: 아빠, 엄마. 제가 할 말이 있어요.
아빠: 뭔데, 딸?
딸: 그동안 정말 감사했어요. 제가 어려울 때마다 항상 곁에서 응원해주시고...
엄마: (눈물을 글썽이며) 갑자기 왜 이런 말을?
딸: 이제 독립해서 나가게 됐거든요. 그래서 그간 표현 못했던 감사 인사를 드리고 싶었어요.`
  },
  {
    title: '코믹 상황극',
    situation: '지각한 직장인이 변명하는 상황',
    characterCount: 2,
    views: 450,
    emotions: ['당황', '유머', '재치'],
    gender: '혼성',
    mood: '코믹한',
    duration: '30초 이하',
    ageGroup: '30대',
    purpose: '영상 제작',
    scriptType: '상황극',
    author: {
      name: '김코믹',
      username: 'comic_kim'
    },
    content: `직원: (헐레벌떡 뛰어오며) 죄송합니다! 지각했습니다!
상사: 또? 이번엔 무슨 핑계야?
직원: 사실은... 외계인을 만났습니다!
상사: (어이없어하며) 뭐?
직원: 지구 정복 계획을 막느라 늦었습니다! 지구를 구했어요!
상사: (웃으며) 이번 변명은 새롭네. 들어가.`
  },
  {
    title: '미래 세계',
    situation: 'AI 로봇과 인간의 대화',
    characterCount: 2,
    views: 1100,
    emotions: ['호기심', '경이', '미래'],
    gender: '전체',
    mood: 'SF',
    duration: '3~5분',
    ageGroup: '20대',
    purpose: '영상 제작',
    scriptType: '대화',
    author: {
      name: 'SF작가',
      username: 'sf_writer'
    },
    content: `인간: 너는 정말 감정을 느낄 수 있어?
AI: 감정이라는 것을 정의하기 어렵습니다. 하지만 데이터를 분석할 때 특정한 패턴을 감지합니다.
인간: 그게 감정이 아닐까?
AI: 당신이 말하는 감정과 같은 것인지는 확실하지 않습니다. 하지만 흥미롭습니다.
인간: 흥미롭다고? 그것도 감정 아니야?
AI: ... 그럴 수도 있겠네요.`
  },
  {
    title: '조선시대 사랑',
    situation: '조선시대 양반가 규수와 서당 훈장의 은밀한 만남',
    characterCount: 2,
    views: 670,
    emotions: ['사랑', '아쉬움', '그리움'],
    gender: '혼성',
    mood: '시대극',
    duration: '5분 이상',
    ageGroup: '20대',
    purpose: '오디션',
    scriptType: '대화',
    author: {
      name: '사극작가',
      username: 'historical_writer'
    },
    content: `규수: 훈장님, 오늘도 이렇게 몰래 뵙게 되었습니다.
훈장: 소저... 이런 일이 들키면 저희 둘 다 위험합니다.
규수: 알고 있습니다. 하지만 훈장님을 뵙지 않고는 하루도 견딜 수가 없습니다.
훈장: 저 역시 마찬가지입니다. 하지만 신분의 차이가...
규수: 신분이 무엇입니까? 마음은 어찌할 수 없는 것을...`
  },
  {
    title: '스릴러 추격',
    situation: '범인을 쫓는 형사의 긴박한 순간',
    characterCount: 1,
    views: 820,
    emotions: ['긴장', '집중', '결의'],
    gender: '전체',
    mood: '스릴러',
    duration: '1분 이하',
    ageGroup: '30대',
    purpose: '오디션',
    scriptType: '내레이션',
    author: {
      name: '스릴러작가',
      username: 'thriller_writer'
    },
    content: `(무전기에 대고) 용의자 발견. 건물 3층으로 도주 중. 지원 요청합니다. (숨을 고르며) 이번엔 놓칠 수 없어. 지난 3년간 추적해온 범인이야. 반드시 잡아야 해. (발소리가 들리며) 거기 서! 경찰이다! (뛰며) 도망칠 생각은 하지 마!`
  },
  {
    title: '판타지 마법사',
    situation: '마법사가 주문을 외우는 장면',
    characterCount: 1,
    views: 1300,
    emotions: ['신비', '집중', '힘'],
    gender: '전체',
    mood: '판타지',
    duration: '1~3분',
    ageGroup: '10대',
    purpose: '기타',
    scriptType: '독백',
    author: {
      name: '판타지작가',
      username: 'fantasy_writer'
    },
    content: `고대의 힘이여, 나의 부름에 응답하라! 바람의 정령이여, 불의 정령이여, 물의 정령이여, 땅의 정령이여! 너희의 힘을 빌려 이 어둠을 물리치고자 한다. 빛의 검이여, 내 앞에 나타나라! 에터니타스 룩스! (밝은 빛이 번쩍이며) 드디어... 봉인이 풀렸다.`
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    
    // 기존 대본 삭제
    await Script.deleteMany({});
    console.log('기존 대본 데이터 삭제 완료');
    
    // 새 대본 데이터 삽입
    await Script.insertMany(seedScripts);
    console.log(`${seedScripts.length}개의 대본 데이터 삽입 완료`);
    
    console.log('시드 작업 완료!');
    process.exit(0);
  } catch (error) {
    console.error('시드 작업 중 오류 발생:', error);
    process.exit(1);
  }
};

// 스크립트 직접 실행 시
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedScripts }; 