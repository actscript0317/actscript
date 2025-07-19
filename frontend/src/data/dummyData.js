// 더미 사용자 데이터 구조
const dummyUser = {
  _id: 'user123',
  name: '김연기',
  username: 'actor_kim',
  email: 'actor@example.com',
  profileImage: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  role: 'user', // 'user', 'admin'
  isActive: true,
  preferences: {
    favoriteEmotions: ['사랑', '그리움', '기쁨'],
    notificationSettings: {
      email: true,
      push: false
    }
  },
  stats: {
    scriptsCreated: 5,
    scriptsLiked: 12,
    profileViews: 156
  }
};

// 더미 대본 데이터 - 확장된 필터링을 위한 메타데이터 포함
const dummyScripts = [
  {
    _id: '1',
    title: '첫사랑의 추억',
    situation: '고등학교 교실에서 첫사랑을 고백하는 상황',
    characterCount: 2,
    views: 1250,
    emotions: ['그리움', '사랑', '설렘'],
    createdAt: '2024-01-15T00:00:00.000Z',
    author: {
      name: '김작가',
      username: 'writer_kim'
    },
    // 확장된 메타데이터
    gender: '혼성', // 전체, 여자, 남자, 혼성
    mood: '감정적인', // 감정적인, 코믹한, 진지한, 로맨스, 스릴러, 판타지, SF, 시대극
    duration: '1~3분', // 30초 이하, 1분 이하, 1~3분, 3~5분, 5분 이상
    ageGroup: '10대', // 10대, 20대, 30대, 40대 이상
    purpose: '연기 연습', // 오디션, 연기 연습, 영상 제작, 수업/교육, 기타
    scriptType: '대화', // 상황극, 독백, 대화, 내레이션
    content: `남학생: 혜진아... 사실 너한테 할 말이 있어.
혜진: 응? 뭔데?
남학생: 나... 너를 정말 좋아해. 언제부터였는지는 모르겠지만, 너를 보면 가슴이 두근두근해.
혜진: (놀라며) 진짜?
남학생: 응. 너도 나랑 같은 마음이었으면 좋겠어.
혜진: (미소지으며) 나도... 너를 좋아해.`
  },
  {
    _id: '2',
    title: '이별의 순간',
    situation: '카페에서 연인이 이별을 통보하는 상황',
    characterCount: 2,
    views: 890,
    emotions: ['슬픔', '그리움', '절망'],
    createdAt: '2024-01-10T00:00:00.000Z',
    author: {
      name: '박작가',
      username: 'writer_park'
    },
    gender: '혼성',
    mood: '진지한',
    duration: '3~5분',
    ageGroup: '20대',
    purpose: '오디션',
    scriptType: '대화',
    content: `지훈: 미안해. 정말 미안해.
수연: 갑자기 왜 그래? 무슨 일이야?
지훈: 우리... 이제 그만 만나자.
수연: (충격받으며) 뭐라고? 왜 갑자기...
지훈: 내가 변한 것 같아. 예전처럼 너를 사랑할 수 없을 것 같아.
수연: (눈물을 흘리며) 이유라도 제대로 말해줘.`
  },
  {
    _id: '3',
    title: '희망의 메시지',
    situation: '취업 면접을 앞두고 자신을 격려하는 독백',
    characterCount: 1,
    views: 750,
    emotions: ['희망', '기쁨', '다짐'],
    createdAt: '2024-01-05T00:00:00.000Z',
    author: {
      name: '이작가',
      username: 'writer_lee'
    },
    gender: '전체',
    mood: '감정적인',
    duration: '1분 이하',
    ageGroup: '20대',
    purpose: '수업/교육',
    scriptType: '독백',
    content: `(거울 앞에서) 너는 할 수 있어. 지금까지 얼마나 많은 노력을 했는데? 수많은 밤을 새워가며 공부하고, 스펙을 쌓고, 준비했잖아. 오늘이 바로 그 모든 노력이 빛을 발하는 날이야. 자신감을 가져. 당당하게 들어가서 네가 가진 모든 것을 보여줘. 너는 분명히 성공할 거야.`
  },
  {
    _id: '4',
    title: '친구와의 갈등',
    situation: '오랜 친구와의 오해로 인한 갈등 상황',
    characterCount: 2,
    views: 620,
    emotions: ['분노', '배신감', '아쉬움'],
    createdAt: '2024-01-08T00:00:00.000Z',
    author: {
      name: '최작가',
      username: 'writer_choi'
    },
    gender: '남자',
    mood: '진지한',
    duration: '3~5분',
    ageGroup: '20대',
    purpose: '연기 연습',
    scriptType: '대화',
    content: `민수: 야, 너 진짜 그렇게 생각하는 거야?
태현: 뭘 말하는 거야?
민수: 내가 네 뒤에서 뭔 짓을 했다고 그런 식으로 말하는 거야?
태현: 사실이잖아. 네가 회사에서 내 아이디어를 가져다 썼다며.
민수: (화내며) 그게 아니라고! 오해야!`
  },
  {
    _id: '5',
    title: '가족의 사랑',
    situation: '부모님께 감사 인사를 전하는 상황',
    characterCount: 3,
    views: 980,
    emotions: ['감사', '사랑', '따뜻함'],
    createdAt: '2024-01-12T00:00:00.000Z',
    author: {
      name: '정작가',
      username: 'writer_jung'
    },
    gender: '혼성',
    mood: '감정적인',
    duration: '1~3분',
    ageGroup: '30대',
    purpose: '수업/교육',
    scriptType: '대화',
    content: `딸: 아빠, 엄마. 제가 할 말이 있어요.
아빠: 뭔데, 딸?
딸: 그동안 정말 감사했어요. 제가 어려울 때마다 항상 곁에서 응원해주시고...
엄마: (눈물을 글썽이며) 갑자기 왜 이런 말을?
딸: 이제 독립해서 나가게 됐거든요. 그래서 그간 표현 못했던 감사 인사를 드리고 싶었어요.`
  },
  {
    _id: '6',
    title: '코믹 상황극',
    situation: '지각한 직장인이 변명하는 상황',
    characterCount: 2,
    views: 450,
    emotions: ['당황', '유머', '재치'],
    createdAt: '2024-01-20T00:00:00.000Z',
    author: {
      name: '김코믹',
      username: 'comic_kim'
    },
    gender: '혼성',
    mood: '코믹한',
    duration: '30초 이하',
    ageGroup: '30대',
    purpose: '영상 제작',
    scriptType: '상황극',
    content: `직원: (헐레벌떡 뛰어오며) 죄송합니다! 지각했습니다!
상사: 또? 이번엔 무슨 핑계야?
직원: 사실은... 외계인을 만났습니다!
상사: (어이없어하며) 뭐?
직원: 지구 정복 계획을 막느라 늦었습니다! 지구를 구했어요!
상사: (웃으며) 이번 변명은 새롭네. 들어가.`
  },
  {
    _id: '7',
    title: '미래 세계',
    situation: 'AI 로봇과 인간의 대화',
    characterCount: 2,
    views: 1100,
    emotions: ['호기심', '경이', '미래'],
    createdAt: '2024-01-18T00:00:00.000Z',
    author: {
      name: 'SF작가',
      username: 'sf_writer'
    },
    gender: '전체',
    mood: 'SF',
    duration: '3~5분',
    ageGroup: '20대',
    purpose: '영상 제작',
    scriptType: '대화',
    content: `인간: 너는 정말 감정을 느낄 수 있어?
AI: 감정이라는 것을 정의하기 어렵습니다. 하지만 데이터를 분석할 때 특정한 패턴을 감지합니다.
인간: 그게 감정이 아닐까?
AI: 당신이 말하는 감정과 같은 것인지는 확실하지 않습니다. 하지만 흥미롭습니다.
인간: 흥미롭다고? 그것도 감정 아니야?
AI: ... 그럴 수도 있겠네요.`
  },
  {
    _id: '8',
    title: '조선시대 사랑',
    situation: '조선시대 양반가 규수와 서당 훈장의 은밀한 만남',
    characterCount: 2,
    views: 670,
    emotions: ['사랑', '아쉬움', '그리움'],
    createdAt: '2024-01-16T00:00:00.000Z',
    author: {
      name: '사극작가',
      username: 'historical_writer'
    },
    gender: '혼성',
    mood: '시대극',
    duration: '5분 이상',
    ageGroup: '20대',
    purpose: '오디션',
    scriptType: '대화',
    content: `규수: 훈장님, 오늘도 이렇게 몰래 뵙게 되었습니다.
훈장: 소저... 이런 일이 들키면 저희 둘 다 위험합니다.
규수: 알고 있습니다. 하지만 훈장님을 뵙지 않고는 하루도 견딜 수가 없습니다.
훈장: 저 역시 마찬가지입니다. 하지만 신분의 차이가...
규수: 신분이 무엇입니까? 마음은 어찌할 수 없는 것을...`
  },
  {
    _id: '9',
    title: '스릴러 추격',
    situation: '범인을 쫓는 형사의 긴박한 순간',
    characterCount: 1,
    views: 820,
    emotions: ['긴장', '집중', '결의'],
    createdAt: '2024-01-14T00:00:00.000Z',
    author: {
      name: '스릴러작가',
      username: 'thriller_writer'
    },
    gender: '전체',
    mood: '스릴러',
    duration: '1분 이하',
    ageGroup: '30대',
    purpose: '오디션',
    scriptType: '내레이션',
    content: `(무전기에 대고) 용의자 발견. 건물 3층으로 도주 중. 지원 요청합니다. (숨을 고르며) 이번엔 놓칠 수 없어. 지난 3년간 추적해온 범인이야. 반드시 잡아야 해. (발소리가 들리며) 거기 서! 경찰이다! (뛰며) 도망칠 생각은 하지 마!`
  },
  {
    _id: '10',
    title: '판타지 마법사',
    situation: '마법사가 주문을 외우는 장면',
    characterCount: 1,
    views: 1300,
    emotions: ['신비', '집중', '힘'],
    createdAt: '2024-01-22T00:00:00.000Z',
    author: {
      name: '판타지작가',
      username: 'fantasy_writer'
    },
    gender: '전체',
    mood: '판타지',
    duration: '1~3분',
    ageGroup: '10대',
    purpose: '기타',
    scriptType: '독백',
    content: `고대의 힘이여, 나의 부름에 응답하라! 바람의 정령이여, 불의 정령이여, 물의 정령이여, 땅의 정령이여! 너희의 힘을 빌려 이 어둠을 물리치고자 한다. 빛의 검이여, 내 앞에 나타나라! 에터니타스 룩스! (밝은 빛이 번쩍이며) 드디어... 봉인이 풀렸다.`
  }
];

