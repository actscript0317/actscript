import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, scriptAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true); // 초기에는 true로 시작
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
      
      if (res.data.success && res.data.token && res.data.user) {
        // 즉시 인증 상태 업데이트
        setAuthState(res.data.user, res.data.token);
        
        // 강제로 모든 컴포넌트 리렌더링 트리거
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

  // Google 로그인
  const googleLogin = async (googleToken) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authAPI.googleLogin({ token: googleToken });
      
      if (res.data.success && res.data.token && res.data.user) {
        // 즉시 인증 상태 업데이트
        setAuthState(res.data.user, res.data.token);
        
        // 강제로 모든 컴포넌트 리렌더링 트리거
        setLoading(false);
        
        // 새 사용자인지 기존 사용자인지에 따라 다른 메시지
        const welcomeMessage = res.data.isNewUser 
          ? `환영합니다, ${res.data.user.name}님! 회원가입이 완료되었습니다.`
          : `안녕하세요, ${res.data.user.name}님!`;
        
        toast.success(welcomeMessage);
        
        return { 
          success: true,
          user: res.data.user,
          isNewUser: res.data.isNewUser
        };
      }

      throw new Error('Google 로그인 응답에 필요한 데이터가 없습니다.');
    } catch (error) {
      console.error('[Google 로그인 실패]', error);
      const errorMessage = error.response?.data?.message || 'Google 로그인에 실패했습니다.';
      setError(errorMessage);
      setAuthState(null, null);
      toast.error(errorMessage);
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

  // AI 생성 스크립트 추가 (AI 생성 직후 자동 저장된 것)
  const addAIGeneratedScript = useCallback((scriptData) => {
    // 생성된 스크립트는 이미 백엔드에서 저장되었으므로 상태만 업데이트
    setAIGeneratedScripts(prev => [scriptData, ...prev]);
  }, []);

  // 저장된 스크립트 추가 (대본함에 저장)
  const addSavedScript = useCallback(async (scriptData) => {
    try {
      // scriptData가 AI 생성 스크립트 ID를 포함하고 있으면 백엔드 API 호출
      if (scriptData.scriptId) {
        await scriptAPI.saveAIScript(scriptData.scriptId);
        // 로컬 상태 업데이트 - 저장된 스크립트 목록에 추가
        await loadSavedScripts();
        toast.success('대본이 대본함에 저장되었습니다.');
      } else {
        // 기존 로직 유지 (localStorage 기반)
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
      // MongoDB에서 저장된 AI 스크립트인지 확인
      const script = savedScripts.find(s => s._id === scriptId);
      if (script && script._id.length === 24) { // MongoDB ObjectId 길이
        // 실제로는 isSaved를 false로 변경 (삭제하지 않음)
        // await scriptAPI.deleteSavedScript(scriptId); // 구현 필요시
        setSavedScripts(prev => prev.filter(script => script._id !== scriptId));
      } else {
        // localStorage 기반 스크립트
        setSavedScripts(prev => prev.filter(script => script._id !== scriptId));
      }
      toast.success('저장된 스크립트가 삭제되었습니다.');
    } catch (error) {
      console.error('저장된 스크립트 삭제 실패:', error);
      toast.error('저장된 스크립트 삭제에 실패했습니다.');
    }
  }, [savedScripts]);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setLoading(false);
        // 백그라운드에서 토큰 유효성 검사 (비동기, 빠른 로딩을 위해)
        checkAuth().catch(() => {
          // 토큰이 만료된 경우 조용히 로그아웃
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

  // 직접 로그인 상태 설정 (회원가입 완료 후 사용)
  const setUserAuth = useCallback((userData, token) => {
    setAuthState(userData, token);
  }, [setAuthState]);

  const value = {
    user,
    loading,
    error,
    login,
    googleLogin,
    logout,
    checkAuth,
    setUserAuth, // 추가
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