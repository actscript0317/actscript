const axios = require('axios');

const API_BASE = 'http://localhost:10000/api';

async function testAPI() {
  console.log('🧪 API 테스트 시작...\n');
  
  const tests = [
    {
      name: '감정 목록 조회',
      method: 'GET',
      url: `${API_BASE}/emotions`,
      expected: 200
    },
    {
      name: '스크립트 목록 조회',
      method: 'GET', 
      url: `${API_BASE}/scripts`,
      expected: 200
    },
    {
      name: '인기 스크립트 조회',
      method: 'GET',
      url: `${API_BASE}/scripts/popular`,
      expected: 200
    },
    {
      name: '최신 스크립트 조회',
      method: 'GET',
      url: `${API_BASE}/scripts/latest`,
      expected: 200
    },
    {
      name: '서버 상태 확인',
      method: 'GET',
      url: 'http://localhost:10000/health',
      expected: 200
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`📋 ${test.name} 테스트 중...`);
      
      const response = await axios({
        method: test.method,
        url: test.url,
        timeout: 5000
      });
      
      if (response.status === test.expected) {
        console.log(`✅ ${test.name}: 성공 (${response.status})`);
        if (response.data) {
          const dataInfo = typeof response.data === 'object' ? 
            Object.keys(response.data).join(', ') : 
            'data received';
          console.log(`   📊 응답 데이터: ${dataInfo}`);
        }
        passed++;
      } else {
        console.log(`❌ ${test.name}: 실패 (예상: ${test.expected}, 실제: ${response.status})`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: 오류 - ${error.message}`);
      failed++;
    }
    
    console.log(''); // 빈 줄
  }
  
  console.log('🏁 테스트 결과:');
  console.log(`✅ 성공: ${passed}개`);
  console.log(`❌ 실패: ${failed}개`);
  console.log(`📊 성공률: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 모든 테스트가 성공했습니다!');
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다. 서버 상태를 확인해주세요.');
  }
}

// 5초 후에 테스트 시작 (서버 시작 대기)
setTimeout(() => {
  testAPI().catch(console.error);
}, 5000);