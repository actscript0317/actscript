import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

// 실시간 구독을 위한 커스텀 훅
export const useSupabaseRealtime = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeChannels, setActiveChannels] = useState(new Set());

  // 연결 상태 체크
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(supabase.status === 'OPEN');
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    activeChannels: Array.from(activeChannels),
    setActiveChannels
  };
};

// 스크립트 실시간 구독 훅
export const useScriptsRealtime = (onNewScript, onScriptUpdate, onScriptDelete) => {
  const [channel, setChannel] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscribe = useCallback(() => {
    if (channel) {
      console.log('이미 구독 중입니다.');
      return;
    }

    console.log('📡 스크립트 실시간 구독 시작...');

    const newChannel = supabase
      .channel('scripts_realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'scripts' },
        (payload) => {
          console.log('🆕 새 스크립트 추가:', payload.new);
          
          // 토스트 알림
          toast.success(`새 대본 "${payload.new.title}"이 등록되었습니다!`, {
            duration: 4000,
            position: 'top-right',
            icon: '📝'
          });
          
          // 콜백 실행
          if (onNewScript) {
            onNewScript(payload.new);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scripts' },
        (payload) => {
          console.log('✏️ 스크립트 업데이트:', payload.new);
          
          // 조회수 업데이트는 알림 안 함
          if (payload.old.views !== payload.new.views) {
            if (onScriptUpdate) {
              onScriptUpdate(payload.new, payload.old);
            }
            return;
          }
          
          // 기타 업데이트는 알림
          toast.info(`"${payload.new.title}" 대본이 수정되었습니다.`, {
            duration: 3000,
            position: 'top-right',
            icon: '✏️'
          });
          
          if (onScriptUpdate) {
            onScriptUpdate(payload.new, payload.old);
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'scripts' },
        (payload) => {
          console.log('🗑️ 스크립트 삭제:', payload.old);
          
          toast.error(`"${payload.old.title}" 대본이 삭제되었습니다.`, {
            duration: 3000,
            position: 'top-right',
            icon: '🗑️'
          });
          
          if (onScriptDelete) {
            onScriptDelete(payload.old);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 스크립트 구독 상태:', status);
        setIsSubscribed(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          toast.success('실시간 업데이트가 활성화되었습니다!', {
            duration: 2000,
            position: 'bottom-right',
            icon: '🔴'
          });
        } else if (status === 'CLOSED') {
          toast.error('실시간 연결이 끊어졌습니다.', {
            duration: 2000,
            position: 'bottom-right',
            icon: '🔴'
          });
          setIsSubscribed(false);
        }
      });

    setChannel(newChannel);
  }, [channel, onNewScript, onScriptUpdate, onScriptDelete]);

  const unsubscribe = useCallback(() => {
    if (channel) {
      console.log('📡 스크립트 실시간 구독 해제...');
      supabase.removeChannel(channel);
      setChannel(null);
      setIsSubscribed(false);
      
      toast.success('실시간 업데이트가 비활성화되었습니다.', {
        duration: 2000,
        position: 'bottom-right',
        icon: '⭕'
      });
    }
  }, [channel]);

  // 컴포넌트 언마운트 시 구독 해제
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isSubscribed,
    channel
  };
};

// 댓글 실시간 구독 훅 (미래 사용)
export const useCommentsRealtime = (scriptId, onNewComment, onCommentUpdate, onCommentDelete) => {
  const [channel, setChannel] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscribe = useCallback(() => {
    if (channel || !scriptId) return;

    console.log('💬 댓글 실시간 구독 시작 for script:', scriptId);

    const newChannel = supabase
      .channel(`comments_${scriptId}`)
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments',
          filter: `script_id=eq.${scriptId}`
        },
        (payload) => {
          console.log('💬 새 댓글:', payload.new);
          
          toast.success('새 댓글이 달렸습니다!', {
            duration: 3000,
            position: 'top-right',
            icon: '💬'
          });
          
          if (onNewComment) {
            onNewComment(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('💬 댓글 구독 상태:', status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    setChannel(newChannel);
  }, [channel, scriptId, onNewComment, onCommentUpdate, onCommentDelete]);

  const unsubscribe = useCallback(() => {
    if (channel) {
      console.log('💬 댓글 실시간 구독 해제...');
      supabase.removeChannel(channel);
      setChannel(null);
      setIsSubscribed(false);
    }
  }, [channel]);

  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isSubscribed
  };
};

// 온라인 사용자 추적 훅
export const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [channel, setChannel] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const joinPresence = useCallback(async (user) => {
    if (channel || !user) return;

    console.log('👥 온라인 사용자 추적 시작...');

    const newChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    newChannel
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        const users = Object.keys(state).map(key => state[key][0]);
        setOnlineUsers(users);
        console.log('👥 온라인 사용자:', users.length + '명');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 사용자 접속:', newPresences);
        toast.success(`${newPresences[0]?.username || '사용자'}님이 접속했습니다!`, {
          duration: 2000,
          position: 'bottom-left',
          icon: '👋'
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 사용자 떠남:', leftPresences);
        toast(`${leftPresences[0]?.username || '사용자'}님이 떠났습니다.`, {
          duration: 2000,
          position: 'bottom-left',
          icon: '👋'
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await newChannel.track({
            user_id: user.id,
            username: user.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(newChannel);
    setCurrentUser(user);
  }, [channel]);

  const leavePresence = useCallback(() => {
    if (channel) {
      console.log('👥 온라인 사용자 추적 종료...');
      supabase.removeChannel(channel);
      setChannel(null);
      setOnlineUsers([]);
      setCurrentUser(null);
    }
  }, [channel]);

  useEffect(() => {
    return () => {
      leavePresence();
    };
  }, [leavePresence]);

  return {
    onlineUsers,
    joinPresence,
    leavePresence,
    currentUser
  };
};

// 실시간 통계 훅
export const useRealtimeStats = () => {
  const [stats, setStats] = useState({
    totalScripts: 0,
    totalUsers: 0,
    onlineUsers: 0,
    recentActivity: []
  });
  const [channel, setChannel] = useState(null);

  const subscribeToStats = useCallback(() => {
    if (channel) return;

    console.log('📊 실시간 통계 구독 시작...');

    const newChannel = supabase
      .channel('stats_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'scripts' },
        async (payload) => {
          // 스크립트 수 업데이트
          const { data, error } = await supabase
            .from('scripts')
            .select('count', { count: 'exact', head: true });
          
          if (!error) {
            setStats(prev => ({
              ...prev,
              totalScripts: data || 0,
              recentActivity: [{
                type: payload.eventType,
                table: 'scripts',
                data: payload.new || payload.old,
                timestamp: new Date().toISOString()
              }, ...prev.recentActivity.slice(0, 9)]
            }));
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        async (payload) => {
          // 사용자 수 업데이트
          const { data, error } = await supabase
            .from('users')
            .select('count', { count: 'exact', head: true });
          
          if (!error) {
            setStats(prev => ({
              ...prev,
              totalUsers: data || 0,
              recentActivity: [{
                type: payload.eventType,
                table: 'users',
                data: payload.new || payload.old,
                timestamp: new Date().toISOString()
              }, ...prev.recentActivity.slice(0, 9)]
            }));
          }
        }
      )
      .subscribe();

    setChannel(newChannel);
  }, [channel]);

  const unsubscribeFromStats = useCallback(() => {
    if (channel) {
      console.log('📊 실시간 통계 구독 해제...');
      supabase.removeChannel(channel);
      setChannel(null);
    }
  }, [channel]);

  useEffect(() => {
    return () => {
      unsubscribeFromStats();
    };
  }, [unsubscribeFromStats]);

  return {
    stats,
    subscribeToStats,
    unsubscribeFromStats
  };
};