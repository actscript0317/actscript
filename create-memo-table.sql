-- AI 스크립트 메모를 위한 별도 테이블 생성
CREATE TABLE IF NOT EXISTS ai_script_memos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    script_id UUID NOT NULL REFERENCES ai_scripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memo TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 한 사용자가 한 스크립트에 대해 하나의 메모만 가질 수 있도록
    UNIQUE(script_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_script_memos_script_id ON ai_script_memos(script_id);
CREATE INDEX IF NOT EXISTS idx_ai_script_memos_user_id ON ai_script_memos(user_id);

-- 업데이트 트리거 추가
CREATE TRIGGER update_ai_script_memos_updated_at 
    BEFORE UPDATE ON ai_script_memos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 설정
ALTER TABLE ai_script_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own script memos" 
    ON ai_script_memos FOR ALL 
    USING (auth.uid() = user_id);