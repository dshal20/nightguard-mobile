import { getMe } from '@/lib/api';

jest.mock('@/lib/config', () => ({
  getApiBaseUrl: () => 'http://api.test',
}));

describe('api', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls GET /users/me with base URL and bearer token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ firstName: 'A', lastName: 'B' }),
    });

    const profile = await getMe('my-id-token');

    expect(global.fetch).toHaveBeenCalledWith('http://api.test/users/me', {
      headers: {
        Authorization: 'Bearer my-id-token',
        Accept: 'application/json',
      },
    });
    expect(profile).toEqual({ firstName: 'A', lastName: 'B' });
  });

  it('throws on 4xx responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => '{"error":"missing"}',
    });

    await expect(getMe('tok')).rejects.toThrow(/GET \/users\/me 404/);
  });

  it('throws on 5xx responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => 'bad',
    });

    await expect(getMe('tok')).rejects.toThrow(/GET \/users\/me 503/);
  });
});
