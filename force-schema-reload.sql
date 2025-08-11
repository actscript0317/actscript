-- Supabase 스키마 캐시 강제 갱신을 위한 스크립트

-- PostgREST 스키마 캐시를 갱신하기 위해 테이블에 COMMENT를 추가/수정
COMMENT ON TABLE ai_scripts IS 'AI generated scripts table - updated for memo support';

-- 스키마 버전을 업데이트하여 캐시 갱신 강제
SELECT pg_notify('pgrst', 'reload schema');

-- memo 컬럼이 정상적으로 추가되었는지 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_scripts' AND column_name = 'memo';