const express = require('express');
const { authenticateToken } = require('../../middleware/supabaseAuth');
const { supabaseAdmin, safeQuery } = require('../../config/supabase');

const router = express.Router();

// 각 템플릿별 라우터 import
const generalScriptRouter = require('./general-script');
const childrenTheaterRouter = require('./children-theater');
const customScriptRouter = require('./custom-script');

// 템플릿별 라우터 연결
router.use('/general', generalScriptRouter);
router.use('/children', childrenTheaterRouter);
router.use('/custom', customScriptRouter);

// 공통 API들

// 대본 리라이팅 API (모든 템플릿 공통)
router.post('/rewrite', require('./general-script').rewriteHandler);

// 사용자의 AI 생성 스크립트 목록 조회
router.get('/scripts', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
    }, 'AI 스크립트 목록 조회');

    if (!result.success) {
      return res.status(result.error.code).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      scripts: result.data
    });
  } catch (error) {
    console.error('AI 스크립트 조회 오류:', error);
    res.status(500).json({
      error: '스크립트 조회 중 오류가 발생했습니다.',
      message: '잠시 후 다시 시도해주세요.'
    });
  }
});

// 특정 AI 스크립트 조회
router.get('/scripts/:id', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 상세 조회');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      script: result.data
    });
  } catch (error) {
    console.error('AI 스크립트 조회 오류:', error);
    res.status(500).json({
      error: '스크립트 조회 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트를 대본함에 저장
router.put('/scripts/:id/save', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 조회');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '스크립트가 이미 대본함에 저장되어 있습니다.',
      script: result.data
    });
  } catch (error) {
    console.error('AI 스크립트 저장 오류:', error);
    res.status(500).json({
      error: '스크립트 저장 중 오류가 발생했습니다.'
    });
  }
});

// AI 스크립트 삭제
router.delete('/scripts/:id', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    }, 'AI 스크립트 삭제');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '스크립트가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('AI 스크립트 삭제 오류:', error);
    res.status(500).json({
      error: '스크립트 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 사용량 정보 조회 API
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    console.log('📊 사용량 정보 조회 요청:', req.user.id);
    
    const userResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
    }, '사용량 조회용 사용자 정보');

    if (!userResult.success) {
      console.error('❌ 사용량 조회 실패:', userResult.error);
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.data;
    const usage = user.usage || { currentMonth: 0, lastResetDate: null, totalGenerated: 0 };
    const subscription = user.subscription || { plan: 'test' };

    // 월이 바뀌었으면 사용량 리셋
    const now = new Date();
    const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate) : new Date();
    
    let resetUsage = { ...usage };
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      resetUsage.currentMonth = 0;
      resetUsage.lastResetDate = now.toISOString();
      
      await safeQuery(async () => {
        return await supabaseAdmin
          .from('users')
          .update({ usage: resetUsage })
          .eq('id', req.user.id);
      }, '사용량 리셋 저장');
    }

    const userLimit = user.usage?.monthly_limit || 10;
    let canGenerate = true;
    let limit = userLimit;

    if (userLimit === 999999) {
      limit = '무제한';
    } else {
      canGenerate = resetUsage.currentMonth < userLimit;
    }

    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextResetDate - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      usage: {
        currentMonth: resetUsage.currentMonth,
        totalGenerated: resetUsage.totalGenerated,
        limit: limit,
        canGenerate: canGenerate,
        planType: subscription.plan,
        nextResetDate: nextResetDate.toISOString(),
        daysUntilReset: daysUntilReset
      }
    });

    console.log('✅ 사용량 정보 조회 완료:', {
      currentMonth: resetUsage.currentMonth,
      limit: limit,
      canGenerate: canGenerate
    });

  } catch (error) {
    console.error('❌ 사용량 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용량 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 저장된 AI 스크립트 목록 조회 (대본함용)
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
    }, '저장된 AI 스크립트 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '데이터베이스 오류가 발생했습니다.',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      scripts: result.data || []
    });
  } catch (error) {
    console.error('저장된 AI 스크립트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '저장된 스크립트 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// AI 스크립트 메모 업데이트
router.put('/scripts/:id/memo', authenticateToken, async (req, res) => {
  try {
    const { memo } = req.body;
    
    if (memo !== undefined && memo !== null && memo.length > 1000) {
      return res.status(400).json({
        error: '메모는 1000자를 초과할 수 없습니다.'
      });
    }

    const scriptResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('id, user_id')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 소유권 확인');

    if (!scriptResult.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없거나 접근 권한이 없습니다.'
      });
    }

    const updateResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .update({ memo: memo || null })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    }, 'AI 스크립트 메모 업데이트');

    if (!updateResult.success) {
      return res.status(500).json({
        error: '메모 업데이트 중 오류가 발생했습니다.',
        message: updateResult.error.message
      });
    }

    res.json({
      success: true,
      message: '메모가 성공적으로 저장되었습니다.',
      script: updateResult.data
    });

  } catch (error) {
    console.error('AI 스크립트 메모 업데이트 오류:', error);
    res.status(500).json({
      error: '메모 저장 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// AI 스크립트 메모 조회
router.get('/scripts/:id/memo', authenticateToken, async (req, res) => {
  try {
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('ai_scripts')
        .select('id, memo')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    }, 'AI 스크립트 메모 조회');

    if (!result.success) {
      return res.status(404).json({
        error: '스크립트를 찾을 수 없거나 접근 권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      memo: result.data.memo || ''
    });

  } catch (error) {
    console.error('AI 스크립트 메모 조회 오류:', error);
    res.status(500).json({
      error: '메모 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;