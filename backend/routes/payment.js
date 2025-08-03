const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/env');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 나이스페이먼트 Basic 인증 헤더 생성
const getAuthHeader = () => {
  // 클라이언트키:시크릿키 문자열 생성
  const authString = `${config.NICEPAY_CLIENT_KEY}:${config.NICEPAY_SECRET_KEY}`;
  console.log('🔑 인증 문자열:', authString);
  
  // Base64 인코딩
  const credentials = Buffer.from(authString).toString('base64');
  console.log('🔐 Basic 인증 Credentials:', credentials);
  
  const authHeader = `Basic ${credentials}`;
  console.log('📋 Authorization 헤더:', authHeader);
  
  return authHeader;
};

// Basic 인증 테스트 API 추가
// 결제 시스템 상태 확인 API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    api_url: config.NICEPAY_API_URL,
    client_url: config.CLIENT_URL,
    message: '결제 시스템이 정상 작동 중입니다.'
  });
});

router.get('/test-auth', (req, res) => {
  try {
    const authHeader = getAuthHeader();
    
    // 예상되는 결과와 비교 (가이드 기준)
    const expectedClientKey = 'S2_af4543a0be4d49a98122e01ec2059a56';
    const expectedSecretKey = '9eb85607103646da9f9c02b128f2e5ee';
    const expectedAuthString = `${expectedClientKey}:${expectedSecretKey}`;
    const expectedCredentials = Buffer.from(expectedAuthString).toString('base64');
    
    res.json({
      success: true,
      current: {
        clientKey: config.NICEPAY_CLIENT_KEY,
        secretKey: config.NICEPAY_SECRET_KEY,
        authString: `${config.NICEPAY_CLIENT_KEY}:${config.NICEPAY_SECRET_KEY}`,
        credentials: Buffer.from(`${config.NICEPAY_CLIENT_KEY}:${config.NICEPAY_SECRET_KEY}`).toString('base64'),
        authHeader: authHeader
      },
      expected: {
        clientKey: expectedClientKey,
        secretKey: expectedSecretKey, 
        authString: expectedAuthString,
        credentials: expectedCredentials,
        authHeader: `Basic ${expectedCredentials}`
      },
      match: authHeader === `Basic ${expectedCredentials}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 결제 준비 (orderId 생성)
router.post('/prepare', protect, async (req, res) => {
  try {
    console.log('📝 결제 준비 요청 받음:', req.body);
    
    const { amount, orderName, customerName, customerEmail } = req.body;

    // 입력값 검증
    if (!amount || !orderName) {
      console.error('❌ 필수 정보 누락:', { amount, orderName });
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.',
        required: ['amount', 'orderName']
      });
    }

    // 운영 환경에서는 실제 API 호출 사용

    // 고유한 주문번호 생성
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // 결제 준비 데이터
    const paymentData = {
      orderId,
      amount: parseInt(amount),
      orderName,
      customerName: customerName || req.user?.name || '고객',
      customerEmail: customerEmail || req.user?.email || '',
      returnUrl: `${config.CLIENT_URL}/payment/success`,
      failUrl: `${config.CLIENT_URL}/payment/fail`,
      cancelUrl: `${config.CLIENT_URL}/payment/cancel`,
      clientKey: config.NICEPAY_CLIENT_KEY
    };

    console.log('💳 결제 준비 완료:', { orderId, amount, orderName });

    // 명시적으로 JSON 응답 보장
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      data: paymentData
    });

  } catch (error) {
    console.error('❌ 결제 준비 오류:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: '결제 준비 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 결제 승인 (새로운 엔드포인트)
router.post('/approve', protect, async (req, res) => {
  try {
    const { tid, amount, orderId, authToken, signature } = req.body;

    console.log('🔄 결제 승인 요청 받음:', { tid, amount, orderId });

    // 입력값 검증
    if (!tid || !amount) {
      console.error('❌ 필수 정보 누락:', { tid, amount });
      return res.status(400).json({
        success: false,
        error: '결제 승인에 필요한 정보가 누락되었습니다.',
        required: ['tid', 'amount']
      });
    }

    // 운영 환경에서는 실제 결제 승인 API 호출

    // 나이스페이먼츠 승인 API 호출 (가이드 기준)
    const response = await axios.post(
      `${config.NICEPAY_API_URL}/v1/payments/${tid}`,
      {
        amount: parseInt(amount)
      },
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentResult = response.data;

    // 가이드에 따른 성공 응답 코드 확인
    if (paymentResult.resultCode === '0000') {
      console.log('✅ 실제 결제 승인 성공:', paymentResult);
      
      // 사용자 구독 업그레이드
      const user = await User.findById(req.user._id);
      if (user) {
        // 결제 금액에 따른 플랜 결정
        let planType;
        if (amount === 100) {
          planType = 'pro';
        } else if (amount === 19900) {
          planType = 'premier';
        } else {
          planType = 'free'; // 기본값
        }
        
        // 사용자 구독 업그레이드
        user.upgradeSubscription(planType, {
          orderId,
          tid,
          amount
        });
        
        await user.save();
        console.log('✅ 사용자 구독 업그레이드 완료:', {
          userId: user._id,
          plan: planType,
          status: user.subscription.status
        });
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        data: paymentResult,
        message: '결제가 성공적으로 완료되었습니다.'
      });
    } else {
      console.log('❌ 결제 승인 실패:', paymentResult);
      res.status(400).json({
        success: false,
        error: '결제 승인에 실패했습니다.',
        data: paymentResult
      });
    }

  } catch (error) {
    console.error('❌ 결제 승인 오류:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      },
      stack: error.stack
    });
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: '결제 승인 중 오류가 발생했습니다.',
      message: error.response?.data?.message || error.message,
      details: process.env.NODE_ENV === 'development' ? {
        status: error.response?.status,
        data: error.response?.data
      } : undefined
    });
  }
});

// 기존 결제 승인 (레거시 - 호환성 유지용, 새로운 결제는 /approve 사용 권장)
router.post('/confirm', protect, async (req, res) => {
  try {
    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({
        error: '결제 승인에 필요한 정보가 누락되었습니다.',
        required: ['paymentKey', 'orderId', 'amount']
      });
    }

    console.log('🔄 결제 승인 요청:', { paymentKey, orderId, amount });

    // 나이스페이먼트 결제 승인 API 호출
    const response = await axios.post(
      `${config.NICEPAY_API_URL}/v1/payments/confirm`,
      {
        paymentKey,
        orderId,
        amount: parseInt(amount)
      },
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentResult = response.data;

    if (paymentResult.status === 'DONE') {
      console.log('✅ 결제 승인 성공:', paymentResult);
      
      // 사용자 구독 업그레이드
      const user = await User.findById(req.user._id);
      if (user) {
        // 결제 금액에 따른 플랜 결정
        let planType;
        if (amount === 100) {
          planType = 'pro';
        } else if (amount === 19900) {
          planType = 'premier';
        } else {
          planType = 'free'; // 기본값
        }
        
        // 사용자 구독 업그레이드
        user.upgradeSubscription(planType, {
          orderId,
          tid: paymentKey, // confirm API에서는 paymentKey가 tid 역할
          amount
        });
        
        await user.save();
        console.log('✅ 사용자 구독 업그레이드 완료:', {
          userId: user._id,
          plan: planType,
          status: user.subscription.status
        });
      }

      res.json({
        success: true,
        message: '결제가 성공적으로 완료되었습니다.',
        data: paymentResult
      });
    } else {
      console.log('❌ 결제 승인 실패:', paymentResult);
      res.status(400).json({
        success: false,
        error: '결제 승인에 실패했습니다.',
        data: paymentResult
      });
    }

  } catch (error) {
    console.error('결제 승인 오류:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: '결제 승인 중 오류가 발생했습니다.',
      message: error.response?.data?.message || error.message
    });
  }
});

// 결제 취소
router.post('/cancel', protect, async (req, res) => {
  try {
    const { paymentKey, cancelReason } = req.body;

    if (!paymentKey || !cancelReason) {
      return res.status(400).json({
        error: '결제 취소에 필요한 정보가 누락되었습니다.',
        required: ['paymentKey', 'cancelReason']
      });
    }

    console.log('🔄 결제 취소 요청:', { paymentKey, cancelReason });

    const response = await axios.post(
      `${config.NICEPAY_API_URL}/v1/payments/${paymentKey}/cancel`,
      {
        cancelReason
      },
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const cancelResult = response.data;

    if (cancelResult.status === 'CANCELED') {
      console.log('✅ 결제 취소 성공:', cancelResult);
      
      res.json({
        success: true,
        message: '결제가 성공적으로 취소되었습니다.',
        data: cancelResult
      });
    } else {
      console.log('❌ 결제 취소 실패:', cancelResult);
      res.status(400).json({
        success: false,
        error: '결제 취소에 실패했습니다.',
        data: cancelResult
      });
    }

  } catch (error) {
    console.error('결제 취소 오류:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: '결제 취소 중 오류가 발생했습니다.',
      message: error.response?.data?.message || error.message
    });
  }
});

// 나이스페이먼츠 결제 콜백 엔드포인트 (Server 승인 모델)
router.post('/callback', async (req, res) => {
  try {
    console.log('📞 나이스페이먼츠 콜백 수신:', req.body);
    
    const {
      authResultCode,
      authResultMsg,
      tid,
      clientId,
      orderId,
      amount,
      mallReserved,
      authToken,
      signature
    } = req.body;

    // 인증 성공 여부 확인
    if (authResultCode !== '0000') {
      console.log('❌ 결제 인증 실패:', { authResultCode, authResultMsg });
      
      // 결제 실패 페이지로 리다이렉트
      return res.redirect(`${config.CLIENT_URL}/payment/fail?error=${encodeURIComponent(authResultMsg)}`);
    }

    // 가이드에 따르면 authResultCode만 확인하면 됨 (서명 검증 불필요)
    console.log('📋 콜백 데이터 확인:', {
      authResultCode,
      authResultMsg,
      tid,
      orderId,
      amount,
      clientId
    });

    console.log('✅ 인증 성공, 승인 API 호출 시작');

    // 결제 승인 API 호출 (가이드 기준)
    const approvalResponse = await axios.post(
      `${config.NICEPAY_API_URL}/v1/payments/${tid}`,
      {
        amount: parseInt(amount)
      },
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const approvalResult = approvalResponse.data;
    console.log('💳 승인 API 응답:', approvalResult);

    // 가이드에 따른 성공 응답 코드 확인
    if (approvalResult.resultCode === '0000') {
      console.log('✅ 결제 승인 성공');
      
      // mallReserved에서 사용자 정보 추출 (JSON 파싱)
      let userId = null;
      let planType = 'pro'; // 기본값
      
      try {
        if (mallReserved) {
          const reservedData = JSON.parse(mallReserved);
          userId = reservedData.userId;
          planType = reservedData.planType || 'pro';
        }
      } catch (e) {
        console.warn('mallReserved 파싱 실패:', e.message);
      }

      // 사용자 구독 업그레이드 (userId가 있는 경우)
      if (userId) {
        try {
          const user = await User.findById(userId);
          if (user) {
            // 결제 금액에 따른 플랜 결정
            if (amount === 100 || amount === '100') {
              planType = 'pro';
            } else if (amount === 19900 || amount === '19900') {
              planType = 'premier';
            }
            
            // 사용자 구독 업그레이드
            user.upgradeSubscription(planType, {
              orderId,
              tid,
              amount: parseInt(amount)
            });
            
            await user.save();
            console.log('✅ 사용자 구독 업그레이드 완료:', {
              userId: user._id,
              plan: planType,
              status: user.subscription.status
            });
          }
        } catch (userError) {
          console.error('사용자 업그레이드 오류:', userError);
          // 결제는 성공했으므로 계속 진행
        }
      }

      // 결제 성공 페이지로 리다이렉트
      const successUrl = `${config.CLIENT_URL}/payment/success?orderId=${orderId}&tid=${tid}&amount=${amount}`;
      return res.redirect(successUrl);
      
    } else {
      console.log('❌ 결제 승인 실패:', approvalResult);
      
      // 결제 실패 페이지로 리다이렉트
      const failUrl = `${config.CLIENT_URL}/payment/fail?error=${encodeURIComponent(approvalResult.resultMsg || '결제 승인 실패')}`;
      return res.redirect(failUrl);
    }

  } catch (error) {
    console.error('❌ 결제 콜백 처리 오류:', error.response?.data || error.message);
    
    // 에러 페이지로 리다이렉트
    const errorUrl = `${config.CLIENT_URL}/payment/fail?error=${encodeURIComponent('결제 처리 중 오류가 발생했습니다')}`;
    return res.redirect(errorUrl);
  }
});

// 결제 조회
router.get('/status/:paymentKey', protect, async (req, res) => {
  try {
    const { paymentKey } = req.params;

    console.log('🔍 결제 상태 조회:', paymentKey);

    const response = await axios.get(
      `${config.NICEPAY_API_URL}/v1/payments/${paymentKey}`,
      {
        headers: {
          'Authorization': getAuthHeader()
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('결제 조회 오류:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: '결제 조회 중 오류가 발생했습니다.',
      message: error.response?.data?.message || error.message
    });
  }
});

// 웹훅 엔드포인트 (가이드 기준 - 결제완료, 가상계좌 등의 이벤트 수신)
router.post('/webhook', async (req, res) => {
  try {
    console.log('🎣 웹훅 수신:', {
      headers: req.headers,
      body: req.body
    });

    // 웹훅 성공 응답 (HTTP 200)
    res.status(200).json({
      success: true,
      message: '웹훅 처리 완료'
    });

  } catch (error) {
    console.error('❌ 웹훅 처리 오류:', error);
    res.status(500).json({
      success: false,
      error: '웹훅 처리 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;