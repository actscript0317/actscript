const express = require('express');
const router = express.Router();
const CommunityPost = require('../models/CommunityPost');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/community/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'community-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

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

    // 필터 조건 구성
    const filter = { status: '활성' };
    
    if (category && category !== 'all') filter.category = category;
    if (postType && postType !== 'all') filter.postType = postType;
    if (location && location !== 'all') filter.location = location;

    // 검색 조건
    if (search) {
      filter.$text = { $search: search };
    }

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
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const postData = {
      ...req.body,
      userId: req.user.id
    };

    // 이미지 처리
    if (req.files && req.files.length > 0) {
      postData.images = req.files.map(file => ({
        url: `/uploads/community/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
    }

    // JSON 문자열 파싱
    if (req.body.tags) {
      postData.tags = Array.isArray(req.body.tags) 
        ? req.body.tags 
        : JSON.parse(req.body.tags);
    }
    if (req.body.keywords) {
      postData.keywords = Array.isArray(req.body.keywords) 
        ? req.body.keywords 
        : JSON.parse(req.body.keywords);
    }
    if (req.body.recruitment) {
      postData.recruitment = JSON.parse(req.body.recruitment);
    }
    if (req.body.event) {
      postData.event = JSON.parse(req.body.event);
    }

    const post = new CommunityPost(postData);
    await post.save();

    const populatedPost = await CommunityPost.findById(post._id)
      .populate('userId', 'email');

    res.status(201).json({
      success: true,
      data: populatedPost,
      message: '게시글이 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('게시글 생성 오류:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '게시글 생성에 실패했습니다.' 
    });
  }
});

// 게시글 수정
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
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
      const newImages = req.files.map(file => ({
        url: `/uploads/community/${file.filename}`,
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