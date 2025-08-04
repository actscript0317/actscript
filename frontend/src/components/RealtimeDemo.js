import React, { useState, useEffect } from 'react';
import { Radio, RadioOff, Users, Activity, Bell, BellOff, Eye, Plus } from 'lucide-react';
import { useScriptsRealtime, useOnlineUsers, useRealtimeStats } from '../hooks/useSupabaseRealtime';
import supabaseAPI from '../services/supabaseAPI';

const RealtimeDemo = () => {
  const [scripts, setScripts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  // 실시간 스크립트 구독
  const {
    subscribe: subscribeScripts,
    unsubscribe: unsubscribeScripts,
    isSubscribed: isScriptsSubscribed
  } = useScriptsRealtime(
    // 새 스크립트 추가
    (newScript) => {
      setScripts(prev => [newScript, ...prev.slice(0, 9)]); // 최대 10개만 유지
      addNotification('새 대본 등록', `"${newScript.title}" 대본이 등록되었습니다.`, 'success');
    },
    // 스크립트 업데이트
    (updatedScript, oldScript) => {
      setScripts(prev => prev.map(script => 
        script.id === updatedScript.id ? updatedScript : script
      ));
      
      // 조회수 업데이트가 아닌 경우만 알림
      if (oldScript.views === updatedScript.views) {
        addNotification('대본 수정', `"${updatedScript.title}" 대본이 수정되었습니다.`, 'info');
      }
    },
    // 스크립트 삭제
    (deletedScript) => {
      setScripts(prev => prev.filter(script => script.id !== deletedScript.id));
      addNotification('대본 삭제', `"${deletedScript.title}" 대본이 삭제되었습니다.`, 'error');
    }
  );

  // 온라인 사용자 추적
  const { onlineUsers, joinPresence, leavePresence } = useOnlineUsers();

  // 실시간 통계
  const { stats, subscribeToStats, unsubscribeFromStats } = useRealtimeStats();

  // 알림 추가 함수
  const addNotification = (title, message, type = 'info') => {
    if (!isNotificationsEnabled) return;

    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // 최대 5개만 유지

    // 3초 후 자동 제거
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const result = await supabaseAPI.scripts.getLatest(10);
        if (result.success) {
          setScripts(result.data.scripts);
        }
      } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
      }
    };

    loadInitialData();
  }, []);

  // 테스트용 더미 스크립트 생성
  const createTestScript = async () => {
    try {
      const testScript = {
        title: `테스트 스크립트 ${Date.now()}`,
        characterCount: Math.floor(Math.random() * 5) + 1,
        situation: '테스트 상황입니다.',
        content: '테스트 대본 내용입니다.\n\nA: 안녕하세요!\nB: 네, 안녕하세요!',
        emotions: ['기쁨', '그리움'],
        gender: '전체',
        mood: '코믹한',
        duration: '1분 이하',
        ageGroup: '20대',
        purpose: '연기 연습',
        scriptType: '대화'
      };

      const result = await supabaseAPI.scripts.create(testScript);
      if (result.success) {
        console.log('테스트 스크립트 생성 성공');
      } else {
        console.error('테스트 스크립트 생성 실패:', result.error);
      }
    } catch (error) {
      console.error('테스트 스크립트 생성 중 오류:', error);
    }
  };

  // 알림 타입별 색상
  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'error': return 'bg-red-100 border-red-500 text-red-800';
      case 'info': return 'bg-blue-100 border-blue-500 text-blue-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Activity className="w-6 h-6 text-red-500" />
          실시간 기능 데모
        </h2>
        <p className="text-gray-600 mb-6">
          Supabase 실시간 기능을 테스트해보세요. 다른 탭에서 스크립트를 추가하거나 수정하면 실시간으로 반영됩니다.
        </p>

        {/* 제어 패널 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* 실시간 구독 토글 */}
            <button
              onClick={isScriptsSubscribed ? unsubscribeScripts : subscribeScripts}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                isScriptsSubscribed 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isScriptsSubscribed ? <RadioOff className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
              {isScriptsSubscribed ? '실시간 끄기' : '실시간 켜기'}
            </button>

            {/* 알림 토글 */}
            <button
              onClick={() => setIsNotificationsEnabled(!isNotificationsEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                isNotificationsEnabled 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              {isNotificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {isNotificationsEnabled ? '알림 켜짐' : '알림 꺼짐'}
            </button>

            {/* 테스트 스크립트 생성 */}
            <button
              onClick={createTestScript}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
            >
              <Plus className="w-4 h-4" />
              테스트 스크립트 생성
            </button>

            {/* 통계 구독 토글 */}
            <button
              onClick={() => stats.totalScripts === 0 ? subscribeToStats() : unsubscribeFromStats()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium"
            >
              <Activity className="w-4 h-4" />
              통계 {stats.totalScripts === 0 ? '켜기' : '끄기'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 실시간 스크립트 목록 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isScriptsSubscribed ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                실시간 스크립트 목록
                <span className="text-sm text-gray-500">({scripts.length}개)</span>
              </h3>
            </div>
            <div className="p-4">
              {scripts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>스크립트를 기다리는 중...</p>
                  <p className="text-sm">새 스크립트가 추가되면 실시간으로 나타납니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scripts.map((script) => (
                    <div key={script.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{script.title}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{script.situation}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {script.character_count}인
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {script.views}
                            </span>
                            <span>{script.mood}</span>
                            <span>{script.duration}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 ml-3">
                          {new Date(script.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="space-y-6">
          {/* 실시간 알림 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" />
                실시간 알림
              </h3>
            </div>
            <div className="p-4">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-4">알림이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-3 rounded-lg border-l-4 ${getNotificationColor(notification.type)}`}>
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm mt-1">{notification.message}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 온라인 사용자 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                온라인 사용자 ({onlineUsers.length})
              </h3>
            </div>
            <div className="p-4">
              {onlineUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">온라인 사용자가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {onlineUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">{user.username}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(user.online_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 실시간 통계 */}
          {(stats.totalScripts > 0 || stats.totalUsers > 0) && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  실시간 통계
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalScripts}</div>
                    <div className="text-sm text-gray-500">총 스크립트</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
                    <div className="text-sm text-gray-500">총 사용자</div>
                  </div>
                </div>
                
                {stats.recentActivity.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">최근 활동</h4>
                    <div className="space-y-1">
                      {stats.recentActivity.slice(0, 3).map((activity, index) => (
                        <div key={index} className="text-xs text-gray-500 flex items-center gap-2">
                          <div className={`w-1 h-1 rounded-full ${
                            activity.type === 'INSERT' ? 'bg-green-500' : 
                            activity.type === 'UPDATE' ? 'bg-blue-500' : 'bg-red-500'
                          }`}></div>
                          <span>{activity.type} in {activity.table}</span>
                          <span className="ml-auto">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeDemo;