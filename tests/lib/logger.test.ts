/**
 * Tests for lib/logger.ts
 */

describe('logger', () => {
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const setNodeEnv = (value: string | undefined) => {
    Object.defineProperty(process.env, 'NODE_ENV', { value, writable: true, configurable: true });
  };

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('in non-production (development)', () => {
    beforeEach(() => {
      setNodeEnv('test');
    });

    it('calls console.debug for debug()', async () => {
      const { logger } = await import('@/lib/logger');
      logger.debug('hello', 'world');
      expect(debugSpy).toHaveBeenCalledWith('[DEBUG]', 'hello', 'world');
    });

    it('calls console.info for info()', async () => {
      const { logger } = await import('@/lib/logger');
      logger.info('some info');
      expect(infoSpy).toHaveBeenCalledWith('[INFO]', 'some info');
    });

    it('always calls console.warn for warn()', async () => {
      const { logger } = await import('@/lib/logger');
      logger.warn('a warning');
      expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'a warning');
    });

    it('always calls console.error for error()', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('an error');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR]', 'an error');
    });

    it('passes multiple arguments to debug()', async () => {
      const { logger } = await import('@/lib/logger');
      logger.debug('arg1', 42, { key: 'value' });
      expect(debugSpy).toHaveBeenCalledWith('[DEBUG]', 'arg1', 42, { key: 'value' });
    });

    it('passes multiple arguments to error()', async () => {
      const { logger } = await import('@/lib/logger');
      const err = new Error('oops');
      logger.error('something failed', err);
      expect(errorSpy).toHaveBeenCalledWith('[ERROR]', 'something failed', err);
    });
  });

  describe('in production', () => {
    beforeEach(() => {
      // We need to re-evaluate the module with NODE_ENV=production
      // Since isProduction is evaluated at module load time, we reset modules
      jest.resetModules();
      setNodeEnv('production');
    });

    it('suppresses console.debug in production', async () => {
      const { logger } = await import('@/lib/logger');
      logger.debug('silent');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('suppresses console.info in production', async () => {
      const { logger } = await import('@/lib/logger');
      logger.info('silent');
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('still calls console.warn in production', async () => {
      const { logger } = await import('@/lib/logger');
      logger.warn('important warning');
      expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'important warning');
    });

    it('still calls console.error in production', async () => {
      const { logger } = await import('@/lib/logger');
      logger.error('critical error');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR]', 'critical error');
    });
  });
});
