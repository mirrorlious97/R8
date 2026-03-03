const API_ROOT = '/api/gemini';

class GeminiApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'GeminiApiError';
    this.code = code;
    this.status = status;
  }
}

async function callBackend(path, payload) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    throw new GeminiApiError('The AI service returned an invalid response.', 'INVALID_RESPONSE', 502);
  }

  if (!response.ok || !json?.ok) {
    const safeMessage =
      json?.error?.message ||
      (response.status >= 500
        ? 'The AI service is temporarily unavailable. Please try again shortly.'
        : 'Unable to process your request. Please review your input and try again.');

    throw new GeminiApiError(safeMessage, json?.error?.code || 'REQUEST_FAILED', response.status);
  }

  return json.data;
}

export async function callGeminiTranslation({ text, sourceLanguage, targetLanguage }) {
  const { translation } = await callBackend('/translate', { text, sourceLanguage, targetLanguage });
  return translation;
}

export async function callGeminiIntensiveAnalysis({ text }) {
  const { analysis } = await callBackend('/analysis', { text, options: { focus: 'intensive' } });
  return analysis;
}

export async function callGeminiReadingAnalysis({ text }) {
  const { analysis } = await callBackend('/analysis', { text, options: { focus: 'reading-comprehension' } });
  return analysis;
}

export async function callGeminiQuiz({ text, questionCount }) {
  const { quiz } = await callBackend('/quiz', { text, options: { questionCount } });
  return quiz;
}

export async function callGeminiTTS({ text, voice }) {
  const { script } = await callBackend('/tts', { text, voice });
  return script;
}

export async function extractTextFromMedia({ text }) {
  const { extracted } = await callBackend('/extract', { text });
  return extracted;
}

export async function callGeminiSummary({ text, length }) {
  const { summary } = await callBackend('/summary', { text, options: { length } });
  return summary;
}

export function mapGeminiErrorToUserMessage(error) {
  if (!(error instanceof GeminiApiError)) {
    return 'Something went wrong. Please try again.';
  }

  if (error.code === 'BAD_REQUEST') {
    return 'Please check your input and try again.';
  }

  if (error.code === 'PROVIDER_TIMEOUT') {
    return 'The AI service took too long to respond. Please retry.';
  }

  return error.message || 'The AI service is unavailable right now. Please try again later.';
}
