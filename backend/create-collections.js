const mongoose = require('mongoose');
const ActorProfile = require('./models/ActorProfile');
const ActorRecruitment = require('./models/ActorRecruitment');
const CommunityPost = require('./models/CommunityPost');
const ModelRecruitment = require('./models/ModelRecruitment');
const User = require('./models/User');
require('dotenv').config();

// MongoDB 연결 (Atlas 클라우드 DB 강제 연결)
const connectDB = async () => {
  try {
    // Atlas DB URL 직접 사용 (확실한 연결을 위해)
    const atlasURI = 'mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript?retryWrites=true&w=majority&appName=Cluster0';
    console.log('🌍 Atlas 클라우드 DB에 연결 시도 중...');
    await mongoose.connect(atlasURI);
    console.log('✅ MongoDB Atlas 연결 성공');
  } catch (error) {
    console.error('❌ MongoDB Atlas 연결 실패:', error);
    process.exit(1);
  }
};

// 더미 사용자 생성
const createDummyUsers = async () => {
  try {
    const existingUsers = await User.find().limit(10);
    
    // 최소 4명의 사용자가 필요
    const neededUsers = 4;
    
    if (existingUsers.length >= neededUsers) {
      console.log(`✅ 기존 사용자 ${existingUsers.length}명이 있어 추가 생성을 건너뜁니다.`);
      return existingUsers.slice(0, neededUsers);
    }

    console.log(`📝 ${neededUsers - existingUsers.length}명의 추가 사용자를 생성합니다.`);
    
    const dummyUsers = [];
    
    // 부족한 만큼만 생성
    for (let i = existingUsers.length; i < neededUsers; i++) {
      dummyUsers.push({
        email: `user${i + 1}@example.com`,
        username: `user_${i + 1}`,
        password: 'password123',
        name: `사용자${i + 1}`
      });
    }

    if (dummyUsers.length > 0) {
      const newUsers = await User.insertMany(dummyUsers);
      console.log(`✅ ${newUsers.length}명의 추가 사용자 생성 완료`);
      return [...existingUsers, ...newUsers];
    }

    return existingUsers;
  } catch (error) {
    console.error('❌ 사용자 처리 실패:', error);
    throw error;
  }
};

// 배우 프로필 시드 데이터
const createActorProfiles = async (users) => {
  try {
    const count = await ActorProfile.countDocuments();
    if (count > 0) {
      console.log('✅ ActorProfile 컬렉션이 이미 존재합니다.');
      return;
    }

    const actorProfiles = [
      {
        userId: users[0]._id,
        title: '연기 경력 5년차 배우입니다',
        content: '다양한 장르의 작품에서 연기한 경험이 있습니다. 특히 감정 연기에 자신이 있습니다.',
        name: '김연기',
        age: 28,
        gender: '여성',
        height: 165,
        weight: 50,
        experience: '3-5년',
        education: '한국예술종합학교 연극원 졸업',
        specialty: ['연극', '영화', '드라마'],
        location: '서울',
        contact: {
          phone: '010-1234-5678',
          email: 'actor1@example.com',
          instagram: '@actor_kim',
          portfolio: 'https://portfolio.example.com'
        },
        views: 150
      },
      {
        userId: users[1]._id,
        title: '신인 배우, 열정적으로 임하겠습니다',
        content: '연기에 대한 열정이 넘치는 신인 배우입니다. 다양한 역할에 도전하고 싶습니다.',
        name: '박신인',
        age: 22,
        gender: '남성',
        height: 175,
        weight: 65,
        experience: '신인',
        education: '서울예술대학교 연극과 재학',
        specialty: ['연극', '뮤지컬'],
        location: '경기',
        contact: {
          phone: '010-9876-5432',
          email: 'director1@example.com',
          instagram: '@director_park'
        },
        views: 85
      }
    ];

    await ActorProfile.insertMany(actorProfiles);
    console.log('✅ ActorProfile 컬렉션 생성 및 시드 데이터 삽입 완료');
  } catch (error) {
    console.error('❌ ActorProfile 생성 실패:', error);
    throw error;
  }
};

