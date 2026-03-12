/**
 * Tests for lib/supabase.ts (browser client)
 */

const mockCreateBrowserClient = jest.fn(() => ({ from: jest.fn() }));

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe('lib/supabase createClient', () => {
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

  it('calls createBrowserClient with the env vars', async () => {
    const { createClient } = await import('@/lib/supabase');
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
    );
  });

  it('returns the client from createBrowserClient', async () => {
    const mockClient = { from: jest.fn(), auth: jest.fn() };
    mockCreateBrowserClient.mockReturnValueOnce(mockClient as unknown as ReturnType<typeof mockCreateBrowserClient>);

    const { createClient } = await import('@/lib/supabase');
    const client = createClient();

    expect(client).toBe(mockClient);
  });

  it('creates a new client on each call', async () => {
    const { createClient } = await import('@/lib/supabase');
    createClient();
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
  });
});
