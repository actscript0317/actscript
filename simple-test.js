const http = require('http');

function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ ${name}: ${res.statusCode} - ${data.length}바이트`);
        try {
          const json = JSON.parse(data);
          if (json.success !== undefined) {
            console.log(`   📊 성공 여부: ${json.success}`);
          }
          if (json.emotions && Array.isArray(json.emotions)) {
            console.log(`   📋 감정 수: ${json.emotions.length}개`);
          }
          if (json.scripts && Array.isArray(json.scripts)) {
            console.log(`   📝 스크립트 수: ${json.scripts.length}개`);
          }
        } catch (e) {
          console.log(`   📄 JSON 파싱 불가: ${data.substring(0, 100)}...`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${name}: 오류 - ${err.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ ${name}: 타임아웃`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 간단 API 테스트 시작...\n');
  
  await testEndpoint('/health', '서버 상태');
  await testEndpoint('/api/emotions', '감정 목록');
  await testEndpoint('/api/scripts', '스크립트 목록');
  await testEndpoint('/api/scripts/popular', '인기 스크립트');
  await testEndpoint('/api/scripts/latest', '최신 스크립트');
  
  console.log('\n🏁 테스트 완료!');
}

runTests();