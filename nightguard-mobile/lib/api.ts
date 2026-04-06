import { getApiBaseUrl } from '@/lib/config';

/** Shape of GET /users/me (adjust when backend is finalized). */
export type UserProfile = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
};

/**
 * GET `{API_BASE_URL}/users/me` with Firebase ID token.
 */
export async function getMe(idToken: string): Promise<UserProfile> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/users/me`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;

  if (!res.ok) {
    throw new Error(
      `GET /users/me ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }

  try {
    return JSON.parse(text) as UserProfile;
  } catch {
    throw new Error(`GET /users/me: expected JSON — ${snippet || '(empty body)'}`);
  }
}
