async function suggestDescription(notes, { client, timeoutMs = 10000 } = {}) {
  if (!client) {
    return { suggestion: null, message: 'Suggestion not available, write the description yourself' };
  }

  const prompt = `Write a short event description (at most 80 words) based on these notes: ${notes}`;

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
      return { suggestion: null, message: 'Suggestion not available, write the description yourself' };
    }

    const trimmed = text.trim();
    if (trimmed === '') {
      return { suggestion: null, message: 'Suggestion not available, write the description yourself' };
    }

    const words = trimmed.split(/\s+/);
    if (words.length > 80) {
      return { suggestion: null, message: 'Suggestion not available, write the description yourself' };
    }

    return { suggestion: trimmed, message: null };
  } catch (err) {
    clearTimeout(timeoutId);
    return { suggestion: null, message: 'Suggestion not available, write the description yourself' };
  }
}

module.exports = {
  suggestDescription,
};
