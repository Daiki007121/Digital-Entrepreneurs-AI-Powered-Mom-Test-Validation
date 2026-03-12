/**
 * Tests for lib/supabase-admin.ts
 */

const mockCreateClient = jest.fn(() => ({ from: jest.fn() }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

describe('createAdminClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('creates client with SUPABASE_URL and service role key', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-123';

    const { createAdminClient } = await import('@/lib/supabase-admin');
    createAdminClient();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'service-role-key-123',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
      }),
    );
  });

  it('falls back to NEXT_PUBLIC_SUPABASE_URL when SUPABASE_URL is not set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-123';

    const { createAdminClient } = await import('@/lib/supabase-admin');
    createAdminClient();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://public.supabase.co',
      'service-role-key-123',
      expect.anything(),
    );
  });

  it('throws when SUPABASE_URL is missing', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-123';
    // No SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL set

    const { createAdminClient } = await import('@/lib/supabase-admin');
    expect(() => createAdminClient()).toThrow('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  });

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    // No SUPABASE_SERVICE_ROLE_KEY

    const { createAdminClient } = await import('@/lib/supabase-admin');
    expect(() => createAdminClient()).toThrow('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  });

  it('returns the client from createClient', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-123';

    const mockClient = { from: jest.fn(), auth: {} };
    mockCreateClient.mockReturnValueOnce(mockClient as unknown as ReturnType<typeof mockCreateClient>);

    const { createAdminClient } = await import('@/lib/supabase-admin');
    const client = createAdminClient();

    expect(client).toBe(mockClient);
  });
});
