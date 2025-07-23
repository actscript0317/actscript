const express = require('express');
const router = express.Router();
const Like = require('../models/Like');
const auth = require('../middleware/auth');

// 좋아요 토글 (추가/제거)
router.post('/toggle', auth.protect, async (req, res) => {
  try {
    const { postId, postType } = req.body;
    const userId = req.user._id || req.user.id;

    console.log('🔍 좋아요 토글 요청:', {
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

    // 기존 좋아요 확인
    const existingLike = await Like.findOne({ userId, postId, postType });
    console.log('📊 기존 좋아요 확인:', { existingLike: !!existingLike });

    if (existingLike) {
      // 좋아요 취소
      await Like.deleteOne({ _id: existingLike._id });
      console.log('❌ 좋아요 취소됨');
      
      // 해당 게시글의 총 좋아요 수 계산
      const likeCount = await Like.countDocuments({ postId, postType });
      
      res.json({
        success: true,
        action: 'removed',
        message: '좋아요를 취소했습니다.',
        isLiked: false,
        likeCount
      });
    } else {
      // 좋아요 추가
      const newLike = await Like.create({ userId, postId, postType });
      console.log('✅ 좋아요 추가됨:', newLike._id);
      
      // 해당 게시글의 총 좋아요 수 계산
      const likeCount = await Like.countDocuments({ postId, postType });
      
      res.json({
        success: true,
        action: 'added',
        message: '좋아요를 눌렀습니다.',
        isLiked: true,
        likeCount
      });
    }
  } catch (error) {
    console.error('❌ 좋아요 토글 오류:', {
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

// 사용자의 좋아요 상태 확인
router.get('/status/:postId/:postType', auth.protect, async (req, res) => {
  try {
    const { postId, postType } = req.params;
    const userId = req.user._id || req.user.id;

    console.log('🔍 좋아요 상태 확인:', { postId, postType, userId: userId.toString() });

    const isLiked = await Like.exists({ userId, postId, postType });
    const likeCount = await Like.countDocuments({ postId, postType });

    console.log('📊 좋아요 상태 결과:', { isLiked: !!isLiked, likeCount });

    res.json({
      success: true,
      isLiked: !!isLiked,
      likeCount
    });
  } catch (error) {
    console.error('❌ 좋아요 상태 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다: ' + error.message
    });
  }
});

// 특정 게시글의 좋아요 수 조회
router.get('/count/:postId/:postType', async (req, res) => {
  try {
    const { postId, postType } = req.params;
    const likeCount = await Like.countDocuments({ postId, postType });

    res.json({
      success: true,
      likeCount
    });
  } catch (error) {
    console.error('좋아요 수 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router; 