// 배우 모집공고 시드 데이터
const createActorRecruitments = async (users) => {
  try {
    const count = await ActorRecruitment.countDocuments();
    if (count > 0) {
      console.log('✅ ActorRecruitment 컬렉션이 이미 존재합니다.');
      return;
    }

    const actorRecruitments = [
      {
        userId: users[1]._id,
        title: '독립영화 주연 배우 모집',
        content: '청춘 로맨스 독립영화의 주연 배우를 모집합니다. 20대 초반의 자연스러운 연기를 할 수 있는 분을 찾습니다.',
        category: '영화',
        projectType: '독립',
        roles: [{
          name: '여주인공',
          gender: '여성',
          ageRange: { min: 20, max: 25 },
          description: '대학생 역할, 밝고 긍정적인 성격',
          requirements: ['자연스러운 연기', '로맨스 연기 경험']
        }],
        shootingPeriod: {
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-04-15'),
          isFlexible: true
        },
        location: '서울',
        detailedLocation: '서울 홍대 일대',
        payment: {
          type: '일정액',
          amount: 500000,
          details: '총 50만원 (식비 별도 제공)'
        },
        applicationDeadline: new Date('2024-02-20'),
        applicationMethod: '이메일',
        contactInfo: {
          email: 'casting@movie.com',
          phone: '010-1111-2222'
        },
        experience: '신인 환영',
        tags: ['독립영화', '로맨스', '청춘'],
        views: 245
      },
      {
        userId: users[2]._id,
        title: '웹드라마 조연 배우 급구',
        content: '다음 주부터 촬영 시작하는 웹드라마의 조연 배우를 급하게 모집합니다.',
        category: '웹드라마',
        projectType: '상업',
        roles: [{
          name: '남주인공 친구',
          gender: '남성',
          ageRange: { min: 25, max: 35 },
          description: '유머러스하고 의리 있는 친구 역할',
          requirements: ['코믹 연기', '자연스러운 대화']
        }],
        shootingPeriod: {
          startDate: new Date('2024-02-05'),
          endDate: new Date('2024-02-28'),
          isFlexible: false
        },
        location: '서울',
        payment: {
          type: '일정액',
          amount: 150000,
          details: '일급 15만원, 식비 별도'
        },
        applicationDeadline: new Date('2024-02-03'),
        applicationMethod: '전화',
        contactInfo: {
          phone: '010-3333-4444'
        },
        experience: '경력자 우대',
        tags: ['웹드라마', '코믹', '급구'],
        isUrgent: true,
        views: 189
      }
    ];

    await ActorRecruitment.insertMany(actorRecruitments);
    console.log('✅ ActorRecruitment 컬렉션 생성 및 시드 데이터 삽입 완료');
  } catch (error) {
    console.error('❌ ActorRecruitment 생성 실패:', error);
    throw error;
  }
};

// 커뮤니티 게시글 시드 데이터
const createCommunityPosts = async (users) => {
  try {
    const count = await CommunityPost.countDocuments();
    if (count > 0) {
      console.log('✅ CommunityPost 컬렉션이 이미 존재합니다.');
      return;
    }

    const communityPosts = [
      {
        userId: users[0]._id,
        title: '연기 초보자를 위한 감정 표현 팁',
        content: '연기를 처음 시작하는 분들을 위해 감정 표현하는 방법들을 공유합니다. 첫 번째로 중요한 것은 자신의 감정을 먼저 이해하는 것입니다...',
        category: '연기 팁',
        postType: '일반',
        tags: ['연기팁', '초보자', '감정표현'],
        location: '전국',
        views: 324,
        likeCount: 15,
        commentCount: 8
      },
      {
        userId: users[1]._id,
        title: '[공지] 신인 배우 오디션 정보',
        content: '다음 달에 있을 신인 배우 오디션 정보를 공유합니다. 많은 관심 부탁드립니다.',
        category: '오디션 정보',
        postType: '공지',
        tags: ['오디션', '신인배우', '공지'],
        location: '서울',
        isPinned: true,
        views: 156,
        likeCount: 23,
        commentCount: 12
      },
      {
        userId: users[2]._id,
        title: '연기 스터디 모집합니다',
        content: '매주 토요일에 만나서 같이 연기 연습할 스터디원을 모집합니다. 초보자도 환영!',
        category: '스터디 모집',
        postType: '일반',
        tags: ['스터디', '연기연습', '모집'],
        location: '서울',
        recruitment: {
          isRecruiting: true,
          maxParticipants: 6,
          currentParticipants: 2,
          deadline: new Date('2024-02-15'),
          contactMethod: '댓글'
        },
        views: 98,
        likeCount: 7,
        commentCount: 5
      }
    ];

    await CommunityPost.insertMany(communityPosts);
    console.log('✅ CommunityPost 컬렉션 생성 및 시드 데이터 삽입 완료');
  } catch (error) {
    console.error('❌ CommunityPost 생성 실패:', error);
    throw error;
  }
};

