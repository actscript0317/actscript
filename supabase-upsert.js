#!/usr/bin/env node
/**
 * Supabase 업서트 스크립트
 * ----------------------------------------------
 * - chunks.jsonl 안에 있는 청크들을 Supabase DB(script_chunks 테이블)에 넣어줍니다.
 * - 같은 doc_id + scene_index + chunk_index가 있으면 Update, 없으면 Insert 됩니다.
 *
 * 사용법:
 *   node supabase-upsert.js --in chunks.jsonl
 * 필요 환경변수:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("in", { type: "string", demandOption: true, describe: "입력 JSONL 경로" })
  .help().argv;

const SUPABASE_URL = "https://stuaaylkugnbcedjjaei.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = "sb_secret_PVaJigblcBi1ixYfFGGlJw_1_6ktIDn"
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function readJsonl(inPath) {
  const text = fs.readFileSync(inPath, "utf-8");
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

(async function main() {
  const inPath = argv.in;
  const abs = path.resolve(inPath);
  console.log("📥 JSONL 로드:", abs);

  const rows = readJsonl(abs);
  console.log(`📚 청크 ${rows.length}개 업서트 시도`);

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from("script_chunks").upsert(batch, {
      onConflict: ["doc_id", "scene_index", "chunk_index"]
    });
    if (error) {
      console.error("❌ 업서트 실패:", error.message);
      process.exit(1);
    }
    console.log(`✅ ${i + batch.length}/${rows.length} 업서트 완료`);
  }

  console.log("🎉 모든 청크 업서트 완료!");
})();