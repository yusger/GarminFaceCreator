// Presets are starting points; the account's model-list endpoint is authoritative.
export const providers = [
  {
    id: "custom",
    name: "自定义 / OpenAI 兼容",
    url: "",
    models: [] as string[],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: "https://api.deepseek.com",
    models: ["deepseek-flash", "deepseek-v4-pro"],
  },
  {
    id: "openai",
    name: "OpenAI",
    url: "https://api.openai.com/v1",
    models: ["gpt-5.4", "gpt-5.4-mini"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
  },
  {
    id: "qwen",
    name: "阿里云百炼 Qwen（北京）",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-plus", "qwen-turbo", "qwen-max"],
  },
  {
    id: "openrouter",
    name: "OpenRouter（含 Claude 等）",
    url: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-5.4"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    url: "https://api.mistral.ai/v1",
    models: ["mistral-small-latest", "mistral-large-latest"],
  },
  {
    id: "ollama",
    name: "本地 Ollama",
    url: "http://localhost:11434/v1",
    models: ["qwen3:8b"],
  },
];
