const { createGeminiClient } = require('../lib/geminiClient');

// Fallback: with no key, a slow or failing provider, or an unusable answer,
// the organizer writes the description by hand and the app keeps working.
const FALLBACK_MESSAGE = 'Suggestion not available, write the description yourself';

function fallback() {
  return { suggestion: null, message: FALLBACK_MESSAGE };
}

async function suggestDescription(notes, { client = createGeminiClient(), timeoutMs = 10000 } = {}) {
  if (!client) {
    return fallback();
  }

  const prompt = `Write a short event description (at most 80 words) based on these notes. Answer in plain text, in one paragraph, without Markdown, lists or placeholders. Only use facts from the notes. Notes: ${notes}`;

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Timeout'));
    }, timeoutMs);
  });

  try {
    const generatePromise = client.generate(prompt);
    const text = await Promise.race([generatePromise, timeoutPromise]);
    clearTimeout(timeoutId);

    if (!text || typeof text !== 'string') {
      return fallback();
    }

    const trimmed = text.trim();
    if (trimmed === '') {
      return fallback();
    }

    const words = trimmed.split(/\s+/);
    if (words.length > 80) {
      return fallback();
    }

    return { suggestion: trimmed, message: null };
  } catch (err) {
    clearTimeout(timeoutId);
    return fallback();
  }
}

module.exports = {
  suggestDescription,
};
