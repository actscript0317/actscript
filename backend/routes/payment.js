const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/env');
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
router.get('/test-auth', (req, res) => {
  try {
    const authHeader = getAuthHeader();
    
    // 예상되는 결과와 비교
    const expectedClientKey = 'R2_38961c9b2b494219adacb01cbd31f583';
    const expectedSecretKey = '534fa658a8a24b4c8f8d7ded325cf569';
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

    // 나이스페이먼츠 API 키 확인 (실제 키가 있으므로 주석 처리)
    // if (!config.NICEPAY_CLIENT_KEY || config.NICEPAY_CLIENT_KEY === 'R2_38961c9b2b494219adacb01cbd31f583') {
    if (false) { // 실제 키로 테스트하기 위해 false로 설정
      
      // 테스트용 응답
      const testOrderId = `TEST_ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const testPaymentData = {
        orderId: testOrderId,
        amount: parseInt(amount),
        orderName,
        customerName: customerName || req.user?.name || '고객',
        customerEmail: customerEmail || req.user?.email || '',
        returnUrl: `${config.CLIENT_URL}/payment/success`,
        failUrl: `${config.CLIENT_URL}/payment/fail`,
        cancelUrl: `${config.CLIENT_URL}/payment/cancel`,
        clientKey: 'TEST_CLIENT_KEY',
        isTestMode: true,
        message: '나이스페이먼츠 API 키를 설정해주세요'
      };

      console.log('🧪 테스트 결제 준비 완료:', { orderId: testOrderId, amount, orderName });

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        data: testPaymentData
      });
    }

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

    // 나이스페이먼츠 API 키 확인 (실제 키가 있으므로 주석 처리)
    // if (!config.NICEPAY_CLIENT_KEY || config.NICEPAY_CLIENT_KEY === 'R2_38961c9b2b494219adacb01cbd31f583') {
    if (false) { // 실제 키로 테스트하기 위해 false로 설정
      
      // 테스트용 승인 응답
      const testApprovalData = {
        resultCode: '0000',
        resultMsg: '테스트 승인 완료',
        tid: tid,
        orderId: orderId,
        amount: parseInt(amount),
        status: 'paid',
        paidAt: new Date().toISOString(),
        payMethod: 'CARD',
        goodsName: 'AI 스크립트 생성 서비스',
        isTestMode: true
      };

      console.log('🧪 테스트 결제 승인 완료:', testApprovalData);

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        data: testApprovalData,
        message: '테스트 결제 승인이 완료되었습니다.'
      });
    }

    // 실제 나이스페이먼츠 결제 승인 API 호출
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

    if (paymentResult.resultCode === '0000') {
      console.log('✅ 실제 결제 승인 성공:', paymentResult);
      
      // TODO: 여기서 데이터베이스에 결제 정보 저장
      // const payment = new Payment({
      //   userId: req.user._id,
      //   tid,
      //   orderId,
      //   amount,
      //   status: 'completed',
      //   paymentResult
      // });
      // await payment.save();

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
    console.error('❌ 결제 승인 오류:', error.response?.data || error.message);
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: '결제 승인 중 오류가 발생했습니다.',
      message: error.response?.data?.message || error.message
    });
  }
});

// 기존 결제 승인 (호환성 유지)
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
      
      // TODO: 여기서 데이터베이스에 결제 정보 저장
      // const payment = new Payment({
      //   userId: req.user._id,
      //   paymentKey,
      //   orderId,
      //   amount,
      //   status: 'completed',
      //   paymentResult
      // });
      // await payment.save();

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

module.exports = router;