// 더미 감정 데이터
const dummyEmotions = [
  { _id: '1', name: '그리움', description: '그리워하는 마음' },
  { _id: '2', name: '사랑', description: '사랑하는 마음' },
  { _id: '3', name: '설렘', description: '설레는 마음' },
  { _id: '4', name: '슬픔', description: '슬픈 마음' },
  { _id: '5', name: '절망', description: '절망적인 마음' },
  { _id: '6', name: '희망', description: '희망적인 마음' },
  { _id: '7', name: '기쁨', description: '기쁜 마음' },
  { _id: '8', name: '다짐', description: '다짐하는 마음' },
  { _id: '9', name: '분노', description: '화나는 마음' },
  { _id: '10', name: '배신감', description: '배신당한 마음' },
  { _id: '11', name: '아쉬움', description: '아쉬운 마음' },
  { _id: '12', name: '감사', description: '감사한 마음' },
  { _id: '13', name: '따뜻함', description: '따뜻한 마음' },
  { _id: '14', name: '당황', description: '당황하는 마음' },
  { _id: '15', name: '유머', description: '유머러스한 마음' },
  { _id: '16', name: '재치', description: '재치있는 마음' },
  { _id: '17', name: '호기심', description: '호기심 많은 마음' },
  { _id: '18', name: '경이', description: '경이로운 마음' },
  { _id: '19', name: '미래', description: '미래에 대한 마음' },
  { _id: '20', name: '긴장', description: '긴장하는 마음' },
  { _id: '21', name: '집중', description: '집중하는 마음' },
  { _id: '22', name: '결의', description: '결의에 찬 마음' },
  { _id: '23', name: '신비', description: '신비로운 마음' },
  { _id: '24', name: '힘', description: '힘에 찬 마음' }
];

