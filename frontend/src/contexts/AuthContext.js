import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

// 초기 상태
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  likedScripts: [], // 좋아요한 대본 목록
  savedScripts: [], // 저장한 대본 목록
  aiGeneratedScripts: [] // AI 생성 대본 목록
};

// 액션 타입
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGOUT: 'LOGOUT',
  LOAD_USER: 'LOAD_USER',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  ADD_LIKED_SCRIPT: 'ADD_LIKED_SCRIPT',
  REMOVE_LIKED_SCRIPT: 'REMOVE_LIKED_SCRIPT',
  SET_LIKED_SCRIPTS: 'SET_LIKED_SCRIPTS',
  ADD_SAVED_SCRIPT: 'ADD_SAVED_SCRIPT',
  REMOVE_SAVED_SCRIPT: 'REMOVE_SAVED_SCRIPT',
  SET_SAVED_SCRIPTS: 'SET_SAVED_SCRIPTS',
  ADD_AI_GENERATED_SCRIPT: 'ADD_AI_GENERATED_SCRIPT',
  REMOVE_AI_GENERATED_SCRIPT: 'REMOVE_AI_GENERATED_SCRIPT',
  SET_AI_GENERATED_SCRIPTS: 'SET_AI_GENERATED_SCRIPTS'
};

// 리듀서 함수
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      // 토큰과 사용자 정보를 localStorage에 저장
      if (action.payload.token) {
        localStorage.setItem('token', action.payload.token);
      }
      if (action.payload.user) {
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      }
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAIL:
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOAD_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.ADD_LIKED_SCRIPT:
      return {
        ...state,
        likedScripts: [...state.likedScripts, action.payload]
      };

    case AUTH_ACTIONS.REMOVE_LIKED_SCRIPT:
      return {
        ...state,
        likedScripts: state.likedScripts.filter(script => script._id !== action.payload)
      };

    case AUTH_ACTIONS.SET_LIKED_SCRIPTS:
      return {
        ...state,
        likedScripts: action.payload
      };

    case AUTH_ACTIONS.ADD_SAVED_SCRIPT:
      return {
        ...state,
        savedScripts: [...state.savedScripts, action.payload]
      };

    case AUTH_ACTIONS.REMOVE_SAVED_SCRIPT:
      return {
        ...state,
        savedScripts: state.savedScripts.filter(script => script._id !== action.payload)
      };

    case AUTH_ACTIONS.SET_SAVED_SCRIPTS:
      return {
        ...state,
        savedScripts: action.payload
      };

    case AUTH_ACTIONS.ADD_AI_GENERATED_SCRIPT:
      return {
        ...state,
        aiGeneratedScripts: [...state.aiGeneratedScripts, action.payload]
      };

    case AUTH_ACTIONS.REMOVE_AI_GENERATED_SCRIPT:
      return {
        ...state,
        aiGeneratedScripts: state.aiGeneratedScripts.filter(script => script._id !== action.payload)
      };

    case AUTH_ACTIONS.SET_AI_GENERATED_SCRIPTS:
      return {
        ...state,
        aiGeneratedScripts: action.payload
      };

    default:
      return state;
  }
};

// Context 생성
const AuthContext = createContext();

