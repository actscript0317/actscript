require('dotenv').config();
const axios = require('axios');
const { getAdminToken } = require('./get-admin-token');

class UserManager {
  constructor() {
    this.serverUrl = process.env.SERVER_URL || 'https://actscript-1.onrender.com';
    this.token = null;
  }

  async init() {
    console.log('🔐 관리자 토큰 획득 중...');
    this.token = await getAdminToken();
    if (!this.token) {
      throw new Error('관리자 토큰을 획득할 수 없습니다.');
    }
    console.log('✅ 관리자 토큰 획득 완료\n');
  }

  async listUsers(page = 1, limit = 10, search = '') {
    try {
      console.log(`📋 사용자 목록 조회 중... (페이지: ${page}, 검색: "${search}")`);
      
      const response = await axios.get(`${this.serverUrl}/api/admin/users`, {
        params: { page, limit, search },
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.data.success) {
        const { users, pagination } = response.data.data;
        
        console.log('✅ 사용자 목록:');
        console.log(`📊 전체 ${pagination.total}명 중 ${users.length}명 표시\n`);
        
        users.forEach((user, index) => {
          const usage = user.usage || {};
          const current = usage.currentMonth || 0;
          const limit = usage.monthly_limit || 10;
          const limitText = limit === 999999 ? '무제한' : `${limit}회`;
          
          console.log(`${index + 1}. ${user.name} (@${user.username})`);
          console.log(`   📧 이메일: ${user.email}`);
          console.log(`   🆔 ID: ${user.id}`);
          console.log(`   📊 사용량: ${current}/${limitText}`);
          console.log(`   🏷️  플랜: ${user.subscription || 'free'}`);
          console.log(`   📅 가입일: ${new Date(user.created_at).toLocaleDateString('ko-KR')}`);
          console.log('');
        });
        
        return users;
      }
    } catch (error) {
      console.error('❌ 사용자 목록 조회 실패:', error.response?.data || error.message);
    }
  }

  async changeUserLimit(userId, newLimit) {
    try {
      console.log(`🔧 사용자 제한 변경 중... (ID: ${userId.slice(0, 8)}..., 새 제한: ${newLimit})`);
      
      const response = await axios.put(`${this.serverUrl}/api/admin/users/${userId}/usage-limit`, {
        monthly_limit: parseInt(newLimit)
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('✅', response.data.message);
        return response.data.data;
      }
    } catch (error) {
      console.error('❌ 사용량 제한 변경 실패:', error.response?.data || error.message);
    }
  }

  async resetUserUsage(userId) {
    try {
      console.log(`🔄 사용량 초기화 중... (ID: ${userId.slice(0, 8)}...)`);
      
      const response = await axios.put(`${this.serverUrl}/api/admin/users/${userId}/reset-usage`, {}, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.data.success) {
        console.log('✅', response.data.message);
        return response.data.data;
      }
    } catch (error) {
      console.error('❌ 사용량 초기화 실패:', error.response?.data || error.message);
    }
  }

  async getUserInfo(userId) {
    try {
      console.log(`👤 사용자 정보 조회 중... (ID: ${userId.slice(0, 8)}...)`);
      
      const response = await axios.get(`${this.serverUrl}/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.data.success) {
        const user = response.data.data;
        const usage = user.usage || {};
        
        console.log('✅ 사용자 정보:');
        console.log(`👤 이름: ${user.name} (@${user.username})`);
        console.log(`📧 이메일: ${user.email}`);
        console.log(`🆔 ID: ${user.id}`);
        console.log(`📊 이번 달 사용량: ${usage.currentMonth || 0}회`);
        console.log(`🎯 월간 제한: ${usage.monthly_limit === 999999 ? '무제한' : (usage.monthly_limit || 10) + '회'}`);
        console.log(`📈 총 생성 횟수: ${usage.totalGenerated || 0}회`);
        console.log(`🏷️ 구독 플랜: ${user.subscription || 'free'}`);
        console.log(`📅 가입일: ${new Date(user.created_at).toLocaleDateString('ko-KR')}`);
        console.log(`🔄 마지막 로그인: ${user.last_login ? new Date(user.last_login).toLocaleDateString('ko-KR') : '없음'}`);
        
        return user;
      }
    } catch (error) {
      console.error('❌ 사용자 정보 조회 실패:', error.response?.data || error.message);
    }
  }
}

// CLI 명령어 처리
async function runCommand() {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new UserManager();
  await manager.init();

  switch (command) {
    case 'list':
      const page = parseInt(args[1]) || 1;
      const search = args[2] || '';
      await manager.listUsers(page, 10, search);
      break;
      
    case 'info':
      const userId = args[1];
      if (!userId) {
        console.log('❌ 사용자 ID를 입력해주세요: npm run manage-users info USER_ID');
        return;
      }
      await manager.getUserInfo(userId);
      break;
      
    case 'limit':
      const targetUserId = args[1];
      const newLimit = args[2];
      if (!targetUserId || !newLimit) {
        console.log('❌ 사용법: npm run manage-users limit USER_ID NEW_LIMIT');
        console.log('예시: npm run manage-users limit abc123... 50');
        console.log('무제한: npm run manage-users limit abc123... 999999');
        return;
      }
      await manager.changeUserLimit(targetUserId, newLimit);
      break;
      
    case 'reset':
      const resetUserId = args[1];
      if (!resetUserId) {
        console.log('❌ 사용자 ID를 입력해주세요: npm run manage-users reset USER_ID');
        return;
      }
      await manager.resetUserUsage(resetUserId);
      break;
      
    default:
      console.log('📚 사용법:');
      console.log('npm run manage-users list [페이지] [검색어]  - 사용자 목록');
      console.log('npm run manage-users info USER_ID           - 사용자 정보');
      console.log('npm run manage-users limit USER_ID LIMIT    - 제한 변경');
      console.log('npm run manage-users reset USER_ID          - 사용량 초기화');
      console.log('');
      console.log('예시:');
      console.log('npm run manage-users list 1                 - 1페이지 사용자 목록');
      console.log('npm run manage-users list 1 김철수           - "김철수" 검색');
      console.log('npm run manage-users limit abc123... 50     - 월 50회로 제한');
      console.log('npm run manage-users limit abc123... 999999 - 무제한');
      console.log('npm run manage-users reset abc123...        - 사용량 초기화');
  }
}

if (require.main === module) {
  runCommand().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ 명령어 실행 오류:', error);
    process.exit(1);
  });
}

module.exports = UserManager;