// 모델 모집공고 시드 데이터
const createModelRecruitments = async (users) => {
  try {
    const count = await ModelRecruitment.countDocuments();
    if (count > 0) {
      console.log('✅ ModelRecruitment 컬렉션이 이미 존재합니다.');
      return;
    }

    const modelRecruitments = [
      {
        userId: users[1]._id,
        title: '패션 화보 촬영 여성 모델 모집',
        content: '봄 컬렉션 패션 화보 촬영을 위한 여성 모델을 모집합니다. 자연스럽고 우아한 포즈가 가능한 분을 찾습니다.',
        category: '화보촬영',
        modelType: '패션모델',
        requirements: {
          gender: '여성',
          ageRange: { min: 20, max: 30 },
          heightRange: { min: 165, max: 175 },
          bodyType: '마른형',
          experience: '경력자 우대',
          specialRequirements: ['패션 화보 경험', '포즈 연출 가능']
        },
        workPeriod: {
          startDate: new Date('2024-03-10'),
          endDate: new Date('2024-03-12'),
          duration: '3일',
          isFlexible: false
        },
        location: '서울',
        detailedLocation: '강남구 스튜디오',
        payment: {
          type: '일급',
          amount: 300000,
          currency: 'KRW',
          additionalBenefits: ['식사제공', '교통비지원'],
          details: '일급 30만원, 3일간 총 90만원'
        },
        applicationDeadline: new Date('2024-02-25'),
        applicationMethod: '이메일',
        contactInfo: {
          email: 'casting@fashion.com',
          company: '패션하우스 스튜디오'
        },
        portfolioRequirements: {
          photos: true,
          videos: false,
          measurements: true,
          resume: true
        },
        tags: ['패션', '화보', '여성모델'],
        views: 167
      },
      {
        userId: users[3]._id,
        title: '광고 촬영 핸드 모델 급구',
        content: '스킨케어 제품 광고 촬영을 위한 핸드 모델을 급하게 모집합니다.',
        category: '광고촬영',
        modelType: '핸드모델',
        requirements: {
          gender: '무관',
          ageRange: { min: 20, max: 40 },
          experience: '무관',
          specialRequirements: ['깔끔한 손', '매니큐어 관리 가능']
        },
        workPeriod: {
          startDate: new Date('2024-02-08'),
          endDate: new Date('2024-02-08'),
          duration: '4시간',
          isFlexible: true
        },
        location: '서울',
        payment: {
          type: '건당',
          amount: 200000,
          details: '4시간 촬영 건당 20만원'
        },
        applicationDeadline: new Date('2024-02-05'),
        applicationMethod: '전화',
        contactInfo: {
          phone: '010-5555-6666',
          company: '광고제작사'
        },
        portfolioRequirements: {
          photos: true,
          videos: false,
          measurements: false,
          resume: false
        },
        tags: ['광고', '핸드모델', '급구'],
        isUrgent: true,
        views: 234
      }
    ];

    await ModelRecruitment.insertMany(modelRecruitments);
    console.log('✅ ModelRecruitment 컬렉션 생성 및 시드 데이터 삽입 완료');
  } catch (error) {
    console.error('❌ ModelRecruitment 생성 실패:', error);
    throw error;
  }
};

// 메인 실행 함수
const createCollections = async () => {
  try {
    await connectDB();
    
    console.log('🚀 컬렉션 생성 작업을 시작합니다...');
    
    // 더미 사용자 생성
    const users = await createDummyUsers();
    
    // 각 컬렉션 생성
    await createActorProfiles(users);
    await createActorRecruitments(users);
    await createCommunityPosts(users);
    await createModelRecruitments(users);
    
    console.log('✅ 모든 컬렉션 생성 완료!');
    console.log('✅ MongoDB Compass에서 다음 컬렉션들을 확인할 수 있습니다:');
    console.log('   - actorprofiles');
    console.log('   - actorrecruitments');
    console.log('   - communityposts');
    console.log('   - modelrecruitments');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 컬렉션 생성 중 오류 발생:', error);
    process.exit(1);
  }
};

// 스크립트 직접 실행 시
if (require.main === module) {
  createCollections();
}

module.exports = { createCollections }; 