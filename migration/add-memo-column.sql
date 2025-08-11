-- Add memo column to ai_scripts table
-- Migration: Add memo functionality to AI generated scripts

ALTER TABLE ai_scripts 
ADD COLUMN memo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ai_scripts.memo IS 'User memo/notes for the AI generated script';

-- Create index for memo search if needed in the future
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_scripts_memo ON ai_scripts USING gin(to_tsvector('english', memo));