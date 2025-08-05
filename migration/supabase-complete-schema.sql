-- ActScript Complete Database Schema for Supabase
-- Migration from MongoDB to PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS model_recruitments CASCADE;
DROP TABLE IF EXISTS actor_recruitments CASCADE;
DROP TABLE IF EXISTS actor_profiles CASCADE;
DROP TABLE IF EXISTS ai_scripts CASCADE;
DROP TABLE IF EXISTS scripts CASCADE;
DROP TABLE IF EXISTS emotions CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(20) UNIQUE NOT NULL CHECK (length(username) >= 3),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Login attempt management
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    
    -- Email verification
    is_email_verified BOOLEAN DEFAULT FALSE,
    
    -- Subscription information
    subscription JSONB DEFAULT '{"plan": "free", "status": "inactive", "paymentHistory": []}',
    
    -- Usage tracking
    usage JSONB DEFAULT '{"currentMonth": 0, "totalGenerated": 0, "lastResetDate": null}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Emotions table
CREATE TABLE emotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_emotions_updated_at BEFORE UPDATE ON emotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Scripts table
CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    character_count INTEGER NOT NULL CHECK (character_count >= 1 AND character_count <= 10),
    situation TEXT NOT NULL,
    content TEXT NOT NULL,
    emotions TEXT[] NOT NULL,
    views INTEGER DEFAULT 0,
    
    -- Extended filtering fields
    gender VARCHAR(10) DEFAULT '전체' CHECK (gender IN ('전체', '여자', '남자', '혼성')),
    mood VARCHAR(20) NOT NULL CHECK (mood IN ('감정적인', '코믹한', '진지한', '로맨스', '스릴러', '판타지', 'SF', '시대극')),
    duration VARCHAR(20) NOT NULL CHECK (duration IN ('30초 이하', '1분 이하', '1~3분', '3~5분', '5분 이상')),
    age_group VARCHAR(20) NOT NULL CHECK (age_group IN ('10대', '20대', '30대', '40대 이상')),
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('오디션', '연기 연습', '영상 제작', '수업/교육', '기타')),
    script_type VARCHAR(20) NOT NULL CHECK (script_type IN ('상황극', '독백', '대화', '내레이션')),
    
    -- Author information
    author JSONB NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI Scripts table
CREATE TABLE ai_scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- AI generation parameters
    character_count VARCHAR(50) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    emotions TEXT[] DEFAULT '{}',
    length VARCHAR(50) NOT NULL,
    gender VARCHAR(50),
    age VARCHAR(50),
    situation TEXT,
    style VARCHAR(100),
    
    -- User information
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- AI generation metadata
    metadata JSONB DEFAULT '{}',
    
    -- Save status
    is_saved BOOLEAN DEFAULT FALSE,
    saved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_ai_scripts_updated_at BEFORE UPDATE ON ai_scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Actor Profiles table
CREATE TABLE actor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic information
    name VARCHAR(100) NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 150),
    gender VARCHAR(10) CHECK (gender IN ('남자', '여자', '기타')),
    height INTEGER CHECK (height > 0 AND height < 300),
    weight INTEGER CHECK (weight > 0 AND weight < 500),
    
    -- Contact information
    phone VARCHAR(20),
    email VARCHAR(255),
    location VARCHAR(100),
    
    -- Career information
    experience TEXT,
    education TEXT,
    awards TEXT,
    special_skills TEXT,
    languages TEXT[],
    
    -- Physical characteristics
    body_type VARCHAR(50),
    eye_color VARCHAR(50),
    hair_color VARCHAR(50),
    
    -- Media
    profile_image VARCHAR(500),
    portfolio_images TEXT[],
    video_links TEXT[],
    
    -- Preferences
    preferred_genres TEXT[],
    preferred_roles TEXT[],
    available_locations TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    views INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_actor_profiles_updated_at BEFORE UPDATE ON actor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Actor Recruitments table
CREATE TABLE actor_recruitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic information
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    production_type VARCHAR(50) NOT NULL,
    genre VARCHAR(100),
    
    -- Role information
    roles JSONB NOT NULL DEFAULT '[]',
    
    -- Requirements
    age_range VARCHAR(50),
    gender_requirement VARCHAR(20),
    experience_level VARCHAR(50),
    special_requirements TEXT,
    
    -- Production details
    director VARCHAR(100),
    production_company VARCHAR(200),
    shooting_location VARCHAR(200),
    shooting_dates VARCHAR(200),
    
    -- Compensation
    payment_type VARCHAR(50),
    payment_amount VARCHAR(100),
    payment_details TEXT,
    
    -- Application details
    application_method TEXT,
    required_documents TEXT[],
    application_deadline TIMESTAMPTZ,
    contact_info JSONB,
    
    -- Media
    poster_image VARCHAR(500),
    additional_images TEXT[],
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
    is_urgent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    views INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_actor_recruitments_updated_at BEFORE UPDATE ON actor_recruitments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Model Recruitments table
