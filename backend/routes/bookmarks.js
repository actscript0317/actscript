const express = require('express');
const router = express.Router();
// const Bookmark = require('../models/Bookmark');
const auth = require('../middleware/auth');

// 북마크 토글 (추가/제거)
router.post('/toggle', auth.protect, async (req, res) => {
  try {
    const { postId, postType } = req.body;
    const userId = req.user._id || req.user.id;

    console.log('🔍 북마크 토글 요청:', {
      postId,
      postType,
      userId: userId.toString(),
      userEmail: req.user.email
    });

    if (!postId || !postType) {
      return res.status(400).json({ 
        success: false, 
        message: '게시글 ID와 타입이 필요합니다.' 
      });
    }

    // postType enum 유효성 검사
    const validPostTypes = ['actor_profile', 'actor_recruitment', 'model_recruitment', 'actor_info', 'community_post'];
    if (!validPostTypes.includes(postType)) {
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 게시글 타입입니다. 사용 가능한 타입: ${validPostTypes.join(', ')}`
      });
    }

    // 기존 북마크 확인
    const existingBookmark = await Bookmark.findOne({ userId, postId, postType });
    console.log('📊 기존 북마크 확인:', { existingBookmark: !!existingBookmark });

    if (existingBookmark) {
      // 북마크 취소
      await Bookmark.deleteOne({ _id: existingBookmark._id });
      console.log('❌ 북마크 취소됨');
      
      // 해당 게시글의 총 북마크 수 계산
      const bookmarkCount = await Bookmark.countDocuments({ postId, postType });
      
      res.json({
        success: true,
        action: 'removed',
        message: '저장을 취소했습니다.',
        isBookmarked: false,
        bookmarkCount
      });
    } else {
      // 북마크 추가
      const newBookmark = await Bookmark.create({ userId, postId, postType });
      console.log('✅ 북마크 추가됨:', newBookmark._id);
      
      // 해당 게시글의 총 북마크 수 계산
      const bookmarkCount = await Bookmark.countDocuments({ postId, postType });
      
      res.json({
        success: true,
        action: 'added',
        message: '게시글이 저장되었습니다.',
        isBookmarked: true,
        bookmarkCount
      });
    }
  } catch (error) {
    console.error('❌ 북마크 토글 오류:', {
      message: error.message,
      stack: error.stack,
      postId: req.body.postId,
      postType: req.body.postType,
      userId: req.user?._id || req.user?.id
    });
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다: ' + error.message
    });
  }
});

// 사용자의 북마크 상태 확인
router.get('/status/:postId/:postType', auth.protect, async (req, res) => {
  try {
    const { postId, postType } = req.params;
    const userId = req.user._id || req.user.id;

    console.log('🔍 북마크 상태 확인:', { postId, postType, userId: userId.toString() });

    const isBookmarked = await Bookmark.exists({ userId, postId, postType });
    const bookmarkCount = await Bookmark.countDocuments({ postId, postType });

    console.log('📊 북마크 상태 결과:', { isBookmarked: !!isBookmarked, bookmarkCount });

    res.json({
      success: true,
      isBookmarked: !!isBookmarked,
      bookmarkCount
    });
  } catch (error) {
    console.error('❌ 북마크 상태 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다: ' + error.message
    });
  }
});

// 사용자의 저장한 게시글 목록 조회
router.get('/my-bookmarks', auth.protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    console.log('🔍 북마크 목록 조회:', { userId: userId.toString(), page, limit });

    const bookmarks = await Bookmark.find({ userId })
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('postId'); // 실제 게시글 정보도 함께 가져오기

    const total = await Bookmark.countDocuments({ userId });

    console.log('📊 북마크 목록 결과:', { count: bookmarks.length, total });

    res.json({
      success: true,
      bookmarks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ 저장한 게시글 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다: ' + error.message
    });
  }
});

module.exports = router; 