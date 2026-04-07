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

// --- Dashboard (GET /incidents, capacity, headcount, notification activity) ---

/** Optional nested reporter on `GET /incidents` items. */
export type IncidentReporter = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
};

/** `GET /incidents?venueId=…` array element (venue incidents list / dashboard). */
export type IncidentResponse = {
  id?: string;
  venueId?: string | number;
  type?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  status?: 'ACTIVE' | 'COMPLETED' | string;
  description?: string;
  keywords?: string[];
  createdAt?: string;
  updatedAt?: string;
  reporter?: IncidentReporter;
};

export type VenueCapacityResponse = {
  capacity?: number;
  updatedAt?: string;
};

export type VenueHeadcountResponse = {
  id?: string;
  headcount?: number;
  createdAt?: string;
};

export type NotificationActivity = {
  id?: string;
  fromVenueId?: string | number;
  createdAt?: string;
};

function authBearerHeaders(idToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${idToken}`,
    Accept: 'application/json',
  };
}

/**
 * GET `/incidents?venueId=…`
 */
export async function getIncidents(venueId: string, idToken: string): Promise<IncidentResponse[]> {
  const base = getApiBaseUrl();
  const q = new URLSearchParams({ venueId }).toString();
  const res = await fetch(`${base}/incidents?${q}`, { headers: authBearerHeaders(idToken) });
  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(`GET /incidents ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`);
  }
  try {
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      throw new Error(`GET /incidents: expected JSON array — ${snippet || '(empty)'}`);
    }
    return data as IncidentResponse[];
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('GET /incidents: expected')) throw e;
    throw new Error(`GET /incidents: invalid JSON — ${snippet || '(empty)'}`);
  }
}

/**
 * GET `/venues/{venueId}/capacity` — **404 → `null`** (no capacity configured).
 */
export async function getCapacity(
  venueId: string,
  idToken: string,
): Promise<VenueCapacityResponse | null> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/venues/${encodeURIComponent(venueId)}/capacity`, {
    headers: authBearerHeaders(idToken),
  });
  if (res.status === 404) {
    return null;
  }
  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(
      `GET /venues/.../capacity ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
  try {
    return JSON.parse(text) as VenueCapacityResponse;
  } catch {
    throw new Error(`GET capacity: invalid JSON — ${snippet || '(empty)'}`);
  }
}

/**
 * GET `/venues/{venueId}/headcount` — returns an array (newest convention: **last** item is latest).
 * **404 → `[]`**.
 */
export async function getHeadcounts(
  venueId: string,
  idToken: string,
): Promise<VenueHeadcountResponse[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/venues/${encodeURIComponent(venueId)}/headcount`, {
    headers: authBearerHeaders(idToken),
  });
  if (res.status === 404) {
    return [];
  }
  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(
      `GET /venues/.../headcount ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
  try {
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      throw new Error(`GET headcount: expected JSON array — ${snippet || '(empty)'}`);
    }
    return data as VenueHeadcountResponse[];
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('GET headcount: expected')) throw e;
    throw new Error(`GET headcount: invalid JSON — ${snippet || '(empty)'}`);
  }
}

/**
 * GET `/notifications/{venueId}/activity`
 * **404 → `[]`**.
 */
export async function getNotificationActivity(
  venueId: string,
  idToken: string,
): Promise<NotificationActivity[]> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/notifications/${encodeURIComponent(venueId)}/activity`,
    { headers: authBearerHeaders(idToken) },
  );
  if (res.status === 404) {
    return [];
  }
  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(
      `GET /notifications/.../activity ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
  try {
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      throw new Error(`GET notification activity: expected JSON array — ${snippet || '(empty)'}`);
    }
    return data as NotificationActivity[];
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('GET notification activity: expected')) throw e;
    throw new Error(`GET notification activity: invalid JSON — ${snippet || '(empty)'}`);
  }
}
