import { sanitizeText, escapeHtml } from './sanitizeText';

describe('sanitizeText utilities', () => {
  it('normalizes CRLF and CR to LF', () => {
    expect(sanitizeText('line1\r\nline2\rline3')).toBe('line1\nline2\nline3');
  });

  it('removes NUL bytes', () => {
    expect(sanitizeText('a\0b')).toBe('ab');
  });

  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });
});
