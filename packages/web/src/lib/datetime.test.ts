import { describe, it, expect } from 'vitest';
import { formatTime, formatTimeWithSeconds, formatDateTime, getTimezoneForLocale } from './datetime';

describe('getTimezoneForLocale', () => {
  it('returns America/New_York for en locale', () => {
    expect(getTimezoneForLocale('en')).toBe('America/New_York');
  });

  it('returns Asia/Seoul for ko locale', () => {
    expect(getTimezoneForLocale('ko')).toBe('Asia/Seoul');
  });

  it('returns Asia/Tokyo for ja locale', () => {
    expect(getTimezoneForLocale('ja')).toBe('Asia/Tokyo');
  });

  it('returns Asia/Shanghai for zh locale', () => {
    expect(getTimezoneForLocale('zh')).toBe('Asia/Shanghai');
  });
});

describe('formatTime', () => {
  const testDate = new Date('2024-01-15T12:30:00Z');

  it('formats time in Korean timezone (KST, UTC+9)', () => {
    const result = formatTime(testDate, 'ko');
    expect(result).toBe('21:30');
  });

  it('formats time in Japanese timezone (JST, UTC+9)', () => {
    const result = formatTime(testDate, 'ja');
    expect(result).toBe('21:30');
  });

  it('formats time in Chinese timezone (CST, UTC+8)', () => {
    const result = formatTime(testDate, 'zh');
    expect(result).toBe('20:30');
  });

  it('formats time in US Eastern timezone', () => {
    const result = formatTime(testDate, 'en');
    expect(result).toBe('07:30');
  });
});

describe('formatTimeWithSeconds', () => {
  const testDate = new Date('2024-01-15T12:30:45Z');

  it('formats time with seconds in Korean timezone', () => {
    const result = formatTimeWithSeconds(testDate, 'ko');
    expect(result).toBe('21:30:45');
  });

  it('formats time with seconds in Japanese timezone', () => {
    const result = formatTimeWithSeconds(testDate, 'ja');
    expect(result).toBe('21:30:45');
  });

  it('formats time with seconds in Chinese timezone', () => {
    const result = formatTimeWithSeconds(testDate, 'zh');
    expect(result).toBe('20:30:45');
  });

  it('formats time with seconds in US Eastern timezone', () => {
    const result = formatTimeWithSeconds(testDate, 'en');
    expect(result).toBe('07:30:45');
  });
});

describe('formatDateTime', () => {
  const testDate = new Date('2024-01-15T12:30:00Z');

  it('formats date and time in Korean locale', () => {
    const result = formatDateTime(testDate, 'ko');
    expect(result).toContain('2024');
    expect(result).toContain('21:30');
  });

  it('formats date and time in Japanese locale', () => {
    const result = formatDateTime(testDate, 'ja');
    expect(result).toContain('2024');
    expect(result).toContain('21:30');
  });

  it('formats date and time in Chinese locale', () => {
    const result = formatDateTime(testDate, 'zh');
    expect(result).toContain('2024');
    expect(result).toContain('20:30');
  });

  it('formats date and time in English locale', () => {
    const result = formatDateTime(testDate, 'en');
    expect(result).toContain('2024');
    expect(result).toContain('7:30');
  });
});