CREATE TABLE model_recruitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic information
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    modeling_type VARCHAR(100) NOT NULL,
    brand VARCHAR(200),
    
    -- Requirements
    age_range VARCHAR(50),
    gender_requirement VARCHAR(20),
    height_range VARCHAR(50),
    experience_level VARCHAR(50),
    special_requirements TEXT,
    
    -- Shoot details
    photographer VARCHAR(100),
    agency VARCHAR(200),
    shoot_location VARCHAR(200),
    shoot_dates VARCHAR(200),
    concept TEXT,
    
    -- Compensation
    payment_type VARCHAR(50),
    payment_amount VARCHAR(100),
    payment_details TEXT,
    
    -- Application details
    application_method TEXT,
    required_documents TEXT[],
    application_deadline TIMESTAMPTZ,
    contact_info JSONB,
    
    -- Media
    concept_image VARCHAR(500),
    reference_images TEXT[],
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
    is_urgent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    views INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_model_recruitments_updated_at BEFORE UPDATE ON model_recruitments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Community Posts table
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('자유게시판', '질문/답변', '후기/리뷰', '정보공유', '모임/스터디')),
    tags TEXT[],
    
    -- Media
    images TEXT[],
    attachments JSONB DEFAULT '[]',
    
    -- Interaction
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    
    -- Status
    is_pinned BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    is_reported BOOLEAN DEFAULT FALSE,
    report_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Likes table
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID NOT NULL,
    post_type VARCHAR(50) NOT NULL CHECK (post_type IN ('script', 'ai_script', 'actor_profile', 'actor_recruitment', 'model_recruitment', 'community_post')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, post_id, post_type)
);

-- Bookmarks table
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID NOT NULL,
    post_type VARCHAR(50) NOT NULL CHECK (post_type IN ('script', 'ai_script', 'actor_profile', 'actor_recruitment', 'model_recruitment', 'community_post')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, post_id, post_type)
);

-- Visitors table
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET NOT NULL,
    user_agent TEXT,
    referer TEXT,
    path VARCHAR(500),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Session tracking
    session_id VARCHAR(100),
    
    -- Geographic info (optional)
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Device info
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription_plan ON users USING GIN ((subscription->>'plan'));

CREATE INDEX idx_scripts_title ON scripts USING GIN (to_tsvector('korean', title));
CREATE INDEX idx_scripts_content ON scripts USING GIN (to_tsvector('korean', content));
CREATE INDEX idx_scripts_situation ON scripts USING GIN (to_tsvector('korean', situation));
CREATE INDEX idx_scripts_emotions ON scripts USING GIN (emotions);
CREATE INDEX idx_scripts_filtering ON scripts(gender, mood, duration, age_group, purpose, script_type, character_count);
CREATE INDEX idx_scripts_views ON scripts(views DESC);

CREATE INDEX idx_ai_scripts_user_id ON ai_scripts(user_id);
CREATE INDEX idx_ai_scripts_user_created ON ai_scripts(user_id, created_at DESC);
CREATE INDEX idx_ai_scripts_user_saved ON ai_scripts(user_id, is_saved);
CREATE INDEX idx_ai_scripts_title ON ai_scripts USING GIN (to_tsvector('korean', title));
CREATE INDEX idx_ai_scripts_content ON ai_scripts USING GIN (to_tsvector('korean', content));

CREATE INDEX idx_actor_profiles_user_id ON actor_profiles(user_id);
CREATE INDEX idx_actor_profiles_active ON actor_profiles(is_active, is_public);
CREATE INDEX idx_actor_profiles_location ON actor_profiles USING GIN (available_locations);
CREATE INDEX idx_actor_profiles_genres ON actor_profiles USING GIN (preferred_genres);

