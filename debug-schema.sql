-- ai_scripts 테이블의 모든 컬럼 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_scripts' 
ORDER BY ordinal_position;

-- ai_scripts 테이블 구조 직접 확인
\d ai_scripts;

-- memo 컬럼이 있는지 직접 확인
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'ai_scripts' 
    AND column_name = 'memo'
) as memo_column_exists;