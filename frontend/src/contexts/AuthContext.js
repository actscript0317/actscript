import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, scriptAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true); // 초기 로딩 상태를 true로 설정
  const [error, setError] = useState(null);
  const [aiGeneratedScripts, setAIGeneratedScripts] = useState([]);
  const [savedScripts, setSavedScripts] = useState([]);

  // 로그인 상태 설정
  const setAuthState = useCallback((userData, token) => {
    if (userData && token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      // 로그아웃 시 스크립트 상태 초기화
      setAIGeneratedScripts([]);
      setSavedScripts([]);
    }
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
      // 타임아웃이나 네트워크 오류인 경우 토큰은 유지하되 로딩만 해제
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        console.log('서버 연결 중... 잠시 후 다시 시도됩니다.');
        // 토큰이 있으면 일단 유지
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
          try {
            setUser(JSON.parse(savedUser));
            return true;
          } catch (e) {
            setAuthState(null, null);
            return false;
          }
        }
      } else {
        setAuthState(null, null);
      }
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
      
      if (res.data.success && res.data.token && res.data.user) {
        // 즉시 인증 상태 업데이트
        setAuthState(res.data.user, res.data.token);
        setLoading(false); // 로딩 즉시 해제
        
        // 백그라운드에서 인증 상태 재확인 (선택적)
        setTimeout(() => {
          checkAuth();
        }, 100);
        
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
      } else {
        setAIGeneratedScripts([]);
      }
    } catch (error) {
      console.error('AI 스크립트 로드 실패:', error);
      // 타임아웃이나 네트워크 오류인 경우 조용히 처리
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        console.log('서버 연결 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('AI 스크립트를 불러오는데 실패했습니다.');
      }
      setAIGeneratedScripts([]);
    }
  }, []);

  // 저장된 스크립트 로드
  const loadSavedScripts = useCallback(async () => {
    try {
      const response = await scriptAPI.getSavedScripts();
      if (response.data.success) {
        setSavedScripts(response.data.scripts || []);
      } else {
        setSavedScripts([]);
      }
    } catch (error) {
      console.error('저장된 스크립트 로드 실패:', error);
      // 타임아웃이나 네트워크 오류인 경우 조용히 처리
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        console.log('서버 연결 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('저장된 스크립트를 불러오는데 실패했습니다.');
      }
      setSavedScripts([]);
    }
  }, []);

  // AI 생성 스크립트 추가
  const addAIGeneratedScript = useCallback((scriptData) => {
    const newScript = {
      _id: Date.now().toString(), // 임시 ID
      ...scriptData,
      isAIGenerated: true,
      generatedAt: new Date().toISOString()
    };
    setAIGeneratedScripts(prev => [newScript, ...prev]);
    toast.success('AI 생성 대본이 저장되었습니다.');
  }, []);

  // 저장된 스크립트 추가
  const addSavedScript = useCallback((scriptData) => {
    const newScript = {
      _id: Date.now().toString(), // 임시 ID
      ...scriptData,
      savedAt: new Date().toISOString()
    };
    setSavedScripts(prev => [newScript, ...prev]);
    toast.success('대본이 저장되었습니다.');
  }, []);

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
      await scriptAPI.deleteSavedScript(scriptId);
      setSavedScripts(prev => prev.filter(script => script._id !== scriptId));
      toast.success('저장된 스크립트가 삭제되었습니다.');
    } catch (error) {
      console.error('저장된 스크립트 삭제 실패:', error);
      toast.error('저장된 스크립트 삭제에 실패했습니다.');
    }
  }, []);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 로그인 시 스크립트 로드
  useEffect(() => {
    if (user) {
      loadAIGeneratedScripts();
      loadSavedScripts();
    }
  }, [user, loadAIGeneratedScripts, loadSavedScripts]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
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