/**
 * Tests for lib/supabase-server.ts
 * Tests server-side Supabase client creation with cookie management.
 */

// Mock next/headers
const mockGetAll = jest.fn(() => [{ name: 'session', value: 'token123' }]);
const mockSet = jest.fn();
const mockCookieStore = {
  getAll: mockGetAll,
  set: mockSet,
};

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => mockCookieStore),
}));

// Mock @supabase/ssr
const mockCreateServerClient = jest.fn();
jest.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

describe('createServerSupabaseClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('calls createServerClient with env vars', async () => {
    mockCreateServerClient.mockReturnValueOnce({ auth: { getUser: jest.fn() } });

    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    createServerSupabaseClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({ cookies: expect.any(Object) }),
    );
  });

  it('provides getAll cookie handler that reads from cookie store', async () => {
    let capturedCookies: { getAll: () => unknown; setAll: (c: unknown[]) => void } | undefined;
    mockCreateServerClient.mockImplementation((_url: string, _key: string, options: { cookies: typeof capturedCookies }) => {
      capturedCookies = options.cookies;
      return { auth: { getUser: jest.fn() } };
    });

    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    createServerSupabaseClient();

    expect(capturedCookies).toBeDefined();
    const result = capturedCookies!.getAll();
    expect(result).toEqual([{ name: 'session', value: 'token123' }]);
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it('provides setAll cookie handler that sets each cookie', async () => {
    let capturedCookies: { getAll: () => unknown; setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => void } | undefined;
    mockCreateServerClient.mockImplementation((_url: string, _key: string, options: { cookies: typeof capturedCookies }) => {
      capturedCookies = options.cookies;
      return { auth: { getUser: jest.fn() } };
    });

    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    createServerSupabaseClient();

    expect(capturedCookies).toBeDefined();
    capturedCookies!.setAll([
      { name: 'cookie1', value: 'val1', options: { path: '/' } },
      { name: 'cookie2', value: 'val2' },
    ]);

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith('cookie1', 'val1', { path: '/' });
    expect(mockSet).toHaveBeenCalledWith('cookie2', 'val2', undefined);
  });

  it('setAll handler swallows errors (Server Component safe)', async () => {
    let capturedCookies: { getAll: () => unknown; setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => void } | undefined;
    mockCreateServerClient.mockImplementation((_url: string, _key: string, options: { cookies: typeof capturedCookies }) => {
      capturedCookies = options.cookies;
      return { auth: { getUser: jest.fn() } };
    });
    mockSet.mockImplementationOnce(() => { throw new Error('Cannot set cookie in Server Component'); });

    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    createServerSupabaseClient();

    // Should NOT throw even when mockSet throws
    expect(() => {
      capturedCookies!.setAll([{ name: 'cookie', value: 'val' }]);
    }).not.toThrow();
  });

  it('returns the client from createServerClient', async () => {
    const mockClient = { auth: { getUser: jest.fn() }, from: jest.fn() };
    mockCreateServerClient.mockReturnValueOnce(mockClient);

    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const client = createServerSupabaseClient();

    expect(client).toBe(mockClient);
  });
});