CREATE INDEX idx_actor_recruitments_user_id ON actor_recruitments(user_id);
CREATE INDEX idx_actor_recruitments_status ON actor_recruitments(status);
CREATE INDEX idx_actor_recruitments_urgent ON actor_recruitments(is_urgent);
CREATE INDEX idx_actor_recruitments_deadline ON actor_recruitments(application_deadline);
CREATE INDEX idx_actor_recruitments_title ON actor_recruitments USING GIN (to_tsvector('korean', title));

CREATE INDEX idx_model_recruitments_user_id ON model_recruitments(user_id);
CREATE INDEX idx_model_recruitments_status ON model_recruitments(status);
CREATE INDEX idx_model_recruitments_urgent ON model_recruitments(is_urgent);
CREATE INDEX idx_model_recruitments_deadline ON model_recruitments(application_deadline);

CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_status ON community_posts(is_hidden, is_deleted);
CREATE INDEX idx_community_posts_title ON community_posts USING GIN (to_tsvector('korean', title));
CREATE INDEX idx_community_posts_content ON community_posts USING GIN (to_tsvector('korean', content));

CREATE INDEX idx_likes_user_post ON likes(user_id, post_id, post_type);
CREATE INDEX idx_likes_post ON likes(post_id, post_type);

CREATE INDEX idx_bookmarks_user_post ON bookmarks(user_id, post_id, post_type);
CREATE INDEX idx_bookmarks_user_created ON bookmarks(user_id, created_at DESC);

CREATE INDEX idx_visitors_ip ON visitors(ip_address);
CREATE INDEX idx_visitors_user_id ON visitors(user_id);
CREATE INDEX idx_visitors_created_at ON visitors(created_at DESC);
CREATE INDEX idx_visitors_path ON visitors(path);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_recruitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_recruitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- AI Scripts policies
CREATE POLICY "Users can view own AI scripts" ON ai_scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI scripts" ON ai_scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI scripts" ON ai_scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI scripts" ON ai_scripts FOR DELETE USING (auth.uid() = user_id);

-- Actor Profiles policies
CREATE POLICY "Anyone can view public actor profiles" ON actor_profiles FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users can insert own actor profiles" ON actor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actor profiles" ON actor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own actor profiles" ON actor_profiles FOR DELETE USING (auth.uid() = user_id);

-- Actor Recruitments policies
CREATE POLICY "Anyone can view active recruitments" ON actor_recruitments FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Users can insert own recruitments" ON actor_recruitments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recruitments" ON actor_recruitments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recruitments" ON actor_recruitments FOR DELETE USING (auth.uid() = user_id);

-- Model Recruitments policies
CREATE POLICY "Anyone can view active model recruitments" ON model_recruitments FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Users can insert own model recruitments" ON model_recruitments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own model recruitments" ON model_recruitments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own model recruitments" ON model_recruitments FOR DELETE USING (auth.uid() = user_id);

-- Community Posts policies
CREATE POLICY "Anyone can view non-hidden posts" ON community_posts FOR SELECT USING (is_hidden = FALSE AND is_deleted = FALSE);
CREATE POLICY "Users can insert own posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can view all likes" ON likes FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert own likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Insert default emotions
INSERT INTO emotions (name) VALUES
('기쁨'), ('슬픔'), ('분노'), ('두려움'), ('놀람'), ('혐오'),
('사랑'), ('미움'), ('질투'), ('부러움'), ('감사'), ('후회'),
('절망'), ('희망'), ('불안'), ('안도'), ('외로움'), ('그리움'),
('흥분'), ('지루함'), ('당황'), ('부끄러움'), ('자신감'), ('열정'),
('피로'), ('평온'), ('긴장'), ('여유'), ('걱정'), ('만족');

-- Create function to handle user creation from auth trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE users IS 'Extended user profiles linked to Supabase auth';
COMMENT ON TABLE emotions IS 'Available emotions for script categorization';
COMMENT ON TABLE scripts IS 'User-created scripts with detailed metadata';
COMMENT ON TABLE ai_scripts IS 'AI-generated scripts with generation parameters';
COMMENT ON TABLE actor_profiles IS 'Actor profiles for casting and networking';
COMMENT ON TABLE actor_recruitments IS 'Actor recruitment postings';
COMMENT ON TABLE model_recruitments IS 'Model recruitment postings';
COMMENT ON TABLE community_posts IS 'Community discussion posts';
COMMENT ON TABLE likes IS 'User likes on various content types';
COMMENT ON TABLE bookmarks IS 'User bookmarks on various content types';
COMMENT ON TABLE visitors IS 'Website visitor tracking and analytics';