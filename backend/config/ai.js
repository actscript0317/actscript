module.exports = {
  MODEL_DRAFT: process.env.AI_MODEL_DRAFT || "gpt-4o-mini",
  MODEL_FINAL: process.env.AI_MODEL_FINAL || "gpt-4o",
  TEMPERATURE_DRAFT: Number(process.env.AI_TEMP_DRAFT || 0.6),
  TEMPERATURE_FINAL: Number(process.env.AI_TEMP_FINAL || 0.7),
  MAX_COMPLETION_TOKENS: Number(process.env.AI_MAX_TOKENS || 3500),
};