/**
 * Tests for lib/auth.ts
 */

// Mock next/headers before any imports
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}));

// Mock @supabase/ssr
const mockGetUser = jest.fn();
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

import { getAuthUser } from '@/lib/auth';

describe('getAuthUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('returns user when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

    const user = await getAuthUser();

    expect(user).toEqual(mockUser);
  });

  it('throws Unauthorized when user is null', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(getAuthUser()).rejects.toThrow('Unauthorized');
  });

  it('throws Unauthorized when error is returned', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    await expect(getAuthUser()).rejects.toThrow('Unauthorized');
  });

  it('calls getUser on the supabase auth client', async () => {
    const mockUser = { id: 'user-456', email: 'another@example.com' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

    await getAuthUser();

    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });
});
