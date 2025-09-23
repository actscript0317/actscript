-- Script Chunks Table for RAG (Retrieval-Augmented Generation)
-- 대본 청크 테이블 - RAG 기능을 위한 참고 대본 데이터

CREATE TABLE IF NOT EXISTS script_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 기본 정보
    title VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,

    -- 장르 및 분류
    genre VARCHAR(100) NOT NULL,
    age VARCHAR(50) NOT NULL,
    gender VARCHAR(50) NOT NULL,
    num_characters INTEGER NOT NULL DEFAULT 1,

    -- 감정 및 맥락 (RAG에서 중요)
    emotional_context TEXT,
    script_context TEXT,

    -- 장면 정보
    scene_content TEXT,
    scene_index INTEGER DEFAULT 0,
    chunk_index INTEGER DEFAULT 0,

    -- 라임 대사 (새로운 기능)
    rhyme_dialogue TEXT,

    -- 메타데이터
    metadata JSONB DEFAULT '{}',

    -- 시간 정보
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 트리거 설정
CREATE TRIGGER update_script_chunks_updated_at
    BEFORE UPDATE ON script_chunks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_script_chunks_genre ON script_chunks(genre);
CREATE INDEX IF NOT EXISTS idx_script_chunks_age ON script_chunks(age);
CREATE INDEX IF NOT EXISTS idx_script_chunks_gender ON script_chunks(gender);
CREATE INDEX IF NOT EXISTS idx_script_chunks_num_characters ON script_chunks(num_characters);
CREATE INDEX IF NOT EXISTS idx_script_chunks_emotional_context ON script_chunks USING GIN (to_tsvector('korean', emotional_context));
CREATE INDEX IF NOT EXISTS idx_script_chunks_script_context ON script_chunks USING GIN (to_tsvector('korean', script_context));
CREATE INDEX IF NOT EXISTS idx_script_chunks_text ON script_chunks USING GIN (to_tsvector('korean', text));
CREATE INDEX IF NOT EXISTS idx_script_chunks_rhyme_dialogue ON script_chunks USING GIN (to_tsvector('korean', rhyme_dialogue));

-- 코멘트 추가
COMMENT ON TABLE script_chunks IS 'RAG 시스템을 위한 대본 청크 데이터';
COMMENT ON COLUMN script_chunks.text IS '실제 대본 텍스트';
COMMENT ON COLUMN script_chunks.emotional_context IS '감정적 맥락 (예: 기쁨, 슬픔, 분노 등)';
COMMENT ON COLUMN script_chunks.script_context IS '대본 상황 맥락 (예: 고백, 이별, 갈등 등)';
COMMENT ON COLUMN script_chunks.rhyme_dialogue IS '운율감 있는 대사 (라임 요소)';