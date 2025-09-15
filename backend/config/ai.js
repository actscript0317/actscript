module.exports = {
  MODEL_DRAFT: process.env.AI_MODEL_DRAFT || "gpt-5",
  MODEL_FINAL: process.env.AI_MODEL_FINAL || "gpt-5",
  TEMPERATURE_DRAFT: Number(process.env.AI_TEMP_DRAFT || 1),
  TEMPERATURE_FINAL: Number(process.env.AI_TEMP_FINAL || 1),
  MAX_COMPLETION_TOKENS: Number(process.env.AI_MAX_TOKENS || 3500),
};