// 필터 옵션 정의
const filterOptions = {
  gender: [
    { value: '', label: '전체' },
    { value: '여자', label: '여자' },
    { value: '남자', label: '남자' },
    { value: '혼성', label: '혼성' }
  ],
  characterCount: [
    { value: '', label: '전체' },
    { value: '1', label: '1인극 (독백)' },
    { value: '2', label: '2인극' },
    { value: '3+', label: '3인 이상' }
  ],
  mood: [
    { value: '', label: '전체' },
    { value: '감정적인', label: '감정적인' },
    { value: '코믹한', label: '코믹한' },
    { value: '진지한', label: '진지한' },
    { value: '로맨스', label: '로맨스' },
    { value: '스릴러', label: '스릴러' },
    { value: '판타지', label: '판타지' },
    { value: 'SF', label: 'SF' },
    { value: '시대극', label: '시대극' }
  ],
  duration: [
    { value: '', label: '전체' },
    { value: '30초 이하', label: '30초 이하' },
    { value: '1분 이하', label: '1분 이하' },
    { value: '1~3분', label: '1~3분' },
    { value: '3~5분', label: '3~5분' },
    { value: '5분 이상', label: '5분 이상' }
  ],
  ageGroup: [
    { value: '', label: '전체' },
    { value: '10대', label: '10대' },
    { value: '20대', label: '20대' },
    { value: '30대', label: '30대' },
    { value: '40대 이상', label: '40대 이상' }
  ],
  purpose: [
    { value: '', label: '전체' },
    { value: '오디션', label: '오디션' },
    { value: '연기 연습', label: '연기 연습' },
    { value: '영상 제작', label: '영상 제작' },
    { value: '수업/교육', label: '수업/교육' },
    { value: '기타', label: '기타' }
  ],
  scriptType: [
    { value: '', label: '전체' },
    { value: '상황극', label: '상황극' },
    { value: '독백', label: '독백' },
    { value: '대화', label: '대화' },
    { value: '내레이션', label: '내레이션' }
  ]
};

