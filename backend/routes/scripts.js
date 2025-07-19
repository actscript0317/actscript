const express = require('express');
const { body, validationResult } = require('express-validator');
const Script = require('../models/Script');
const router = express.Router();

// 모든 대본 조회 (필터링, 검색, 페이지네이션 포함)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      emotion, 
      characters, 
      gender,
      mood,
      duration,
      ageGroup,
      purpose,
      scriptType,
      sort = 'newest' 
    } = req.query;
    
    // 필터 조건 생성
    const filter = {};
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (emotion) {
      filter.emotions = emotion;
    }
    
    if (characters) {
      if (characters === '3+') {
        filter.characterCount = { $gte: 3 };
      } else {
        filter.characterCount = parseInt(characters);
      }
    }
    
    // 새로운 필터들 추가
    if (gender) {
      // '전체' 카테고리는 모든 성별 검색에 포함
      if (gender === '전체') {
        // 전체 선택 시 필터 적용 안함
      } else {
        filter.$or = [
          { gender: gender },
          { gender: '전체' }
        ];
      }
    }
    
    if (mood) {
      filter.mood = mood;
    }
    
    if (duration) {
      filter.duration = duration;
    }
    
    if (ageGroup) {
      filter.ageGroup = ageGroup;
    }
    
    if (purpose) {
      filter.purpose = purpose;
    }
    
    if (scriptType) {
      filter.scriptType = scriptType;
    }
    
    // 정렬 조건
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { views: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      default: // newest
        sortOption = { createdAt: -1 };
    }
    
    const scripts = await Script.find(filter)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');
    
    const total = await Script.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      scripts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalScripts: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: '대본 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// 인기 대본 조회
router.get('/popular', async (req, res) => {
  try {
    const scripts = await Script.find()
      .sort({ views: -1 })
      .limit(6)
      .select('-__v');
    
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: '인기 대본 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// 최신 대본 조회
router.get('/latest', async (req, res) => {
  try {
    const scripts = await Script.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('-__v');
    
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: '최신 대본 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// 특정 대본 조회 (조회수 증가 없음)
router.get('/:id', async (req, res) => {
  try {
    const script = await Script.findById(req.params.id).select('-__v');
    
    if (!script) {
      return res.status(404).json({ message: '대본을 찾을 수 없습니다.' });
    }
    
    // 관련 대본 조회 (같은 감정을 가진 다른 대본들)
    const relatedScripts = await Script.find({
      _id: { $ne: script._id },
      emotions: { $in: script.emotions }
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('-__v');
    
    res.json({
      script,
      relatedScripts
    });
  } catch (error) {
    res.status(500).json({ message: '대본 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// 조회수 증가 전용 API
router.patch('/:id/view', async (req, res) => {
  try {
    const script = await Script.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).select('views');
    
    if (!script) {
      return res.status(404).json({ message: '대본을 찾을 수 없습니다.' });
    }
    
    res.json({ 
      success: true,
      views: script.views 
    });
  } catch (error) {
    res.status(500).json({ message: '조회수 업데이트 중 오류가 발생했습니다.', error: error.message });
  }
});

// 대본 생성
router.post('/', [
  body('title').notEmpty().withMessage('제목은 필수입니다.'),
  body('characterCount').isInt({ min: 1, max: 10 }).withMessage('등장인물 수는 1-10명 사이여야 합니다.'),
  body('situation').notEmpty().withMessage('상황 설명은 필수입니다.'),
  body('content').notEmpty().withMessage('대본 내용은 필수입니다.'),
  body('emotions').isArray({ min: 1 }).withMessage('최소 1개의 감정을 선택해야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: '입력 데이터에 오류가 있습니다.', errors: errors.array() });
    }
    
    const script = new Script(req.body);
    await script.save();
    
    res.status(201).json({ message: '대본이 성공적으로 등록되었습니다.', script });
  } catch (error) {
    res.status(500).json({ message: '대본 등록 중 오류가 발생했습니다.', error: error.message });
  }
});

// 대본 수정
router.put('/:id', [
  body('title').optional().notEmpty().withMessage('제목은 비워둘 수 없습니다.'),
  body('characterCount').optional().isInt({ min: 1, max: 10 }).withMessage('등장인물 수는 1-10명 사이여야 합니다.'),
  body('situation').optional().notEmpty().withMessage('상황 설명은 비워둘 수 없습니다.'),
  body('content').optional().notEmpty().withMessage('대본 내용은 비워둘 수 없습니다.'),
  body('emotions').optional().isArray({ min: 1 }).withMessage('최소 1개의 감정을 선택해야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: '입력 데이터에 오류가 있습니다.', errors: errors.array() });
    }
    
    const script = await Script.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!script) {
      return res.status(404).json({ message: '대본을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '대본이 성공적으로 수정되었습니다.', script });
  } catch (error) {
    res.status(500).json({ message: '대본 수정 중 오류가 발생했습니다.', error: error.message });
  }
});

// 대본 삭제
router.delete('/:id', async (req, res) => {
  try {
    const script = await Script.findByIdAndDelete(req.params.id);
    
    if (!script) {
      return res.status(404).json({ message: '대본을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '대본이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: '대본 삭제 중 오류가 발생했습니다.', error: error.message });
  }
});

module.exports = router; 