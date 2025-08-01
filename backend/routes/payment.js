const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/env');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 나이스페이먼트 Basic 인증 헤더 생성
const getAuthHeader = () => {
  const credentials = Buffer.from(`${config.NICEPAY_CLIENT_KEY}:${config.NICEPAY_SECRET_KEY}`).toString('base64');
  return `Basic ${credentials}`;
};

// 결제 준비 (orderId 생성)
router.post('/prepare', protect, async (req, res) => {
  try {
    const { amount, orderName, customerName, customerEmail } = req.body;

    // 입력값 검증
    if (!amount || !orderName) {
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다.',
        required: ['amount', 'orderName']
      });
    }

    // 고유한 주문번호 생성
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 결제 준비 데이터
    const paymentData = {
      orderId,
      amount: parseInt(amount),
      orderName,
      customerName: customerName || req.user.name,
      customerEmail: customerEmail || req.user.email,
      returnUrl: `${config.CLIENT_URL}/payment/success`,
      failUrl: `${config.CLIENT_URL}/payment/fail`,
      cancelUrl: `${config.CLIENT_URL}/payment/cancel`,
      clientKey: config.NICEPAY_CLIENT_KEY
    };

    console.log('💳 결제 준비 완료:', { orderId, amount, orderName });

    res.json({
      success: true,
      data: paymentData
    });

  } catch (error) {
    console.error('결제 준비 오류:', error);
    res.status(500).json({
      error: '결제 준비 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 결제 승인
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