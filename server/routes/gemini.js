const express = require('express');
const { GeminiProviderError, callGeminiModel } = require('../services/geminiService');

const router = express.Router();

function parseBody(body = {}) {
  return {
    text: typeof body.text === 'string' ? body.text.trim() : '',
    sourceLanguage: body.sourceLanguage,
    targetLanguage: body.targetLanguage,
    voice: body.voice,
    options: body.options || {},
  };
}

function requireText(text) {
  if (!text) {
    const error = new GeminiProviderError(400, 'Missing required text input.');
    throw error;
  }
}

function sendError(res, error) {
  const status = error?.status || 500;
  res.status(status).json({
    ok: false,
    error: {
      code:
        status === 400
          ? 'BAD_REQUEST'
          : status === 504
            ? 'PROVIDER_TIMEOUT'
            : status >= 500
              ? 'PROVIDER_ERROR'
              : 'UNKNOWN_ERROR',
      message: error?.message || 'An unexpected error occurred.',
    },
  });
}

function endpoint(handler) {
  return async (req, res) => {
    try {
      const data = await handler(req, res);
      res.json({ ok: true, data });
    } catch (error) {
      sendError(res, error);
    }
  };
}

router.post('/translate', endpoint(async (req) => {
  const { text, sourceLanguage = 'auto', targetLanguage = 'en' } = parseBody(req.body);
  requireText(text);

  const output = await callGeminiModel({
    model: 'gemini-1.5-flash',
    prompt: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return only translated text:\n\n${text}`,
  });

  return { translation: output };
}));

router.post('/analysis', endpoint(async (req) => {
  const { text, options } = parseBody(req.body);
  requireText(text);

  const output = await callGeminiModel({
    model: 'gemini-1.5-pro',
    prompt: `Provide a detailed analysis of the following text. Focus: ${options.focus || 'general'}\n\n${text}`,
  });

  return { analysis: output };
}));

router.post('/quiz', endpoint(async (req) => {
  const { text, options } = parseBody(req.body);
  requireText(text);

  const output = await callGeminiModel({
    model: 'gemini-1.5-flash',
    prompt: `Create a quiz from this text with ${options.questionCount || 5} questions. Return JSON only:\n\n${text}`,
  });

  return { quiz: output };
}));

router.post('/tts', endpoint(async (req) => {
  const { text, voice = 'neutral' } = parseBody(req.body);
  requireText(text);

  const output = await callGeminiModel({
    model: 'gemini-1.5-flash',
    prompt: `Convert this text into a speech-friendly script using ${voice} voice style. Return only rewritten script:\n\n${text}`,
  });

  return { script: output };
}));

router.post('/extract', endpoint(async (req) => {
  const { text } = parseBody(req.body);
  requireText(text);

  const output = await callGeminiModel({
    model: 'gemini-1.5-flash',
    prompt: `Extract key entities, dates, and important points from:\n\n${text}`,
  });

  return { extracted: output };
}));

router.post('/summary', endpoint(async (req) => {
  const { text, options } = parseBody(req.body);
  requireText(text);

  const output = await callGeminiModel({
    model: 'gemini-1.5-flash',
    prompt: `Summarize this text in ${options.length || 'medium'} length:\n\n${text}`,
  });

  return { summary: output };
}));

module.exports = router;
