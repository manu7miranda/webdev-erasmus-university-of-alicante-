const test = require('node:test');
const assert = require('node:assert');
const { suggestDescription } = require('../src/services/descriptionService');

test('AC-24 a good answer from the client is returned as the suggestion.', async () => {
  const fakeClient = {
    async generate(prompt) {
      return 'This is a great description for the event.';
    }
  };

  const result = await suggestDescription('football match', { client: fakeClient });
  assert.strictEqual(result.suggestion, 'This is a great description for the event.');
  assert.strictEqual(result.message, null);
});

test('AC-25 a client that never answers gives suggestion null and the message "Suggestion not available, write the description yourself" (use timeoutMs: 50).', async () => {
  const fakeClient = {
    async generate(prompt) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return 'Too late';
    }
  };

  const result = await suggestDescription('football match', { client: fakeClient, timeoutMs: 50 });
  assert.strictEqual(result.suggestion, null);
  assert.strictEqual(result.message, 'Suggestion not available, write the description yourself');
});

test('AC-25 a client that throws gives the same fallback.', async () => {
  const fakeClient = {
    async generate(prompt) {
      throw new Error('API error');
    }
  };

  const result = await suggestDescription('football match', { client: fakeClient });
  assert.strictEqual(result.suggestion, null);
  assert.strictEqual(result.message, 'Suggestion not available, write the description yourself');
});

test('AC-25 no client at all (no API key) gives the same fallback.', async () => {
  const result = await suggestDescription('football match', { client: null });
  assert.strictEqual(result.suggestion, null);
  assert.strictEqual(result.message, 'Suggestion not available, write the description yourself');
});

test('AC-26 an empty answer gives the fallback.', async () => {
  const fakeClient = {
    async generate(prompt) {
      return '   ';
    }
  };

  const result = await suggestDescription('football match', { client: fakeClient });
  assert.strictEqual(result.suggestion, null);
  assert.strictEqual(result.message, 'Suggestion not available, write the description yourself');
});

test('AC-26 an answer longer than 80 words gives the fallback.', async () => {
  const longText = Array(85).fill('word').join(' ');
  const fakeClient = {
    async generate(prompt) {
      return longText;
    }
  };

  const result = await suggestDescription('football match', { client: fakeClient });
  assert.strictEqual(result.suggestion, null);
  assert.strictEqual(result.message, 'Suggestion not available, write the description yourself');
});
