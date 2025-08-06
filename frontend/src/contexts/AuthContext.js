import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, scriptAPI } from '../services/api';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiGeneratedScripts, setAIGeneratedScripts] = useState([]);
  const [savedScripts, setSavedScripts] = useState([]);

  // 인증 상태 설정
  const setAuthState = useCallback((userData, token) => {
    if (userData && token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setAIGeneratedScripts([]);
      setSavedScripts([]);
    }
    setLoading(false);
    setError(null);
  }, []);

  // 로그인 상태 확인
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState(null, null);
        return false;
      }

      const res = await authAPI.getMe();
      if (res.data.success && res.data.user) {
        setAuthState(res.data.user, token);
        return true;
      } else {
        setAuthState(null, null);
        return false;
      }
    } catch (error) {
      console.error('[인증 확인 실패]', error);
      setAuthState(null, null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setAuthState]);

  // 로그인
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authAPI.login({ email, password });
      
      if (res.data.success && res.data.session && res.data.user) {
        const token = res.data.session.access_token;
        setAuthState(res.data.user, token);
        setLoading(false);
        
        return { 
          success: true,
          user: res.data.user
        };
      }

      throw new Error('로그인 응답에 필요한 데이터가 없습니다.');
    } catch (error) {
      console.error('[로그인 실패]', error);
      const errorMessage = error.response?.data?.message || '로그인에 실패했습니다.';
      setError(errorMessage);
      setAuthState(null, null);
      return { 
        success: false, 
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
      await supabase.auth.signOut(); // Supabase 세션도 정리
    } catch (error) {
      console.error('[로그아웃 실패]', error);
    } finally {
      setAuthState(null, null);
      toast.success('로그아웃되었습니다.');
    }
  }, [setAuthState]);

  // AI 생성 스크립트 로드
  const loadAIGeneratedScripts = useCallback(async () => {
    try {
      const response = await scriptAPI.getAIScripts();
      if (response.data.success) {
        setAIGeneratedScripts(response.data.scripts || []);
      }
    } catch (error) {
      console.error('[AI 스크립트 로드 실패]', error);
      setAIGeneratedScripts([]);
    }
  }, []);

  // 저장된 스크립트 로드
  const loadSavedScripts = useCallback(async () => {
    try {
      const response = await scriptAPI.getSavedAIScripts();
      if (response.data.success) {
        setSavedScripts(response.data.scripts || []);
      }
    } catch (error) {
      console.error('[저장된 스크립트 로드 실패]', error);
      setSavedScripts([]);
    }
  }, []);

  // AI 생성 스크립트 추가
  const addAIGeneratedScript = useCallback((scriptData) => {
    setAIGeneratedScripts(prev => [scriptData, ...prev]);
  }, []);

  // 저장된 스크립트 추가
  const addSavedScript = useCallback(async (scriptData) => {
    try {
      if (scriptData.scriptId) {
        await scriptAPI.saveAIScript(scriptData.scriptId);
        await loadSavedScripts();
        toast.success('대본이 대본함에 저장되었습니다.');
      } else {
        const newScript = {
          _id: Date.now().toString(),
          ...scriptData,
          savedAt: new Date().toISOString()
        };
        setSavedScripts(prev => [newScript, ...prev]);
        toast.success('대본이 저장되었습니다.');
      }
    } catch (error) {
      console.error('스크립트 저장 실패:', error);
      toast.error('스크립트 저장에 실패했습니다.');
    }
  }, [loadSavedScripts]);

  // AI 생성 스크립트 삭제
  const removeAIGeneratedScript = useCallback(async (scriptId) => {
    try {
      await scriptAPI.deleteAIScript(scriptId);
      setAIGeneratedScripts(prev => prev.filter(script => script._id !== scriptId));
      toast.success('AI 생성 스크립트가 삭제되었습니다.');
    } catch (error) {
      console.error('AI 스크립트 삭제 실패:', error);
      toast.error('AI 스크립트 삭제에 실패했습니다.');
    }
  }, []);

  // 저장된 스크립트 삭제
  const removeSavedScript = useCallback(async (scriptId) => {
    try {
      setSavedScripts(prev => prev.filter(script => script._id !== scriptId));
      toast.success('저장된 스크립트가 삭제되었습니다.');
    } catch (error) {
      console.error('저장된 스크립트 삭제 실패:', error);
      toast.error('저장된 스크립트 삭제에 실패했습니다.');
    }
  }, []);

  // 직접 로그인 상태 설정 (회원가입 완료 후 사용)
  const setUserAuth = useCallback((userData, token) => {
    setAuthState(userData, token);
  }, [setAuthState]);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setLoading(false);
        // 백그라운드에서 토큰 유효성 검사
        checkAuth().catch(() => {
          setAuthState(null, null);
        });
      } catch (error) {
        console.error('저장된 사용자 데이터 파싱 오류:', error);
        setAuthState(null, null);
      }
    } else {
      setLoading(false);
    }
  }, [checkAuth, setAuthState]);

  // 로그인 시 스크립트 로드
  useEffect(() => {
    if (user) {
      loadAIGeneratedScripts();
      loadSavedScripts();
    }
  }, [user, loadAIGeneratedScripts, loadSavedScripts]);

  // Supabase Auth 상태 변화 감지
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Supabase Auth 상태 변화:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        // 이미 프론트엔드에서 로그인 처리가 된 경우가 아니라면 업데이트
        if (!user && session.user) {
          try {
            const res = await authAPI.getMe();
            if (res.data.success && res.data.user) {
              setAuthState(res.data.user, session.access_token);
            }
          } catch (error) {
            console.error('Auth state change 사용자 정보 조회 실패:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // 로그아웃 이벤트 감지 시 상태 정리
        if (user) {
          setAuthState(null, null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [user, setAuthState]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    setUserAuth,
    isAuthenticated: !!user,
    aiGeneratedScripts,
    savedScripts,
    loadAIGeneratedScripts,
    loadSavedScripts,
    removeAIGeneratedScript,
    removeSavedScript,
    addAIGeneratedScript,
    addSavedScript
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;