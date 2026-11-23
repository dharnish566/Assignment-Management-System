import { describe, expect, it } from 'vitest';
import { api } from './services/api.js';

describe('frontend runtime configuration', () => {
  it('configures the API client from the environment', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:4000/api');
  });
});
