const express = require('express');
// const Emotion = require('../models/Emotion'); // MongoDB 모델 제거됨
const router = express.Router();

// 모든 감정 조회 (하드코딩된 기본 감정 목록)
router.get('/', async (req, res) => {
  try {
    // MongoDB 대신 기본 감정 목록 반환
    const emotions = [
      { _id: '1', name: '기쁨' },
      { _id: '2', name: '슬픔' },
      { _id: '3', name: '분노' },
      { _id: '4', name: '불안' },
      { _id: '5', name: '그리움' },
      { _id: '6', name: '후회' },
      { _id: '7', name: '사랑' },
      { _id: '8', name: '증오' },
      { _id: '9', name: '절망' },
      { _id: '10', name: '희망' }
    ];
    
    res.json({
      success: true,
      emotions: emotions
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '감정 조회 중 오류가 발생했습니다.', 
      error: error.message 
    });
  }
});

// 특정 감정 조회
router.get('/:id', async (req, res) => {
  try {
    const emotion = await Emotion.findById(req.params.id).select('-__v');
    
    if (!emotion) {
      return res.status(404).json({ 
        success: false,
        message: '감정을 찾을 수 없습니다.' 
      });
    }
    
    res.json({
      success: true,
      emotion: emotion
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '감정 조회 중 오류가 발생했습니다.', 
      error: error.message 
    });
  }
});

// 감정 생성
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: '감정 이름은 필수입니다.' });
    }
    
    const emotion = new Emotion({ name: name.trim() });
    await emotion.save();
    
    res.status(201).json({ message: '감정이 성공적으로 등록되었습니다.', emotion });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 감정입니다.' });
    }
    res.status(500).json({ message: '감정 등록 중 오류가 발생했습니다.', error: error.message });
  }
});

// 감정 수정
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: '감정 이름은 필수입니다.' });
    }
    
    const emotion = await Emotion.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!emotion) {
      return res.status(404).json({ message: '감정을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '감정이 성공적으로 수정되었습니다.', emotion });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 감정입니다.' });
    }
    res.status(500).json({ message: '감정 수정 중 오류가 발생했습니다.', error: error.message });
  }
});

// 감정 삭제
router.delete('/:id', async (req, res) => {
  try {
    const emotion = await Emotion.findByIdAndDelete(req.params.id);
    
    if (!emotion) {
      return res.status(404).json({ message: '감정을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '감정이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: '감정 삭제 중 오류가 발생했습니다.', error: error.message });
  }
});

module.exports = router; 