import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth helpers
export const authHelpers = {
  // 현재 사용자 가져오기
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // 세션 가져오기
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // 로그인
  signIn: async (email, password) => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  // 회원가입
  signUp: async (email, password, userData = {}) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
  },

  // 로그아웃
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // 비밀번호 재설정
  resetPassword: async (email) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
  },

  // 비밀번호 업데이트
  updatePassword: async (password) => {
    return await supabase.auth.updateUser({ password });
  },

  // Auth 상태 변경 리스너
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helpers
export const dbHelpers = {
  // 스크립트 관련
  scripts: {
    // 모든 스크립트 가져오기
    getAll: async (filters = {}) => {
      let query = supabase
        .from('scripts')
        .select(`
          *,
          users!scripts_author_id_fkey(username, name)
        `);

      // 필터 적용
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }
      if (filters.emotion) {
        query = query.contains('emotions', [filters.emotion]);
      }
      if (filters.mood) {
        query = query.eq('mood', filters.mood);
      }
      if (filters.gender && filters.gender !== '전체') {
        query = query.eq('gender', filters.gender);
      }

      // 정렬
      query = query.order('created_at', { ascending: false });

      // 페이지네이션
      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      return await query;
    },

    // 단일 스크립트 가져오기
    getById: async (id) => {
      return await supabase
        .from('scripts')
        .select(`
          *,
          users!scripts_author_id_fkey(username, name)
        `)
        .eq('id', id)
        .single();
    },

    // 스크립트 생성
    create: async (scriptData) => {
      return await supabase
        .from('scripts')
        .insert(scriptData)
        .select()
        .single();
    },

    // 스크립트 업데이트
    update: async (id, updateData) => {
      return await supabase
        .from('scripts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
    },

    // 스크립트 삭제
    delete: async (id) => {
      return await supabase
        .from('scripts')
        .delete()
        .eq('id', id);
    },

    // 조회수 증가
    incrementViews: async (id) => {
      return await supabase.rpc('increment_script_views', { script_id: id });
    }
  },

  // AI 스크립트 관련
  aiScripts: {
    // 사용자의 AI 스크립트 가져오기
    getUserScripts: async (userId, page = 1, limit = 12) => {
      const offset = (page - 1) * limit;
      return await supabase
        .from('ai_scripts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    },

    // AI 스크립트 생성
    create: async (scriptData) => {
      return await supabase
        .from('ai_scripts')
        .insert(scriptData)
        .select()
        .single();
    },

    // AI 스크립트 삭제
    delete: async (id) => {
      return await supabase
        .from('ai_scripts')
        .delete()
        .eq('id', id);
    }
  },

  // 북마크 관련
  bookmarks: {
    // 사용자의 북마크 가져오기
    getUserBookmarks: async (userId, page = 1, limit = 12) => {
      const offset = (page - 1) * limit;
      return await supabase
        .from('bookmarks')
        .select(`
          *,
          scripts!bookmarks_script_id_fkey(*),
          ai_scripts!bookmarks_ai_script_id_fkey(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    },

    // 북마크 추가
    add: async (userId, scriptId, aiScriptId = null) => {
      const bookmarkData = { user_id: userId };
      if (scriptId) bookmarkData.script_id = scriptId;
      if (aiScriptId) bookmarkData.ai_script_id = aiScriptId;

      return await supabase
        .from('bookmarks')
        .insert(bookmarkData);
    },

    // 북마크 제거
    remove: async (userId, scriptId, aiScriptId = null) => {
      let query = supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId);

      if (scriptId) query = query.eq('script_id', scriptId);
      if (aiScriptId) query = query.eq('ai_script_id', aiScriptId);

      return await query;
    },

    // 북마크 상태 확인
    isBookmarked: async (userId, scriptId, aiScriptId = null) => {
      let query = supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId);

      if (scriptId) query = query.eq('script_id', scriptId);
      if (aiScriptId) query = query.eq('ai_script_id', aiScriptId);

      const { data, error } = await query.single();
      return { isBookmarked: !error && data, error };
    }
  },

  // 사용자 관련
  users: {
    // 사용자 프로필 가져오기
    getProfile: async (userId) => {
      return await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    },

    // 프로필 업데이트
    updateProfile: async (userId, updateData) => {
      return await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
    }
  },

  // 감정 관련
  emotions: {
    // 모든 감정 가져오기
    getAll: async () => {
      return await supabase
        .from('emotions')
        .select('*')
        .order('name');
    }
  }
};

// Storage helpers
export const storageHelpers = {
  // 파일 업로드
  upload: async (bucket, path, file, options = {}) => {
    return await supabase.storage
      .from(bucket)
      .upload(path, file, options);
  },

  // 파일 다운로드
  download: async (bucket, path) => {
    return await supabase.storage
      .from(bucket)
      .download(path);
  },

  // 파일 URL 가져오기
  getPublicUrl: (bucket, path) => {
    return supabase.storage
      .from(bucket)
      .getPublicUrl(path);
  },

  // 파일 삭제
  remove: async (bucket, paths) => {
    return await supabase.storage
      .from(bucket)
      .remove(paths);
  },

  // 파일 목록 가져오기
  list: async (bucket, path = '', options = {}) => {
    return await supabase.storage
      .from(bucket)
      .list(path, options);
  }
};

// Real-time helpers
export const realtimeHelpers = {
  // 테이블 변경 구독
  subscribeToTable: (table, callback, filter = '*') => {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: filter, 
          schema: 'public', 
          table: table 
        }, 
        callback
      )
      .subscribe();
  },

  // 구독 해제
  unsubscribe: (subscription) => {
    return supabase.removeChannel(subscription);
  }
};

export default supabase;