import { describe, it, expect, beforeEach } from 'vitest';
import { createLogger, type Logger } from './Logger.js';

describe('Logger', () => {
  describe('createLogger', () => {
    it('should create logger with correct namespace', () => {
      const logger = createLogger('test-module');

      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should create logger with info, error, debug methods', () => {
      const logger = createLogger('mymodule');

      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should use claudetree namespace prefix', () => {
      const logger = createLogger('session');

      // debug module sets namespace on the function
      expect(logger.info.namespace).toBe('claudetree:session:info');
      expect(logger.error.namespace).toBe('claudetree:session:error');
      expect(logger.debug.namespace).toBe('claudetree:session:debug');
    });

    it('should create independent loggers for different modules', () => {
      const logger1 = createLogger('module1');
      const logger2 = createLogger('module2');

      expect(logger1.info.namespace).not.toBe(logger2.info.namespace);
      expect(logger1.info.namespace).toBe('claudetree:module1:info');
      expect(logger2.info.namespace).toBe('claudetree:module2:info');
    });
  });

  describe('Logger interface', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger('test');
    });

    it('should have info method that is callable', () => {
      // Should not throw
      expect(() => logger.info('test message')).not.toThrow();
    });

    it('should have error method that is callable', () => {
      expect(() => logger.error('error message')).not.toThrow();
    });

    it('should have debug method that is callable', () => {
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should support format strings', () => {
      expect(() => logger.info('User %s logged in', 'john')).not.toThrow();
      expect(() => logger.error('Error code: %d', 500)).not.toThrow();
      expect(() => logger.debug('Object: %O', { key: 'value' })).not.toThrow();
    });
  });
});
