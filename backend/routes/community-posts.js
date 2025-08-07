const express = require('express');
const router = express.Router();
// const CommunityPost = require('../models/CommunityPost');
const auth = require('../middleware/auth');
const { communityUpload, deleteImage } = require('../config/cloudinary');

// 모든 커뮤니티 게시글 조회
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      category,
      postType,
      location,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 커뮤니티 게시글 조회 요청:', { page, limit, category, postType, location, search });

    // 필터 조건 구성 - status 필터 제거
    const filter = {};
    
    if (category && category !== 'all') filter.category = category;
    if (postType && postType !== 'all') filter.postType = postType;
    if (location && location !== 'all') filter.location = location;

    // 검색 조건
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    console.log('📊 실제 필터 조건:', filter);

    // 정렬 조건
    const sort = {};
    if (sortBy === 'popular') {
      sort.likeCount = -1;
      sort.commentCount = -1;
    } else if (sortBy === 'hot') {
      sort.isHot = -1;
      sort.lastActivityAt = -1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const posts = await CommunityPost.find(filter)
      .populate('userId', 'email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await CommunityPost.countDocuments(filter);

    console.log('📥 커뮤니티 게시글 조회 결과:', { count: posts.length, total });

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('커뮤니티 게시글 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 특정 게시글 조회
router.get('/:id', async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('userId', 'email')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.'
      });
    }

    // 조회수 증가
    await CommunityPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 게시글 생성
router.post('/', auth, communityUpload.array('images', 10), async (req, res) => {
  try {
    console.log('📥 커뮤니티 게시글 생성 요청:', {
      body: req.body,
      filesCount: req.files?.length || 0,
      userId: req.user?.id
    });

    const postData = {
      ...req.body,
      userId: req.user.id
    };

    // 기본값 설정
    if (!postData.postType) {
      postData.postType = '일반';
    }
    if (!postData.category) {
      postData.category = '자유';
    }

    // Cloudinary 이미지 처리
    if (req.files && req.files.length > 0) {
      console.log('📷 [Cloudinary Community] 이미지 업로드 완료:', {
        count: req.files.length,
        files: req.files.map(f => ({ 
          filename: f.filename, 
          url: f.path, 
          public_id: f.public_id
        }))
      });
      
      postData.images = req.files.map(file => ({
        url: file.path, // Cloudinary URL
        filename: file.filename,
        publicId: file.public_id,
        size: file.size,
        mimetype: file.mimetype || 'image/jpeg',
        uploadedAt: new Date().toISOString()
      }));
      
      console.log('✅ [Cloudinary Community] 이미지 메타데이터 저장 완료');
    }

    // JSON 문자열 파싱 및 기본값 처리
    if (req.body.tags && typeof req.body.tags === 'string') {
      try {
        postData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.log('tags 파싱 실패, 빈 배열로 설정');
        postData.tags = [];
      }
    } else if (Array.isArray(req.body.tags)) {
      postData.tags = req.body.tags;
    }

    if (req.body.keywords && typeof req.body.keywords === 'string') {
      try {
        postData.keywords = JSON.parse(req.body.keywords);
      } catch (e) {
        console.log('keywords 파싱 실패, 빈 배열로 설정');
        postData.keywords = [];
      }
    } else if (Array.isArray(req.body.keywords)) {
      postData.keywords = req.body.keywords;
    }

    if (req.body.recruitment && typeof req.body.recruitment === 'string') {
      try {
        postData.recruitment = JSON.parse(req.body.recruitment);
      } catch (e) {
        console.log('recruitment 파싱 실패, 빈 객체로 설정');
        postData.recruitment = {};
      }
    }

    if (req.body.event && typeof req.body.event === 'string') {
      try {
        postData.event = JSON.parse(req.body.event);
      } catch (e) {
        console.log('event 파싱 실패, 빈 객체로 설정');
        postData.event = {};
      }
    }

    console.log('🔄 최종 게시글 데이터:', postData);

    const post = new CommunityPost(postData);
    await post.save();

    const populatedPost = await CommunityPost.findById(post._id)
      .populate('userId', 'email');

    console.log('✅ 커뮤니티 게시글 생성 성공:', populatedPost._id);

    res.status(201).json({
      success: true,
      data: populatedPost,
      message: '게시글이 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('❌ 커뮤니티 게시글 생성 오류:', {
      message: error.message,
      name: error.name,
      errors: error.errors,
      stack: error.stack
    });
    
    // Mongoose validation 에러 처리
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: '유효성 검사 실패: ' + validationErrors.join(', '),
        errors: validationErrors
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: error.message || '게시글 생성에 실패했습니다.' 
    });
  }
});

// 게시글 수정
router.put('/:id', auth, communityUpload.array('images', 10), async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.'
      });
    }

    // 권한 확인
    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '수정 권한이 없습니다.'
      });
    }

    const updateData = { ...req.body };

    // 새 이미지 처리
    if (req.files && req.files.length > 0) {
      const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://actscript-1.onrender.com' 
  : `${req.protocol}://${req.get('host')}`;

const newImages = req.files.map(file => ({
  url: `${baseUrl}/uploads/profiles/${file.filename}`,
  filename: file.filename,
  size: file.size
}));
      
      updateData.images = [...(post.images || []), ...newImages].slice(0, 10);
    }

    // JSON 문자열 파싱
    if (req.body.tags) {
      updateData.tags = Array.isArray(req.body.tags) 
        ? req.body.tags 
        : JSON.parse(req.body.tags);
    }
    if (req.body.keywords) {
      updateData.keywords = Array.isArray(req.body.keywords) 
        ? req.body.keywords 
        : JSON.parse(req.body.keywords);
    }

    const updatedPost = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'email');

    res.json({
      success: true,
      data: updatedPost,
      message: '게시글이 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '게시글 수정에 실패했습니다.' 
    });
  }
});

// 게시글 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.'
      });
    }

    // 권한 확인
    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '삭제 권한이 없습니다.'
      });
    }

    await CommunityPost.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '게시글이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내 게시글 조회
router.get('/my/posts', auth, async (req, res) => {
  try {
    const posts = await CommunityPost.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('내 게시글 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 인기 게시글 조회
router.get('/hot/list', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const posts = await CommunityPost.find({ 
      status: '활성',
      isHot: true
    })
      .sort({ likeCount: -1, commentCount: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'email')
      .lean();

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('인기 게시글 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 검색
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 15 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: '검색어가 필요합니다.'
      });
    }

    const posts = await CommunityPost.find({
      $text: { $search: q },
      status: '활성'
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'email')
      .lean();

    const total = await CommunityPost.countDocuments({
      $text: { $search: q },
      status: '활성'
    });

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('게시글 검색 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 