import { describe, expect, test } from '@jest/globals';
import { defaultApiBaseUrl } from '../client.js';

describe('standalone package defaults', () => {
  test('public API is the default when LECTIO_API_URL is unset', () => {
    const previous = process.env.LECTIO_API_URL;
    delete process.env.LECTIO_API_URL;
    expect(defaultApiBaseUrl()).toBe('https://lectio-api.org/api/v1');
    if (previous === undefined) {
      delete process.env.LECTIO_API_URL;
    } else {
      process.env.LECTIO_API_URL = previous;
    }
  });
});