// Context Provider 컴포넌트
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 앱 시작 시 토큰 확인 및 사용자 정보 로드
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // 사용자 정보 로드
  const loadUser = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      // 저장된 사용자 정보가 있으면 복원
      if (token.startsWith('dummy-jwt-token') && userStr) {
        try {
          const user = JSON.parse(userStr);
          dispatch({
            type: AUTH_ACTIONS.LOAD_USER,
            payload: user
          });
        } catch (error) {
          console.error('사용자 정보 파싱 실패:', error);
          // 잘못된 사용자 정보가 저장된 경우 로그아웃
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } else {
        // 토큰은 있지만 사용자 정보가 없거나 유효하지 않은 토큰
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
      
      // 실제 API 호출 (백엔드 연동 시 사용)
      // const response = await authAPI.getMe();
      // dispatch({
      //   type: AUTH_ACTIONS.LOAD_USER,
      //   payload: response.data.user
      // });
      
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // 회원가입
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      // 백엔드가 없으므로 더미 회원가입 로직 사용
      
      // 기존 사용자 목록 가져오기
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      
      // 이메일 중복 체크
      const existingUser = existingUsers.find(user => user.email === userData.email);
      if (existingUser) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAIL,
          payload: '이미 등록된 이메일입니다.'
        });
        return { success: false, message: '이미 등록된 이메일입니다.' };
      }
      
      const dummyUser = {
        _id: 'user_' + Date.now(),
        name: userData.name,
        username: userData.username || userData.name,
        email: userData.email,
        password: userData.password, // 실제 환경에서는 암호화해야 함
        createdAt: new Date().toISOString()
      };
      
      // 새 사용자를 localStorage에 저장
      const updatedUsers = [...existingUsers, dummyUser];
      localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
      
      const dummyToken = 'dummy-jwt-token-' + Date.now();
      
      // 비밀번호 제외하고 사용자 정보 반환
      const userWithoutPassword = {
        _id: dummyUser._id,
        name: dummyUser.name,
        username: dummyUser.username,
        email: dummyUser.email,
        createdAt: dummyUser.createdAt
      };
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: userWithoutPassword,
          token: dummyToken
        }
      });

      return { success: true, message: '회원가입이 완료되었습니다!' };
      
      // 실제 API 호출 (백엔드 연동 시 사용)
      // const response = await authAPI.register(userData);
      // dispatch({
      //   type: AUTH_ACTIONS.LOGIN_SUCCESS,
      //   payload: {
      //     user: response.data.user,
      //     token: response.data.token
      //   }
      // });
      // return { success: true, message: response.data.message };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || '회원가입 중 오류가 발생했습니다.';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAIL,
        payload: errorMessage
      });
      return { success: false, message: errorMessage };
    }
  };

  // 로그인
  const login = async (loginData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      // 백엔드가 없으므로 더미 로그인 로직 사용
      
      // localStorage에서 등록된 사용자들 가져오기
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      
      // 기본 더미 사용자 계정도 포함
      const allUsers = [
        {
          _id: 'user123',
          name: '김연기',
          username: 'actor_kim',
          email: 'test@example.com',
          password: 'password123',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        ...registeredUsers
      ];
      
      // 이메일과 비밀번호로 사용자 찾기
      const user = allUsers.find(u => 
        u.email === loginData.email && u.password === loginData.password
      );
      
      if (user) {
        // 비밀번호 제외하고 사용자 정보 반환
        const userWithoutPassword = {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        };
        
        const dummyToken = 'dummy-jwt-token-' + Date.now();
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: userWithoutPassword,
            token: dummyToken
          }
        });

        return { success: true, message: '로그인 성공!' };
      } else {
        // 잘못된 로그인 정보
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAIL,
          payload: '이메일 또는 비밀번호가 올바르지 않습니다.'
        });
        return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
      }
      
      // 실제 API 호출 (백엔드 연동 시 사용)
      // const response = await authAPI.login(loginData);
      // dispatch({
      //   type: AUTH_ACTIONS.LOGIN_SUCCESS,
      //   payload: {
      //     user: response.data.user,
      //     token: response.data.token
      //   }
      // });
      // return { success: true, message: response.data.message };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || '로그인 중 오류가 발생했습니다.';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAIL,
        payload: errorMessage
      });
      return { success: false, message: errorMessage };
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // 프로필 업데이트
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: response.data.user
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '프로필 수정 중 오류가 발생했습니다.';
      return { success: false, message: errorMessage };
    }
  };

  // 비밀번호 변경
  const changePassword = async (passwordData) => {
    try {
      const response = await authAPI.changePassword(passwordData);
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.';
      return { success: false, message: errorMessage };
    }
  };

  // 에러 클리어
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // 대본 좋아요 추가
  const addLikedScript = useCallback((script) => {
    // 로컬 스토리지에 저장 (추후 API 연동 예정)
    const currentLiked = JSON.parse(localStorage.getItem('likedScripts') || '[]');
    const newLiked = [...currentLiked, { ...script, likedAt: new Date().toISOString() }];
    localStorage.setItem('likedScripts', JSON.stringify(newLiked));
    
    dispatch({
      type: AUTH_ACTIONS.ADD_LIKED_SCRIPT,
      payload: { ...script, likedAt: new Date().toISOString() }
    });
  }, []);

  // 대본 좋아요 제거
  const removeLikedScript = useCallback((scriptId) => {
    // 로컬 스토리지에서 제거 (추후 API 연동 예정)
    const currentLiked = JSON.parse(localStorage.getItem('likedScripts') || '[]');
    const newLiked = currentLiked.filter(script => script._id !== scriptId);
    localStorage.setItem('likedScripts', JSON.stringify(newLiked));
    
    dispatch({
      type: AUTH_ACTIONS.REMOVE_LIKED_SCRIPT,
      payload: scriptId
    });
  }, []);

  // 좋아요한 대본 목록 로드
  const loadLikedScripts = useCallback(() => {
    // 로컬 스토리지에서 로드 (추후 API 연동 예정)
    const likedScripts = JSON.parse(localStorage.getItem('likedScripts') || '[]');
    dispatch({
      type: AUTH_ACTIONS.SET_LIKED_SCRIPTS,
      payload: likedScripts
    });
  }, []);

  // 대본이 좋아요 되었는지 확인
  const isScriptLiked = useCallback((scriptId) => {
    return state.likedScripts.some(script => script._id === scriptId);
  }, [state.likedScripts]);

  // 대본 저장 추가
  const addSavedScript = useCallback((script) => {
    // 로컬 스토리지에 저장 (추후 API 연동 예정)
    const currentSaved = JSON.parse(localStorage.getItem('savedScripts') || '[]');
    const newSaved = [...currentSaved, { ...script, savedAt: new Date().toISOString() }];
    localStorage.setItem('savedScripts', JSON.stringify(newSaved));
    
    dispatch({
      type: AUTH_ACTIONS.ADD_SAVED_SCRIPT,
      payload: { ...script, savedAt: new Date().toISOString() }
    });
  }, []);

  // 대본 저장 제거
  const removeSavedScript = useCallback((scriptId) => {
    // 로컬 스토리지에서 제거 (추후 API 연동 예정)
    const currentSaved = JSON.parse(localStorage.getItem('savedScripts') || '[]');
    const newSaved = currentSaved.filter(script => script._id !== scriptId);
    localStorage.setItem('savedScripts', JSON.stringify(newSaved));
    
    dispatch({
      type: AUTH_ACTIONS.REMOVE_SAVED_SCRIPT,
      payload: scriptId
    });
  }, []);

  // 저장한 대본 목록 로드
  const loadSavedScripts = useCallback(() => {
    // 로컬 스토리지에서 로드 (추후 API 연동 예정)
    const savedScripts = JSON.parse(localStorage.getItem('savedScripts') || '[]');
    dispatch({
      type: AUTH_ACTIONS.SET_SAVED_SCRIPTS,
      payload: savedScripts
    });
  }, []);

  // 대본이 저장되었는지 확인
  const isScriptSaved = useCallback((scriptId) => {
    return state.savedScripts.some(script => script._id === scriptId);
  }, [state.savedScripts]);

  // 대본에서 제목 추출 함수
  const extractTitleFromScript = (scriptContent) => {
    if (!scriptContent) return '제목 없음';
    
    const lines = scriptContent.split('\n');
    
    // 제목을 찾는 여러 패턴 시도
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // "제목:" 또는 "**제목:**" 패턴
      if (trimmedLine.match(/^\*\*제목:\*\*/i)) {
        let title = trimmedLine.replace(/^\*\*제목:\*\*\s*/i, '').trim();
        // 따옴표 제거
        title = title.replace(/^[""]/, '').replace(/[""]$/, '').trim();
        if (title && title.length > 0) return title;
      }
      
      if (trimmedLine.match(/^제목:/i)) {
        let title = trimmedLine.replace(/^제목:\s*/i, '').trim();
        // 따옴표 제거
        title = title.replace(/^[""]/, '').replace(/[""]$/, '').trim();
        if (title && title.length > 0) return title;
      }
    }
    
    // 제목이 없으면 장르와 감정을 조합해서 의미있는 제목 생성
    return '생성된 대본';
  };

  // AI 생성 대본 추가
  const addAIGeneratedScript = useCallback((scriptData) => {
    const extractedTitle = extractTitleFromScript(scriptData.script);
    const finalTitle = extractedTitle !== '생성된 대본' 
      ? extractedTitle 
      : `${scriptData.metadata.genre || '미분류'} ${scriptData.metadata.emotion?.split(',')[0]?.trim() || ''} 대본`.trim();
    
    const aiScript = {
      _id: 'ai_' + Date.now(),
      title: finalTitle,
      content: scriptData.script,
      characterCount: scriptData.metadata.characterCount,
      genre: scriptData.metadata.genre,
      emotion: scriptData.metadata.emotion,
      length: scriptData.metadata.length,
      generatedAt: scriptData.metadata.generatedAt,
      isAIGenerated: true
    };
    
    // 로컬 스토리지에 저장
    const currentAIScripts = JSON.parse(localStorage.getItem('aiGeneratedScripts') || '[]');
    const newAIScripts = [aiScript, ...currentAIScripts]; // 최신 순으로 정렬
    localStorage.setItem('aiGeneratedScripts', JSON.stringify(newAIScripts));
    
    dispatch({
      type: AUTH_ACTIONS.ADD_AI_GENERATED_SCRIPT,
      payload: aiScript
    });

    return aiScript;
  }, []);

  // AI 생성 대본 제거
  const removeAIGeneratedScript = useCallback((scriptId) => {
    // 로컬 스토리지에서 제거
    const currentAIScripts = JSON.parse(localStorage.getItem('aiGeneratedScripts') || '[]');
    const newAIScripts = currentAIScripts.filter(script => script._id !== scriptId);
    localStorage.setItem('aiGeneratedScripts', JSON.stringify(newAIScripts));
    
    dispatch({
      type: AUTH_ACTIONS.REMOVE_AI_GENERATED_SCRIPT,
      payload: scriptId
    });
  }, []);

  // AI 생성 대본 목록 로드
  const loadAIGeneratedScripts = useCallback(() => {
    // 로컬 스토리지에서 로드
    const aiGeneratedScripts = JSON.parse(localStorage.getItem('aiGeneratedScripts') || '[]');
    dispatch({
      type: AUTH_ACTIONS.SET_AI_GENERATED_SCRIPTS,
      payload: aiGeneratedScripts
    });
  }, []);

  const value = {
    ...state,
    register,
    login,
    logout,
    loadUser,
    updateProfile,
    changePassword,
    clearError,
    addLikedScript,
    removeLikedScript,
    loadLikedScripts,
    isScriptLiked,
    addSavedScript,
    removeSavedScript,
    loadSavedScripts,
    isScriptSaved,
    addAIGeneratedScript,
    removeAIGeneratedScript,
    loadAIGeneratedScripts
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Context 사용을 위한 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 