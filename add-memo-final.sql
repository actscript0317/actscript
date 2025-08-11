-- memo 컬럼이 존재하지 않을 경우에만 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_scripts' AND column_name = 'memo'
    ) THEN
        ALTER TABLE ai_scripts ADD COLUMN memo TEXT;
        RAISE NOTICE 'memo 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'memo 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 테이블에 코멘트 추가하여 스키마 캐시 갱신 강제
COMMENT ON TABLE ai_scripts IS 'AI generated scripts with memo support - ' || now();

-- PostgREST 스키마 캐시 갱신 알림
NOTIFY pgrst, 'reload schema';

-- 결과 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_scripts' AND column_name = 'memo';