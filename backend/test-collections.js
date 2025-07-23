const mongoose = require('mongoose');
require('dotenv').config();

// 모델 임포트
const ActorProfile = require('./models/ActorProfile');
const ActorRecruitment = require('./models/ActorRecruitment');
const ModelRecruitment = require('./models/ModelRecruitment');
const CommunityPost = require('./models/CommunityPost');
const Like = require('./models/Like');
const Bookmark = require('./models/Bookmark');

async function testCollections() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mcstudio0317:51145114ee@cluster0.esputxc.mongodb.net/actscript?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ MongoDB 연결 성공');

    // 기존 컬렉션 확인
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 현재 컬렉션 목록:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // 더미 사용자 ID (실제 사용자가 있다고 가정)
    const dummyUserId = new mongoose.Types.ObjectId();

    // 1. ActorProfile 테스트 데이터 생성
    console.log('\n🎭 배우 프로필 생성 중...');
    const actorProfile = new ActorProfile({
      userId: dummyUserId,
      title: '신인 배우 김지영입니다',
      content: '열정적이고 성실한 신인 배우입니다. 다양한 장르에 도전하고 싶습니다.',
      name: '김지영',
      age: 25,
      gender: '여성',
      height: 165,
      weight: 50,
      experience: '신인',
      education: '연기예술학과 졸업',
      specialty: ['연극', '영화'],
      location: '서울',
      contact: {
        email: 'test@example.com',
        phone: '010-1234-5678'
      }
    });
    await actorProfile.save();
    console.log('✅ 배우 프로필 생성 완료');

    // 2. ActorRecruitment 테스트 데이터 생성
    console.log('\n🎬 배우 모집 공고 생성 중...');
    const actorRecruitment = new ActorRecruitment({
      userId: dummyUserId,
      title: '단편영화 주연 배우 모집',
      content: '감동적인 가족 드라마 단편영화의 주연 배우를 모집합니다.',
      category: '단편영화',
      projectType: '독립',
      roles: [{
        name: '주인공',
        gender: '여성',
        ageRange: { min: 20, max: 30 },
        description: '따뜻하고 진실한 캐릭터'
      }],
      location: '서울',
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
      applicationMethod: '이메일',
      payment: {
        type: '실비',
        details: '교통비 및 식비 지원'
      },
      contactInfo: {
        email: 'casting@example.com'
      }
    });
    await actorRecruitment.save();
    console.log('✅ 배우 모집 공고 생성 완료');

    // 3. ModelRecruitment 테스트 데이터 생성
    console.log('\n📸 모델 모집 공고 생성 중...');
    const modelRecruitment = new ModelRecruitment({
      userId: dummyUserId,
      title: '화장품 광고 모델 모집',
      content: '자연스럽고 깨끗한 이미지의 화장품 광고 모델을 모집합니다.',
      category: '광고촬영',
      modelType: '광고모델',
      requirements: {
        gender: '여성',
        ageRange: { min: 20, max: 35 }
      },
      location: '서울',
      applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15일 후
      applicationMethod: '이메일',
      payment: {
        type: '일급',
        amount: 200000,
        details: '1일 촬영'
      },
      contactInfo: {
        email: 'model@example.com'
      }
    });
    await modelRecruitment.save();
    console.log('✅ 모델 모집 공고 생성 완료');

    // 4. CommunityPost 테스트 데이터 생성
    console.log('\n💬 커뮤니티 게시글 생성 중...');
    const communityPost = new CommunityPost({
      userId: dummyUserId,
      title: '연기 초보자를 위한 팁 공유',
      content: '연기를 처음 시작하는 분들을 위한 기본적인 팁들을 공유합니다...',
      category: '연기 팁',
      postType: '일반',
      tags: ['연기', '초보자', '팁'],
      location: '전국'
    });
    await communityPost.save();
    console.log('✅ 커뮤니티 게시글 생성 완료');

    // 5. Like 테스트 데이터 생성
    console.log('\n❤️ 좋아요 데이터 생성 중...');
    const like = new Like({
      userId: dummyUserId,
      postId: actorProfile._id,
      postType: 'actor_profile'
    });
    await like.save();
    console.log('✅ 좋아요 데이터 생성 완료');

    // 6. Bookmark 테스트 데이터 생성
    console.log('\n🔖 북마크 데이터 생성 중...');
    const bookmark = new Bookmark({
      userId: dummyUserId,
      postId: actorRecruitment._id,
      postType: 'actor_recruitment'
    });
    await bookmark.save();
    console.log('✅ 북마크 데이터 생성 완료');

    // 생성된 컬렉션 다시 확인
    const newCollections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 생성된 컬렉션 목록:');
    newCollections.forEach(col => console.log(`  - ${col.name}`));

    // 각 컬렉션의 도큐먼트 수 확인
    console.log('\n📊 컬렉션별 도큐먼트 수:');
    console.log(`  - actorprofiles: ${await ActorProfile.countDocuments()}`);
    console.log(`  - actorrecruitments: ${await ActorRecruitment.countDocuments()}`);
    console.log(`  - modelrecruitments: ${await ModelRecruitment.countDocuments()}`);
    console.log(`  - communityposts: ${await CommunityPost.countDocuments()}`);
    console.log(`  - likes: ${await Like.countDocuments()}`);
    console.log(`  - bookmarks: ${await Bookmark.countDocuments()}`);

    console.log('\n🎉 모든 컬렉션이 성공적으로 생성되었습니다!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔚 MongoDB 연결 종료');
    process.exit(0);
  }
}

// 스크립트 실행
testCollections(); 