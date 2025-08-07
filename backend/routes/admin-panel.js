const express = require('express');
const requireAdmin = require('../middleware/adminAuth');
const { supabaseAdmin, safeQuery } = require('../config/supabase');

const router = express.Router();

// 관리자 패널 HTML 페이지
router.get('/panel', requireAdmin, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ActScript 관리자 패널</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        .section { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .user-card { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .user-info { display: flex; justify-content: space-between; align-items: center; margin: 5px 0; }
        .usage-bar { background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; margin: 8px 0; }
        .usage-fill { background: #3b82f6; height: 100%; transition: width 0.3s; }
        .buttons { display: flex; gap: 10px; margin-top: 10px; }
        button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-success { background: #10b981; color: white; }
        button:hover { opacity: 0.8; }
        input[type="number"] { padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; width: 80px; }
        .search-box { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; margin-bottom: 20px; }
        .loading { display: none; color: #6b7280; }
        .alert { padding: 12px; border-radius: 8px; margin: 10px 0; }
        .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎭 ActScript 관리자 패널</h1>
        
        <div class="section">
            <h2>👥 사용자 관리</h2>
            <input type="text" id="searchBox" class="search-box" placeholder="사용자 이름, 이메일, 사용자명으로 검색..." onkeyup="searchUsers()">
            <div class="loading" id="loading">로딩 중...</div>
            <div id="usersList"></div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn-primary" onclick="loadUsers()">새로고침</button>
            </div>
        </div>
    </div>

    <script>
        const token = localStorage.getItem('adminToken') || prompt('관리자 토큰을 입력하세요:');
        if (token) localStorage.setItem('adminToken', token);

        async function apiCall(url, options = {}) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Authorization': \`Bearer \${token}\`,
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                return await response.json();
            } catch (error) {
                showAlert('API 호출 실패: ' + error.message, 'error');
                console.error('API 오류:', error);
                return null;
            }
        }

        function showAlert(message, type = 'success') {
            const alertDiv = document.createElement('div');
            alertDiv.className = \`alert alert-\${type}\`;
            alertDiv.textContent = message;
            
            document.querySelector('.section').insertBefore(alertDiv, document.querySelector('#usersList'));
            
            setTimeout(() => alertDiv.remove(), 5000);
        }

        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
        }

        async function loadUsers(search = '') {
            showLoading(true);
            const data = await apiCall(\`/api/admin/users?page=1&limit=50&search=\${encodeURIComponent(search)}\`);
            showLoading(false);
            
            if (data && data.success) {
                displayUsers(data.data.users);
            }
        }

        function displayUsers(users) {
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '';

            users.forEach(user => {
                const usage = user.usage || {};
                const current = usage.currentMonth || 0;
                const limit = usage.monthly_limit || 10;
                const percentage = limit === 999999 ? 100 : Math.min(100, (current / limit) * 100);
                const limitText = limit === 999999 ? '무제한' : \`\${limit}회\`;
                
                const userCard = document.createElement('div');
                userCard.className = 'user-card';
                userCard.innerHTML = \`
                    <div class="user-info">
                        <strong>\${user.name}</strong>
                        <span>@\${user.username}</span>
                    </div>
                    <div class="user-info">
                        <span>📧 \${user.email}</span>
                        <span>🏷️ \${user.subscription || 'free'}</span>
                    </div>
                    <div class="user-info">
                        <span>📊 이번 달: \${current}/\${limitText}</span>
                        <span>📈 총 생성: \${usage.totalGenerated || 0}회</span>
                    </div>
                    <div class="usage-bar">
                        <div class="usage-fill" style="width: \${percentage}%; background: \${percentage > 80 ? '#ef4444' : '#3b82f6'};"></div>
                    </div>
                    <div class="buttons">
                        <input type="number" id="limit-\${user.id}" value="\${limit === 999999 ? 999999 : limit}" min="1" max="999999" step="1">
                        <button class="btn-primary" onclick="changeLimit('\${user.id}')">제한 변경</button>
                        <button class="btn-warning" onclick="resetUsage('\${user.id}')">사용량 초기화</button>
                        <button class="btn-success" onclick="setUnlimited('\${user.id}')">무제한</button>
                    </div>
                    <small style="color: #6b7280;">ID: \${user.id}</small>
                \`;
                usersList.appendChild(userCard);
            });
        }

        async function changeLimit(userId) {
            const newLimit = document.getElementById(\`limit-\${userId}\`).value;
            if (!newLimit || newLimit < 1) {
                showAlert('올바른 제한값을 입력하세요 (1 이상)', 'error');
                return;
            }

            const data = await apiCall(\`/api/admin/users/\${userId}/usage-limit\`, {
                method: 'PUT',
                body: JSON.stringify({ monthly_limit: parseInt(newLimit) })
            });

            if (data && data.success) {
                showAlert(data.message);
                loadUsers();
            }
        }

        async function resetUsage(userId) {
            if (!confirm('이 사용자의 이번 달 사용량을 초기화하시겠습니까?')) return;

            const data = await apiCall(\`/api/admin/users/\${userId}/reset-usage\`, {
                method: 'PUT'
            });

            if (data && data.success) {
                showAlert(data.message);
                loadUsers();
            }
        }

        async function setUnlimited(userId) {
            if (!confirm('이 사용자를 무제한 사용자로 설정하시겠습니까?')) return;

            const data = await apiCall(\`/api/admin/users/\${userId}/usage-limit\`, {
                method: 'PUT',
                body: JSON.stringify({ monthly_limit: 999999 })
            });

            if (data && data.success) {
                showAlert(data.message);
                loadUsers();
            }
        }

        function searchUsers() {
            const searchTerm = document.getElementById('searchBox').value;
            loadUsers(searchTerm);
        }

        // 페이지 로드 시 사용자 목록 불러오기
        loadUsers();
    </script>
</body>
</html>
  `);
});

module.exports = router;