-- Supabase Migration Schema (Fixed)
-- MongoDB to PostgreSQL conversion for ActScript project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (converted from MongoDB User model)
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    
    -- Login attempt tracking
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Email verification
    is_email_verified BOOLEAN DEFAULT false,
    
    -- Subscription data (stored as JSONB for flexibility)
    subscription JSONB DEFAULT '{
        "plan": "free",
        "status": "inactive",
        "paymentHistory": []
    }'::jsonb,
    
    -- Usage tracking
    usage JSONB DEFAULT '{
        "currentMonth": 0,
        "lastResetDate": null,
        "totalGenerated": 0
    }'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scripts table (converted from MongoDB Script model)
CREATE TABLE scripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    character_count INTEGER NOT NULL CHECK (character_count >= 1 AND character_count <= 10),
    situation TEXT NOT NULL,
    content TEXT NOT NULL,
    emotions TEXT[] NOT NULL,
    views INTEGER DEFAULT 0,
    
    -- Extended filtering fields
    gender VARCHAR(20) DEFAULT '전체' CHECK (gender IN ('전체', '여자', '남자', '혼성')),
    mood VARCHAR(20) NOT NULL CHECK (mood IN ('감정적인', '코믹한', '진지한', '로맨스', '스릴러', '판타지', 'SF', '시대극')),
    duration VARCHAR(20) NOT NULL CHECK (duration IN ('30초 이하', '1분 이하', '1~3분', '3~5분', '5분 이상')),
    age_group VARCHAR(20) NOT NULL CHECK (age_group IN ('10대', '20대', '30대', '40대 이상')),
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('오디션', '연기 연습', '영상 제작', '수업/교육', '기타')),
    script_type VARCHAR(20) NOT NULL CHECK (script_type IN ('상황극', '독백', '대화', '내레이션')),
    
    -- Author information
    author_name VARCHAR(255) NOT NULL,
    author_username VARCHAR(20) NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emotions table (simple reference table)
CREATE TABLE emotions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Scripts table
CREATE TABLE ai_scripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    character_count INTEGER NOT NULL,
    situation TEXT NOT NULL,
    content TEXT NOT NULL,
    emotions TEXT[] NOT NULL,
    gender VARCHAR(20) DEFAULT '전체',
    mood VARCHAR(20) NOT NULL,
    duration VARCHAR(20) NOT NULL,
    age_group VARCHAR(20) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    script_type VARCHAR(20) NOT NULL,
    
    -- AI generation metadata
    generation_params JSONB,
    is_public BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Posts table
CREATE TABLE community_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tags TEXT[],
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
    ai_script_id UUID REFERENCES ai_scripts(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one of script_id or ai_script_id is set
    CHECK ((script_id IS NOT NULL AND ai_script_id IS NULL) OR (script_id IS NULL AND ai_script_id IS NOT NULL)),
    -- Unique constraint to prevent duplicate bookmarks
    UNIQUE(user_id, script_id, ai_script_id)
);

-- Likes table
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
    ai_script_id UUID REFERENCES ai_scripts(id) ON DELETE CASCADE,
    community_post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one target is set
    CHECK (
        (script_id IS NOT NULL AND ai_script_id IS NULL AND community_post_id IS NULL) OR
        (script_id IS NULL AND ai_script_id IS NOT NULL AND community_post_id IS NULL) OR
        (script_id IS NULL AND ai_script_id IS NULL AND community_post_id IS NOT NULL)
    ),
    -- Unique constraint to prevent duplicate likes
    UNIQUE(user_id, script_id, ai_script_id, community_post_id)
);

-- Actor Profiles table
CREATE TABLE actor_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stage_name VARCHAR(100),
    bio TEXT,
    experience_years INTEGER,
    specialties TEXT[],
    height INTEGER,
    weight INTEGER,
    
    -- Contact information
    contact_info JSONB DEFAULT '{}'::jsonb,
    
    -- Portfolio
    portfolio_images TEXT[],
    demo_reel_url TEXT,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    location VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actor Recruitment table
CREATE TABLE actor_recruitments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Requirements
    requirements JSONB NOT NULL,
    
    -- Project details
    project_type VARCHAR(50) NOT NULL,
    budget_range VARCHAR(50),
    shooting_location VARCHAR(100),
    shooting_dates JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'filled')),
    applications_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Recruitment table
CREATE TABLE model_recruitments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Requirements
    requirements JSONB NOT NULL,
    
    -- Project details
    project_type VARCHAR(50) NOT NULL,
    budget_range VARCHAR(50),
    shooting_location VARCHAR(100),
    shooting_dates JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'filled')),
    applications_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visitors tracking table
CREATE TABLE visitors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ip_address INET NOT NULL,
    user_agent TEXT,
    page_visited VARCHAR(255),
    referrer TEXT,
    visit_date DATE DEFAULT CURRENT_DATE,
    visit_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Session tracking
    session_id VARCHAR(255),
    is_unique_daily BOOLEAN DEFAULT false,
    
    UNIQUE(ip_address, visit_date, page_visited)
);

