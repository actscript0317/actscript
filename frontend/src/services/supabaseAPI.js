import { supabase, dbHelpers, authHelpers } from '../utils/supabase';

// 에러 처리 헬퍼
const handleSupabaseError = (error) => {
  console.error('Supabase API Error:', error);
  return {
    success: false,
    error: error.message || 'An error occurred',
    details: error
  };
};

// 성공 응답 헬퍼
const handleSuccess = (data, message = 'Success') => {
  return {
    success: true,
    data: data,
    message: message
  };
};

// 스크립트 관련 API (Supabase 버전)
export const supabaseScriptAPI = {
  // 모든 스크립트 조회 (필터링, 검색, 페이지네이션 지원)
  getAll: async (params = {}) => {
    try {
      const {
        page = 1,
        limit = 12,
        search = '',
        emotion = '',
        gender = '',
        mood = '',
        duration = '',
        ageGroup = '',
        purpose = '',
        scriptType = '',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;

      console.log('🔍 Supabase 스크립트 조회 시작:', params);

      let query = supabase
        .from('scripts')
        .select(`
          *,
          users!scripts_author_id_fkey(username, name)
        `);

      // 검색 필터
      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,situation.ilike.%${search}%`);
      }

      // 감정 필터
      if (emotion) {
        query = query.contains('emotions', [emotion]);
      }

      // 기타 필터들
      if (gender && gender !== '전체') {
        query = query.eq('gender', gender);
      }
      if (mood) {
        query = query.eq('mood', mood);
      }
      if (duration) {
        query = query.eq('duration', duration);
      }
      if (ageGroup) {
        query = query.eq('age_group', ageGroup);
      }
      if (purpose) {
        query = query.eq('purpose', purpose);
      }
      if (scriptType) {
        query = query.eq('script_type', scriptType);
      }

      // 정렬
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // 페이지네이션
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ Supabase 스크립트 조회 성공:', data.length + '개');

      return handleSuccess({
        scripts: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: data && data.length === parseInt(limit)
        }
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  },

  // 단일 스크립트 조회
  getById: async (id) => {
    try {
      console.log('📖 스크립트 상세 조회:', id);

      const { data, error } = await supabase
        .from('scripts')
        .select(`
          *,
          users!scripts_author_id_fkey(username, name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return handleSupabaseError(error);
      }

      // 조회수 증가 (비동기, 실패해도 무관)
      supabase
        .from('scripts')
        .update({ views: data.views + 1 })
        .eq('id', id)
        .then()
        .catch(err => console.warn('조회수 증가 실패:', err));

      console.log('✅ 스크립트 상세 조회 성공:', data.title);

      return handleSuccess({
        script: {
          ...data,
          views: data.views + 1 // 증가된 조회수 반영
        }
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  },

  // 인기 스크립트 조회
  getPopular: async (limit = 10) => {
    try {
      console.log('🔥 인기 스크립트 조회');

      const { data, error } = await supabase
        .from('scripts')
        .select(`
          *,
          users!scripts_author_id_fkey(username, name)
        `)
        .order('views', { ascending: false })
        .limit(limit);

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ 인기 스크립트 조회 성공:', data.length + '개');

      return handleSuccess({
        scripts: data || []
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  },

  // 최신 스크립트 조회
  getLatest: async (limit = 10) => {
    try {
      console.log('🆕 최신 스크립트 조회');

      const { data, error } = await supabase
        .from('scripts')
        .select(`
          *,
          users!scripts_author_id_fkey(username, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ 최신 스크립트 조회 성공:', data.length + '개');

      return handleSuccess({
        scripts: data || []
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  },

  // 스크립트 생성 (인증 필요)
  create: async (scriptData) => {
    try {
      console.log('📝 스크립트 생성 시작');

      // 현재 사용자 확인
      const user = await authHelpers.getCurrentUser();
      if (!user) {
        return handleSupabaseError(new Error('로그인이 필요합니다.'));
      }

      // 사용자 정보 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, name')
        .eq('id', user.id)
        .single();

      if (userError) {
        return handleSupabaseError(userError);
      }

      // 스크립트 데이터 준비
      const newScript = {
        title: scriptData.title,
        character_count: scriptData.characterCount,
        situation: scriptData.situation,
        content: scriptData.content,
        emotions: scriptData.emotions || [],
        gender: scriptData.gender || '전체',
        mood: scriptData.mood,
        duration: scriptData.duration,
        age_group: scriptData.ageGroup,
        purpose: scriptData.purpose,
        script_type: scriptData.scriptType,
        author_name: userData.name,
        author_username: userData.username,
        author_id: user.id
      };

      const { data, error } = await supabase
        .from('scripts')
        .insert(newScript)
        .select()
        .single();

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ 스크립트 생성 성공:', data.title);

      return handleSuccess(data, '스크립트가 성공적으로 생성되었습니다.');

    } catch (error) {
      return handleSupabaseError(error);
    }
  }
};

// 감정 관련 API
export const supabaseEmotionAPI = {
  // 모든 감정 조회
  getAll: async () => {
    try {
      console.log('😊 감정 목록 조회');

      const { data, error } = await supabase
        .from('emotions')
        .select('*')
        .order('name');

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ 감정 목록 조회 성공:', data.length + '개');

      return handleSuccess({
        emotions: data || []
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  }
};

// AI 스크립트 관련 API
export const supabaseAIScriptAPI = {
  // 사용자의 AI 스크립트 목록 조회
  getMy: async (page = 1, limit = 12) => {
    try {
      console.log('🤖 AI 스크립트 목록 조회');

      const user = await authHelpers.getCurrentUser();
      if (!user) {
        return handleSupabaseError(new Error('로그인이 필요합니다.'));
      }

      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('ai_scripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ AI 스크립트 목록 조회 성공:', data.length + '개');

      return handleSuccess({
        scripts: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: data && data.length === parseInt(limit)
        }
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  },

  // AI 스크립트 삭제
  delete: async (id) => {
    try {
      console.log('🗑️ AI 스크립트 삭제:', id);

      const user = await authHelpers.getCurrentUser();
      if (!user) {
        return handleSupabaseError(new Error('로그인이 필요합니다.'));
      }

      const { error } = await supabase
        .from('ai_scripts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ AI 스크립트 삭제 성공');

      return handleSuccess(null, 'AI 스크립트가 삭제되었습니다.');

    } catch (error) {
      return handleSupabaseError(error);
    }
  }
};

// 인증 관련 API
export const supabaseAuthAPI = {
  // 현재 사용자 정보 조회
  getCurrentUser: async () => {
    try {
      console.log('👤 현재 사용자 정보 조회');

      const user = await authHelpers.getCurrentUser();
      if (!user) {
        return handleSupabaseError(new Error('로그인되지 않음'));
      }

      // 사용자 프로필 정보 조회
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ 사용자 정보 조회 성공:', profile.username);

      return handleSuccess({
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          isEmailVerified: profile.is_email_verified,
          subscription: profile.subscription,
          usage: profile.usage,
          createdAt: profile.created_at
        }
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  },

  // 로그인 상태 확인
  checkAuthStatus: async () => {
    try {
      const session = await authHelpers.getSession();
      return {
        success: true,
        isAuthenticated: !!session,
        session: session
      };
    } catch (error) {
      return handleSupabaseError(error);
    }
  }
};

// 북마크 관련 API
export const supabaseBookmarkAPI = {
  // 북마크 추가/제거
  toggle: async (scriptId, isAIScript = false) => {
    try {
      console.log('🔖 북마크 토글:', scriptId);

      const user = await authHelpers.getCurrentUser();
      if (!user) {
        return handleSupabaseError(new Error('로그인이 필요합니다.'));
      }

      // 기존 북마크 확인
      let query = supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id);

      if (isAIScript) {
        query = query.eq('ai_script_id', scriptId);
      } else {
        query = query.eq('script_id', scriptId);
      }

      const { data: existing, error: checkError } = await query.single();

      if (checkError && checkError.code !== 'PGRST116') {
        return handleSupabaseError(checkError);
      }

      if (existing) {
        // 북마크 제거
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existing.id);

        if (error) {
          return handleSupabaseError(error);
        }

        console.log('✅ 북마크 제거 성공');
        return handleSuccess({ isBookmarked: false }, '북마크가 제거되었습니다.');
      } else {
        // 북마크 추가
        const bookmarkData = {
          user_id: user.id,
          ...(isAIScript ? { ai_script_id: scriptId } : { script_id: scriptId })
        };

        const { error } = await supabase
          .from('bookmarks')
          .insert(bookmarkData);

        if (error) {
          return handleSupabaseError(error);
        }

        console.log('✅ 북마크 추가 성공');
        return handleSuccess({ isBookmarked: true }, '북마크에 추가되었습니다.');
      }

    } catch (error) {
      return handleSupabaseError(error);
    }
  },

  // 사용자의 북마크 목록 조회
  getMy: async (page = 1, limit = 12) => {
    try {
      console.log('📚 북마크 목록 조회');

      const user = await authHelpers.getCurrentUser();
      if (!user) {
        return handleSupabaseError(new Error('로그인이 필요합니다.'));
      }

      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          created_at,
          scripts!bookmarks_script_id_fkey(*),
          ai_scripts!bookmarks_ai_script_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return handleSupabaseError(error);
      }

      // 북마크 데이터를 스크립트 형태로 변환
      const scripts = data.map(bookmark => ({
        ...bookmark.scripts || bookmark.ai_scripts,
        bookmarked_at: bookmark.created_at,
        type: bookmark.scripts ? 'public' : 'ai'
      }));

      console.log('✅ 북마크 목록 조회 성공:', scripts.length + '개');

      return handleSuccess({
        scripts: scripts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: data && data.length === parseInt(limit)
        }
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  }
};

// 검색 관련 API
export const supabaseSearchAPI = {
  // 통합 검색
  search: async (query, filters = {}) => {
    try {
      console.log('🔍 통합 검색 시작:', query);

      const { data, error } = await supabase
        .rpc('search_scripts', { search_term: query });

      if (error) {
        return handleSupabaseError(error);
      }

      console.log('✅ 검색 완료:', data.length + '개 결과');

      return handleSuccess({
        scripts: data || [],
        query: query,
        count: data ? data.length : 0
      });

    } catch (error) {
      return handleSupabaseError(error);
    }
  }
};

export default {
  scripts: supabaseScriptAPI,
  emotions: supabaseEmotionAPI,
  aiScripts: supabaseAIScriptAPI,
  auth: supabaseAuthAPI,
  bookmarks: supabaseBookmarkAPI,
  search: supabaseSearchAPI
};