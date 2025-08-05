const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

// 모든 감정 조회
router.get('/', async (req, res) => {
  try {
    const { data: emotions, error } = await supabase
      .from('emotions')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: '감정 조회 중 오류가 발생했습니다.',
        error: error.message
      });
    }

    res.json({
      success: true,
      emotions: emotions || []
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
    const { data: emotion, error } = await supabase
      .from('emotions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !emotion) {
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
      return res.status(400).json({ 
        success: false,
        message: '감정 이름은 필수입니다.' 
      });
    }
    
    const { data: emotion, error } = await supabase
      .from('emotions')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({ 
          success: false,
          message: '이미 존재하는 감정입니다.' 
        });
      }
      return res.status(500).json({
        success: false,
        message: '감정 등록 중 오류가 발생했습니다.',
        error: error.message
      });
    }
    
    res.status(201).json({ 
      success: true,
      message: '감정이 성공적으로 등록되었습니다.', 
      emotion 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '감정 등록 중 오류가 발생했습니다.', 
      error: error.message 
    });
  }
});

// 감정 수정
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false,
        message: '감정 이름은 필수입니다.' 
      });
    }
    
    const { data: emotion, error } = await supabase
      .from('emotions')
      .update({ name: name.trim() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({ 
          success: false,
          message: '이미 존재하는 감정입니다.' 
        });
      }
      return res.status(500).json({
        success: false,
        message: '감정 수정 중 오류가 발생했습니다.',
        error: error.message
      });
    }

    if (!emotion) {
      return res.status(404).json({ 
        success: false,
        message: '감정을 찾을 수 없습니다.' 
      });
    }
    
    res.json({ 
      success: true,
      message: '감정이 성공적으로 수정되었습니다.', 
      emotion 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '감정 수정 중 오류가 발생했습니다.', 
      error: error.message 
    });
  }
});

// 감정 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('emotions')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({
        success: false,
        message: '감정 삭제 중 오류가 발생했습니다.',
        error: error.message
      });
    }
    
    res.json({ 
      success: true,
      message: '감정이 성공적으로 삭제되었습니다.' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '감정 삭제 중 오류가 발생했습니다.', 
      error: error.message 
    });
  }
});

module.exports = router;