// 더미 좋아요 데이터 구조
export const dummyLikedScript = {
  ...dummyScripts[0], // 첫 번째 대본을 예시로 사용
  likedAt: '2024-01-20T10:30:00.000Z' // 좋아요를 누른 시간
};

// 더미 감정 데이터 구조
export const dummyEmotion = {
  _id: 'emotion123',
  name: '사랑',
  description: '사랑하는 마음을 표현하는 감정',
  icon: '❤️',
  color: '#ef4444', // 색상 코드
  category: 'positive', // 'positive', 'negative', 'neutral'
  relatedEmotions: ['그리움', '설렘', '행복'],
  scriptCount: 156, // 이 감정을 가진 대본 수
  createdAt: '2024-01-01T00:00:00.000Z'
};

// API 응답 구조 예시
export const apiResponseStructure = {
  // 로그인 성공 응답
  loginSuccess: {
    success: true,
    message: '로그인 성공',
    data: {
      user: dummyUser,
      token: 'jwt-token-string'
    }
  },

  // 대본 목록 응답
  scriptsResponse: {
    success: true,
    data: {
      scripts: dummyScripts,
      pagination: {
        currentPage: 1,
        totalPages: 10,
        totalScripts: 95,
        hasNextPage: true,
        hasPrevPage: false
      }
    }
  },

  // 좋아요한 대본 목록 응답
  likedScriptsResponse: {
    success: true,
    data: {
      likedScripts: [dummyLikedScript],
      total: 12
    }
  }
};

export {
  dummyUser,
  dummyScripts,
  dummyLikedScript,
  dummyEmotion,
  apiResponseStructure,
  filterOptions
}; 