-- Temporary users for email verification
CREATE TABLE temp_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    password_hash TEXT NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (한국어 검색 문제 해결)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 텍스트 검색을 위한 인덱스 (ILIKE 패턴 매칭용)
CREATE INDEX idx_scripts_title_lower ON scripts(LOWER(title));
CREATE INDEX idx_scripts_content_lower ON scripts(LOWER(content));
CREATE INDEX idx_scripts_situation_lower ON scripts(LOWER(situation));

-- 배열 검색을 위한 GIN 인덱스
CREATE INDEX idx_scripts_emotions ON scripts USING gin(emotions);

-- 필터링을 위한 복합 인덱스
CREATE INDEX idx_scripts_filters ON scripts(gender, mood, duration, age_group, purpose, script_type);
CREATE INDEX idx_scripts_created_at ON scripts(created_at);
CREATE INDEX idx_scripts_views ON scripts(views);

CREATE INDEX idx_ai_scripts_user_id ON ai_scripts(user_id);
CREATE INDEX idx_ai_scripts_created_at ON ai_scripts(created_at);
CREATE INDEX idx_ai_scripts_is_public ON ai_scripts(is_public);

CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_script_id ON bookmarks(script_id) WHERE script_id IS NOT NULL;
CREATE INDEX idx_bookmarks_ai_script_id ON bookmarks(ai_script_id) WHERE ai_script_id IS NOT NULL;

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_script_id ON likes(script_id) WHERE script_id IS NOT NULL;
CREATE INDEX idx_likes_ai_script_id ON likes(ai_script_id) WHERE ai_script_id IS NOT NULL;

CREATE INDEX idx_visitors_date ON visitors(visit_date);
CREATE INDEX idx_visitors_ip ON visitors(ip_address);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_scripts_updated_at BEFORE UPDATE ON ai_scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actor_profiles_updated_at BEFORE UPDATE ON actor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actor_recruitments_updated_at BEFORE UPDATE ON actor_recruitments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_recruitments_updated_at BEFORE UPDATE ON model_recruitments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default emotions
INSERT INTO emotions (name) VALUES
    ('기쁨'),
    ('슬픔'),
    ('분노'),
    ('불안'),
    ('그리움'),
    ('후회'),
    ('사랑'),
    ('증오'),
    ('절망'),
    ('희망');

-- RLS (Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
-- Scripts: 모든 사용자가 조회 가능, 작성자만 수정/삭제
CREATE POLICY "Everyone can view scripts" ON scripts FOR SELECT USING (true);
CREATE POLICY "Users can insert scripts" ON scripts FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);
CREATE POLICY "Users can update own scripts" ON scripts FOR UPDATE USING (auth.uid()::text = author_id::text);
CREATE POLICY "Users can delete own scripts" ON scripts FOR DELETE USING (auth.uid()::text = author_id::text);

-- AI Scripts: 사용자는 자신의 AI 스크립트만 관리, 공개된 것은 모두 조회 가능  
CREATE POLICY "Users can view own or public AI scripts" ON ai_scripts FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can manage own AI scripts" ON ai_scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI scripts" ON ai_scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI scripts" ON ai_scripts FOR DELETE USING (auth.uid() = user_id);

-- Community Posts: 모든 사용자가 조회 가능, 작성자만 수정/삭제
CREATE POLICY "Everyone can view community posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create community posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks: 사용자는 자신의 북마크만 관리
CREATE POLICY "Users can manage own bookmarks" ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- Likes: 사용자는 자신의 좋아요만 관리
CREATE POLICY "Users can manage own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- Actor Profiles: 모든 사용자가 조회 가능, 소유자만 수정
CREATE POLICY "Everyone can view actor profiles" ON actor_profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage own actor profile" ON actor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actor profile" ON actor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own actor profile" ON actor_profiles FOR DELETE USING (auth.uid() = user_id);

-- 검색을 위한 함수 생성 (한국어 지원)
CREATE OR REPLACE FUNCTION search_scripts(search_term text)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    character_count INTEGER,
    situation TEXT,
    content TEXT,
    emotions TEXT[],
    views INTEGER,
    gender VARCHAR(20),
    mood VARCHAR(20),
    duration VARCHAR(20),
    age_group VARCHAR(20),
    purpose VARCHAR(20),
    script_type VARCHAR(20),
    author_name VARCHAR(255),
    author_username VARCHAR(20),
    author_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.*
    FROM scripts s
    WHERE 
        LOWER(s.title) ILIKE LOWER('%' || search_term || '%') OR
        LOWER(s.content) ILIKE LOWER('%' || search_term || '%') OR
        LOWER(s.situation) ILIKE LOWER('%' || search_term || '%') OR
        EXISTS (
            SELECT 1 
            FROM unnest(s.emotions) AS emotion 
            WHERE LOWER(emotion) ILIKE LOWER('%' || search_term || '%')
        )
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;