import { getApiBaseUrl } from '@/lib/config';

/** GET /users/me — role from Spring is typically `ADMIN` | `USER`. */
export type UserProfile = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: 'ADMIN' | 'USER' | string;
};

/** GET /venues item. */
export type Venue = {
  id?: string | number;
  name?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phoneNumber?: string;
  inviteCode?: string;
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

export type UpdateMeBody = { firstName: string; lastName: string };

/**
 * POST `{API_BASE_URL}/users/me` with JSON body and Firebase ID token.
 */
export async function updateMe(idToken: string, body: UpdateMeBody): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/users/me`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;

  if (!res.ok) {
    throw new Error(
      `POST /users/me ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
}

/**
 * GET `{API_BASE_URL}/venues` with Firebase ID token.
 */
export async function getVenues(idToken: string): Promise<Venue[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/venues`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;

  if (!res.ok) {
    throw new Error(
      `GET /venues ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }

  try {
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      throw new Error(`GET /venues: expected JSON array — ${snippet || '(empty)'}`);
    }
    return data as Venue[];
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('GET /venues: expected')) throw e;
    throw new Error(`GET /venues: invalid JSON — ${snippet || '(empty)'}`);
  }
}
