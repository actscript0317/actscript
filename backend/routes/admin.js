const express = require('express');
const requireAdmin = require('../middleware/adminAuth');
const { supabase, supabaseAdmin, safeQuery } = require('../config/supabase');

const router = express.Router();

// 모든 관리자 라우트에 관리자 권한 확인 미들웨어 적용
router.use(requireAdmin);

// 사용자 목록 조회 (페이지네이션 포함)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select('id, username, email, name, subscription, usage, is_active, created_at, last_login');

    // 검색 기능
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const result = await safeQuery(async () => {
      return await query
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
    }, '사용자 목록 조회');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '사용자 목록 조회 중 오류가 발생했습니다.',
        error: result.error
      });
    }

    // 전체 사용자 수 조회
    const countResult = await safeQuery(async () => {
      let countQuery = supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (search) {
        countQuery = countQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%,name.ilike.%${search}%`);
      }
      
      return await countQuery;
    }, '사용자 수 조회');

    const totalUsers = countResult.success ? countResult.data?.length || 0 : 0;

    res.json({
      success: true,
      data: {
        users: result.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      }
    });

  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 사용자 정보 조회
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    }, '사용자 정보 조회');

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 사용자 사용량 제한 수정
router.put('/users/:userId/usage-limit', async (req, res) => {
  try {
    const { userId } = req.params;
    const { monthly_limit } = req.body;

    // 입력 검증
    if (!monthly_limit || (monthly_limit !== 999999 && (monthly_limit < 1 || monthly_limit > 1000))) {
      return res.status(400).json({
        success: false,
        message: '월간 사용량 제한은 1-1000회 또는 999999(무제한)만 가능합니다.'
      });
    }

    // 현재 사용자 정보 조회
    const currentUserResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .select('usage')
        .eq('id', userId)
        .single();
    }, '현재 사용자 정보 조회');

    if (!currentUserResult.success) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 기존 usage 데이터와 병합
    const currentUsage = currentUserResult.data.usage || {};
    const updatedUsage = {
      ...currentUsage,
      monthly_limit: parseInt(monthly_limit)
    };

    // 사용량 제한 업데이트
    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .update({ 
          usage: updatedUsage,
          subscription: monthly_limit === 999999 ? 'premium' : 'free'
        })
        .eq('id', userId)
        .select()
        .single();
    }, '사용자 사용량 제한 업데이트');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '사용량 제한 업데이트에 실패했습니다.',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `사용자의 월간 사용량이 ${monthly_limit === 999999 ? '무제한' : monthly_limit + '회'}로 변경되었습니다.`,
      data: result.data
    });

  } catch (error) {
    console.error('사용량 제한 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용량 제한 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 사용자 사용량 초기화
router.put('/users/:userId/reset-usage', async (req, res) => {
  try {
    const { userId } = req.params;

    // 현재 사용자 정보 조회
    const currentUserResult = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .select('usage')
        .eq('id', userId)
        .single();
    }, '현재 사용자 정보 조회');

    if (!currentUserResult.success) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 사용량 초기화 (월간 제한은 유지)
    const currentUsage = currentUserResult.data.usage || {};
    const resetUsage = {
      ...currentUsage,
      currentMonth: 0,
      lastResetDate: new Date().toISOString()
    };

    const result = await safeQuery(async () => {
      return await supabaseAdmin
        .from('users')
        .update({ usage: resetUsage })
        .eq('id', userId)
        .select()
        .single();
    }, '사용자 사용량 초기화');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '사용량 초기화에 실패했습니다.',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: '사용자의 이번 달 사용량이 초기화되었습니다.',
      data: result.data
    });

  } catch (error) {
    console.error('사용량 초기화 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용량 초기화 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 대시보드 통계 조회
router.get('/dashboard/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 병렬로 모든 통계 조회
    const [
      // 방문자 통계
      todayVisitors,
      yesterdayVisitors,
      weeklyVisitorStats,
      monthlyVisitorStats,
      
      // 사용자 통계
      totalUsers,
      todayNewUsers,
      weeklyNewUsers,
      
      // 콘텐츠 통계
      totalScripts,
      todayScripts,
      totalAIScripts,
      todayAIScripts,
      
      // 배우 관련 통계
      totalActorProfiles,
      totalActorRecruitments,
      totalModelRecruitments,
      
      // 커뮤니티 통계
      totalCommunityPosts,
      todayCommunityPosts,
      
      // 최근 활동
      recentUsers,
      recentScripts,
      recentAIScripts
    ] = await Promise.all([
      // 방문자 통계
      Visitor.findOne({ date: today }),
      Visitor.findOne({ date: yesterday }),
      Visitor.getStats(weekAgo, today),
      Visitor.getStats(monthAgo, today),
      
      // 사용자 통계
      User.countDocuments(),
      User.countDocuments({
        createdAt: {
          $gte: new Date(today),
          $lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(weekAgo)
        }
      }),
      
      // 콘텐츠 통계
      Script.countDocuments(),
      Script.countDocuments({
        createdAt: {
          $gte: new Date(today),
          $lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }),
      AIScript.countDocuments(),
      AIScript.countDocuments({
        createdAt: {
          $gte: new Date(today),
          $lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }),
      
      // 배우 관련 통계
      ActorProfile.countDocuments(),
      ActorRecruitment.countDocuments(),
      ModelRecruitment.countDocuments(),
      
      // 커뮤니티 통계
      CommunityPost.countDocuments(),
      CommunityPost.countDocuments({
        createdAt: {
          $gte: new Date(today),
          $lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }),
      
      // 최근 활동
      User.find().sort({ createdAt: -1 }).limit(10).select('username email createdAt'),
      Script.find().sort({ createdAt: -1 }).limit(10).populate('author', 'username').select('title author createdAt'),
      AIScript.find().sort({ createdAt: -1 }).limit(10).populate('user', 'username').select('theme characters user createdAt')
    ]);

    // 통계 데이터 구성
    const stats = {
      // 방문자 통계
      visitors: {
        today: todayVisitors?.count || 0,
        yesterday: yesterdayVisitors?.count || 0,
        weekly: weeklyVisitorStats.totalVisitors || 0,
        monthly: monthlyVisitorStats.totalVisitors || 0,
        weeklyAvg: Math.round(weeklyVisitorStats.avgVisitorsPerDay || 0),
        pageViews: {
          today: todayVisitors ? Object.values(todayVisitors.pageViews).reduce((a, b) => a + b, 0) : 0,
          weekly: weeklyVisitorStats.totalPageViews || 0,
          monthly: monthlyVisitorStats.totalPageViews || 0
        }
      },
      
      // 사용자 통계
      users: {
        total: totalUsers,
        today: todayNewUsers,
        weekly: weeklyNewUsers,
        growth: totalUsers > 0 ? Math.round((weeklyNewUsers / totalUsers) * 100 * 100) / 100 : 0
      },
      
      // 콘텐츠 통계
      content: {
        scripts: {
          total: totalScripts,
          today: todayScripts
        },
        aiScripts: {
          total: totalAIScripts,
          today: todayAIScripts
        },
        actorProfiles: totalActorProfiles,
        actorRecruitments: totalActorRecruitments,
        modelRecruitments: totalModelRecruitments,
        communityPosts: {
          total: totalCommunityPosts,
          today: todayCommunityPosts
        }
      },
      
      // 최근 활동
      recentActivity: {
        users: recentUsers,
        scripts: recentScripts,
        aiScripts: recentAIScripts
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('관리자 대시보드 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// 방문자 통계 상세 조회
router.get('/visitors', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const visitors = await Visitor.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Visitor.countDocuments(query);

    res.json({
      success: true,
      data: {
        visitors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('방문자 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '방문자 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 관리
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 권한 변경
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '올바르지 않은 권한입니다.'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: user,
      message: '사용자 권한이 변경되었습니다.'
    });

  } catch (error) {
    console.error('사용자 권한 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 권한 변경 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 계정 활성화/비활성화
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: user,
      message: `사용자 계정이 ${isActive ? '활성화' : '비활성화'}되었습니다.`
    });

  } catch (error) {
    console.error('사용자 계정 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 계정 상태 변경 중 오류가 발생했습니다.'
    });
  }
});

// 콘텐츠 관리 - 대본 목록
router.get('/scripts', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const scripts = await Script.find(query)
      .populate('author', 'username email')
      .populate('emotion', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Script.countDocuments(query);

    res.json({
      success: true,
      data: {
        scripts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('대본 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '대본 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 시스템 정보 조회
router.get('/system/info', async (req, res) => {
  try {
    const systemInfo = {
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      },
      database: {
        status: 'connected', // MongoDB 연결 상태는 별도 체크 로직 필요
        collections: {
          users: await User.countDocuments(),
          scripts: await Script.countDocuments(),
          aiScripts: await AIScript.countDocuments(),
          visitors: await Visitor.countDocuments()
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemInfo
    });

  } catch (error) {
    console.error('시스템 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;