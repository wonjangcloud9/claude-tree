import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  createApiErrorHandler,
  logApiError,
  isExpectedError,
} from './api-error';

describe('ApiError', () => {
  it('should create an error with status and context', () => {
    const error = new ApiError('Not found', 404, { sessionId: '123' });

    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.context).toEqual({ sessionId: '123' });
    expect(error.name).toBe('ApiError');
  });

  it('should default to 500 status code', () => {
    const error = new ApiError('Internal error');

    expect(error.statusCode).toBe(500);
  });
});

describe('isExpectedError', () => {
  it('should return true for ENOENT errors', () => {
    const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
    expect(isExpectedError(error)).toBe(true);
  });

  it('should return true for ENOTDIR errors', () => {
    const error = Object.assign(new Error('Not a directory'), { code: 'ENOTDIR' });
    expect(isExpectedError(error)).toBe(true);
  });

  it('should return false for unexpected errors', () => {
    const error = new Error('Unexpected error');
    expect(isExpectedError(error)).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(isExpectedError('string error')).toBe(false);
    expect(isExpectedError(null)).toBe(false);
  });
});

describe('logApiError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should log error with route and context', () => {
    const error = new Error('Test error');
    logApiError('GET /api/sessions', error, { sessionId: '123' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[API Error] GET /api/sessions:',
      expect.objectContaining({
        error: 'Test error',
        context: { sessionId: '123' },
      })
    );
  });

  it('should include stack trace in log', () => {
    const error = new Error('Test error');
    logApiError('POST /api/test', error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[API Error] POST /api/test:',
      expect.objectContaining({
        stack: expect.any(String),
      })
    );
  });

  it('should handle non-Error objects', () => {
    logApiError('GET /api/test', 'string error');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[API Error] GET /api/test:',
      expect.objectContaining({
        error: 'string error',
      })
    );
  });
});

describe('createApiErrorHandler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return response with error message and status 500', async () => {
    const handler = createApiErrorHandler('GET /api/sessions');
    const error = new Error('Database connection failed');

    const response = handler(error);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should log the error', () => {
    const handler = createApiErrorHandler('GET /api/sessions');
    const error = new Error('Test error');

    handler(error);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should use custom error message', async () => {
    const handler = createApiErrorHandler('GET /api/sessions', {
      defaultMessage: 'Failed to read sessions',
    });
    const error = new Error('Test error');

    const response = handler(error);
    const data = await response.json();

    expect(data.error).toBe('Failed to read sessions');
  });

  it('should include context in logs', () => {
    const handler = createApiErrorHandler('GET /api/sessions', {
      context: { sessionId: '123' },
    });
    const error = new Error('Test error');

    handler(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[API Error] GET /api/sessions:',
      expect.objectContaining({
        context: { sessionId: '123' },
      })
    );
  });

  it('should handle ApiError with custom status', async () => {
    const handler = createApiErrorHandler('GET /api/sessions');
    const error = new ApiError('Session not found', 404);

    const response = handler(error);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('should not log expected errors by default', () => {
    const handler = createApiErrorHandler('GET /api/sessions');
    const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });

    handler(error);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should return fallback response for expected errors', async () => {
    const handler = createApiErrorHandler('GET /api/sessions', {
      fallbackResponse: { sessions: [] },
    });
    const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });

    const response = handler(error);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ sessions: [] });
  });
});
