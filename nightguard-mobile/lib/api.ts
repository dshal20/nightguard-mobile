import { getApiBaseUrl } from '@/lib/config';

/** GET /users/me — role from Spring is typically `ADMIN` | `USER`. */
export type UserProfile = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profileUrl?: string;
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
 * Update only profile photo URL for current user.
 */
export async function updateMeProfilePhoto(
  idToken: string,
  profileUrl: string,
): Promise<UserProfile> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/users/me`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ profileUrl }),
  });
  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(
      `POST /users/me (profile photo) ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
  try {
    return (text ? JSON.parse(text) : {}) as UserProfile;
  } catch {
    throw new Error(`POST /users/me (profile photo): invalid JSON — ${snippet || '(empty)'}`);
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

export type CreateIncidentRequest = {
  venueId: string;
  type?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  description?: string;
  keywords: string[];
  offenderIds: string[];
  mediaUrls?: string[];
};

export type IncidentAttachmentMimeType =
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/png'
  | 'image/heic'
  | 'video/mp4'
  | 'video/quicktime'
  | 'video/webm';

export type CreateIncidentAttachmentUploadRequest = {
  incidentId: string;
  fileName: string;
  mimeType: IncidentAttachmentMimeType | string;
  fileSize?: number;
};

export type CreateIncidentAttachmentUploadResponse = {
  uploadUrl: string;
  fileKey: string;
  uploadMethod?: 'PUT' | 'POST';
};

export type AttachIncidentFileRequest = {
  fileKey: string;
  mimeType: string;
  fileName: string;
};

export type UploadResponse = {
  url?: string;
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

// --- Offenders (GET /offenders) ---

export type OffenderResponse = {
  id?: string | number;
  venueId?: string | number;
  firstName?: string;
  lastName?: string;
  physicalMarkers?: string;
  riskScore?: number;
  currentStatus?: string;
  notes?: string;
  globalId?: string | number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateOffenderRequest = {
  venueId: string;
  firstName: string;
  lastName: string;
  physicalMarkers?: string;
  riskScore?: number;
  currentStatus?: string;
  notes?: string;
};

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
 * POST `/incidents`
 */
export async function createIncident(
  idToken: string,
  payload: CreateIncidentRequest,
): Promise<IncidentResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/incidents`, {
    method: 'POST',
    headers: {
      ...authBearerHeaders(idToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(
      `POST /incidents ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }

  try {
    return (text ? JSON.parse(text) : {}) as IncidentResponse;
  } catch {
    throw new Error(`POST /incidents: invalid JSON — ${snippet || '(empty)'}`);
  }
}

/**
 * POST `/incidents/{incidentId}/attachments/presign`
 * TODO: verify exact backend path/body if it differs from web/mobile contract.
 */
export async function createIncidentAttachmentUpload(
  idToken: string,
  payload: CreateIncidentAttachmentUploadRequest,
): Promise<CreateIncidentAttachmentUploadResponse> {
  const base = getApiBaseUrl();
  const body = JSON.stringify({
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    fileSize: payload.fileSize,
  });
  const candidatePaths = [
    `/incidents/${encodeURIComponent(payload.incidentId)}/attachments/presign`,
    `/incidents/${encodeURIComponent(payload.incidentId)}/attachments/presigned-url`,
    `/incidents/attachments/presign`,
    `/incidents/attachments/presigned-url`,
  ];
  let lastError: string | null = null;

  for (const path of candidatePaths) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        ...authBearerHeaders(idToken),
        'Content-Type': 'application/json',
      },
      body,
    });
    const text = await res.text();
    const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;

    if (!res.ok) {
      lastError = `${path} -> ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`;
      if (res.status === 404) {
        continue;
      }
      throw new Error(`POST attachment presign failed ${lastError}`);
    }

    try {
      const data = JSON.parse(text) as unknown;
      const parsed = data as CreateIncidentAttachmentUploadResponse;
      if (!parsed?.uploadUrl || !parsed?.fileKey) {
        throw new Error('missing required fields');
      }
      return parsed;
    } catch {
      throw new Error(`POST attachment presign invalid JSON at ${path} — ${snippet || '(empty)'}`);
    }
  }

  throw new Error(
    `POST attachment presign 404 on all known paths: ${candidatePaths.join(', ')}${lastError ? ` (last: ${lastError})` : ''}`,
  );
}

