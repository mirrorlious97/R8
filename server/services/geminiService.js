const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 15000;

class GeminiProviderError extends Error {
  constructor(status, safeMessage, details) {
    super(safeMessage);
    this.name = 'GeminiProviderError';
    this.status = status;
    this.details = details;
  }
}

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiProviderError(500, 'AI service is not configured.');
  }
  return apiKey;
}

function normalizeProviderText(providerJson) {
  return providerJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function callGeminiModel({ model, prompt, generationConfig, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(generationConfig ? { generationConfig } : {}),
        }),
      }
    );

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new GeminiProviderError(400, 'The request could not be processed by the AI provider.');
      }
      throw new GeminiProviderError(502, 'AI provider is currently unavailable.');
    }

    const providerJson = await response.json();
    const text = normalizeProviderText(providerJson);

    if (!text) {
      throw new GeminiProviderError(502, 'AI provider returned an empty response.');
    }

    return text;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new GeminiProviderError(504, 'The AI provider timed out. Please try again.');
    }
    if (error instanceof GeminiProviderError) {
      throw error;
    }
    throw new GeminiProviderError(500, 'Unexpected error while contacting AI provider.');
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  GeminiProviderError,
  callGeminiModel,
};
