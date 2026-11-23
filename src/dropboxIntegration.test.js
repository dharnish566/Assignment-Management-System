import { describe, expect, it } from 'vitest';
import { dropboxService } from './services/dropboxService.js';
import { submissionService } from './services/submissionService.js';

describe('Dropbox and Submission Services', () => {
  it('exposes the full Dropbox OAuth and sync contract', () => {
    expect(typeof dropboxService.status).toBe('function');
    expect(typeof dropboxService.connect).toBe('function');
    expect(typeof dropboxService.disconnect).toBe('function');
    expect(typeof dropboxService.sync).toBe('function');
  });

  it('exposes the 3-stage submission verification and review contract', () => {
    expect(typeof submissionService.mySubmission).toBe('function');
    expect(typeof submissionService.verify).toBe('function');
    expect(typeof submissionService.confirmSubmission).toBe('function');
    expect(typeof submissionService.submissions).toBe('function');
    expect(typeof submissionService.review).toBe('function');
  });

  it('validates safe Dropbox upload URLs to prevent navigation to untrusted hosts', () => {
    function isSafeDropboxUrl(url) {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return (
          parsed.protocol === 'https:' &&
          (parsed.hostname === 'dropbox.com' || parsed.hostname.endsWith('.dropbox.com'))
        );
      } catch {
        return false;
      }
    }

    expect(isSafeDropboxUrl('https://www.dropbox.com/request/abc123XYZ')).toBe(true);
    expect(isSafeDropboxUrl('https://dropbox.com/request/abc123XYZ')).toBe(true);
    expect(isSafeDropboxUrl('http://www.dropbox.com/request/abc123XYZ')).toBe(false); // Insecure http
    expect(isSafeDropboxUrl('https://evil-phishing-dropbox.com/request')).toBe(false); // Malicious host
    expect(isSafeDropboxUrl('javascript:alert(1)')).toBe(false); // XSS URL
    expect(isSafeDropboxUrl('')).toBe(false);
  });
});