/**
 * POST `/incidents/{incidentId}/attachments`
 * TODO: verify exact backend path/body if it differs from web/mobile contract.
 */
export async function attachIncidentFile(
  idToken: string,
  incidentId: string,
  payload: AttachIncidentFileRequest,
): Promise<void> {
  const base = getApiBaseUrl();
  const body = JSON.stringify(payload);
  const candidatePaths = [
    `/incidents/${encodeURIComponent(incidentId)}/attachments`,
    `/incidents/attachments`,
  ];
  let lastError: string | null = null;

  for (const path of candidatePaths) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        ...authBearerHeaders(idToken),
        'Content-Type': 'application/json',
      },
      body,
    });
    const text = await res.text();
    const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
    if (!res.ok) {
      lastError = `${path} -> ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`;
      if (res.status === 404) {
        continue;
      }
      throw new Error(`POST attachment link failed ${lastError}`);
    }
    return;
  }

  throw new Error(
    `POST attachment link 404 on all known paths: ${candidatePaths.join(', ')}${lastError ? ` (last: ${lastError})` : ''}`,
  );
}

/**
 * Upload bytes to pre-signed URL.
 */
export async function uploadIncidentAttachmentToPresignedUrl(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
    throw new Error(
      `Attachment upload failed ${uploadRes.status} ${uploadRes.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
}

/**
 * POST `/upload` multipart form upload.
 * Backend returns `{ url: string }`.
 */
export async function uploadMediaFile(
  idToken: string,
  file: {
    uri: string;
    fileName: string;
    mimeType: string;
  },
): Promise<string> {
  const base = getApiBaseUrl();
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.fileName,
    type: file.mimeType,
  } as unknown as Blob);

  const res = await fetch(`${base}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
    },
    body: form,
  });
  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(`POST /upload ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`);
  }
  try {
    const data = JSON.parse(text) as UploadResponse;
    if (!data?.url) throw new Error('missing url');
    return data.url;
  } catch {
    throw new Error(`POST /upload: invalid JSON — ${snippet || '(empty)'}`);
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

/**
 * GET `/offenders?venueId=…`
 * **404 → `[]`**.
 */
export async function getOffenders(
  venueId: string,
  idToken: string,
): Promise<OffenderResponse[]> {
  const base = getApiBaseUrl();
  const q = new URLSearchParams({ venueId }).toString();
  const res = await fetch(`${base}/offenders?${q}`, { headers: authBearerHeaders(idToken) });
  if (res.status === 404) {
    return [];
  }
  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(
      `GET /offenders ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
  try {
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      throw new Error(`GET /offenders: expected JSON array — ${snippet || '(empty)'}`);
    }
    return data as OffenderResponse[];
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('GET /offenders: expected')) throw e;
    throw new Error(`GET /offenders: invalid JSON — ${snippet || '(empty)'}`);
  }
}

/**
 * POST `/offenders`
 */
export async function createOffender(
  idToken: string,
  payload: CreateOffenderRequest,
): Promise<OffenderResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/offenders`, {
    method: 'POST',
    headers: {
      ...authBearerHeaders(idToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text;
  if (!res.ok) {
    throw new Error(
      `POST /offenders ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`,
    );
  }

  try {
    return (text ? JSON.parse(text) : {}) as OffenderResponse;
  } catch {
    throw new Error(`POST /offenders: invalid JSON — ${snippet || '(empty)'}`);
  }
}
