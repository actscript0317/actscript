const express = require('express');
const Emotion = require('../models/Emotion');
const router = express.Router();

// 모든 감정 조회
router.get('/', async (req, res) => {
  try {
    const emotions = await Emotion.find().sort({ name: 1 }).select('-__v');
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