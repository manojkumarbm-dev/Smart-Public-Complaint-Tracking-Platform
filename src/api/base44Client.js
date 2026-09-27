import { appParams } from '@/lib/app-params';

const STORAGE_KEY = 'smart-public-complaint-platform';
const AUTH_KEY = `${STORAGE_KEY}:auth`;
const PENDING_REGISTRATION_KEY = `${STORAGE_KEY}:pending-registration`;
const EVENT_NAME = `${STORAGE_KEY}:store-change`;

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const parseJson = (key, fallback = null) => {
  if (!isBrowser) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!isBrowser) return;
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
};

const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
const getTimestamp = () => new Date().toISOString();

const normalizeRole = (role) => {
  const value = String(role ?? '').trim().toLowerCase();
  if (!value) return 'user';
  const aliases = {
    admin: 'admin',
    administrator: 'admin',
    systemadmin: 'admin',
    authority: 'authority',
    department: 'department',
    staff: 'authority',
    citizen: 'citizen',
    user: 'user',
    resident: 'citizen',
  };
  return aliases[value] || value;
};

const readAdminConfig = () => {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return {
    email: String(env.VITE_ADMIN_EMAIL || 'admin@smartcomplaint.gov.in').trim(),
    password: String(env.VITE_ADMIN_PASSWORD || 'admin123').trim(),
  };
};

const isPlaceholderGoogleClientId = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return true;

  return [
    'your_google_client_id_here',
    'your-google-client-id-here',
    'your-google-client-id',
    'replace_me',
    'example-client-id',
    'placeholder',
    'demo-client-id',
    'client-id-placeholder',
    'your_client_id_here',
  ].includes(normalized) || normalized.includes('your_google') || normalized.includes('your-google') || normalized.includes('placeholder') || normalized.includes('example');
};

const readGoogleConfig = () => {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return {
    clientId: String(env.VITE_GOOGLE_CLIENT_ID || '').trim(),
    redirectUri: String(env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/login').trim(),
  };
};

const hashPassword = async (value) => {
  const text = String(value ?? '');
  if (!text) return '';

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer))
      .map((entry) => entry.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const passwordMatches = async (providedPassword, storedPassword) => {
  if (!storedPassword) return false;
  const candidate = await hashPassword(providedPassword);
  return candidate === storedPassword || String(providedPassword) === String(storedPassword);
};

const migrateUserRecord = async (user = {}) => {
  const value = { ...user, role: normalizeRole(user.role) };
  if (!value.password) return value;
  if (value.password.startsWith('hash:')) {
    value.password = value.password.replace(/^hash:/, '');
    return value;
  }
  value.password = await hashPassword(value.password);
  return value;
};

const seedStore = async () => {
  const existing = parseJson(STORAGE_KEY, {});
  const now = getTimestamp();
  const migratedUsers = await Promise.all(((existing.users ?? []) || []).map(migrateUserRecord));
  const adminConfig = readAdminConfig();
  const adminPasswordHash = await hashPassword(adminConfig.password);
  const citizenPasswordHash = await hashPassword('citizen123');

  const defaultUsers = [
    {
      id: 'admin-1',
      email: adminConfig.email,
      password: adminPasswordHash,
      role: 'admin',
      full_name: 'System Administrator',
      phone_number: '+91 98765 43210',
      created_date: now,
    },
    {
      id: 'citizen-1',
      email: 'citizen@example.com',
      password: citizenPasswordHash,
      role: 'citizen',
      full_name: 'Asha Sharma',
      phone_number: '+91 98765 43210',
      created_date: now,
    },
  ];

  const adminIndex = migratedUsers.findIndex((user) => user.email.toLowerCase() === adminConfig.email.toLowerCase());
  const citizenIndex = migratedUsers.findIndex((user) => user.email.toLowerCase() === 'citizen@example.com');

  const nextUsers = [...migratedUsers];
  if (adminIndex >= 0) {
    nextUsers[adminIndex] = {
      ...nextUsers[adminIndex],
      id: nextUsers[adminIndex].id || 'admin-1',
      email: adminConfig.email,
      role: 'admin',
      full_name: nextUsers[adminIndex].full_name || 'System Administrator',
      password: adminPasswordHash,
    };
  } else {
    nextUsers.unshift(defaultUsers[0]);
  }

  if (citizenIndex >= 0) {
    nextUsers[citizenIndex] = {
      ...nextUsers[citizenIndex],
      id: nextUsers[citizenIndex].id || 'citizen-1',
      email: 'citizen@example.com',
      role: 'citizen',
      full_name: nextUsers[citizenIndex].full_name || 'Asha Sharma',
      password: citizenPasswordHash,
    };
  } else {
    const citizenExists = nextUsers.some((user) => user.email.toLowerCase() === 'citizen@example.com');
    if (!citizenExists) nextUsers.push(defaultUsers[1]);
  }

  const defaultDepartments = existing.departments ?? [
    { id: 'dept-1', name: 'Public Works', code: 'PW' },
    { id: 'dept-2', name: 'Water Supply', code: 'WS' },
    { id: 'dept-3', name: 'Sanitation', code: 'SN' },
    { id: 'dept-4', name: 'Street Lighting', code: 'SL' },
  ];

  const defaultProblems = existing.problems ?? [
    {
      id: 'problem-demo-1',
      problem_id: 'PRB-1001',
      title: 'Large pothole near market square',
      category: 'Pothole',
      description: 'A deep pothole has formed near the central junction and is causing vehicle damage.',
      address: 'Main Market Road, Sector 12',
      priority: 'High',
      status: 'In Progress',
      latitude: 28.6139,
      longitude: 77.209,
      geo_timestamp: now,
      image_url: '',
      created_by_id: 'citizen-1',
      created_date: now,
      department: 'Public Works',
      assigned_to: 'Road Maintenance Unit',
      confirmations: ['admin-1'],
    },
    {
      id: 'problem-demo-2',
      problem_id: 'PRB-1002',
      title: 'Garbage overflow near school gate',
      category: 'Garbage',
      description: 'Overflowing waste bins are attracting stray animals and creating health issues.',
      address: 'School Gate Lane, Ward 5',
      priority: 'Medium',
      status: 'Verified',
      latitude: 28.6145,
      longitude: 77.216,
      geo_timestamp: now,
      image_url: '',
      created_by_id: 'citizen-1',
      created_date: new Date(Date.now() - 86400000).toISOString(),
      department: 'Sanitation',
      assigned_to: 'Sanitation Division',
      confirmations: [],
    },
  ];

  const defaultNotifications = existing.notifications ?? [
    {
      id: 'notification-demo-1',
      user_id: 'admin-1',
      problem_id: 'problem-demo-1',
      message: 'New public complaint reported: Large pothole near market square',
      type: 'new_report',
      read: false,
      created_date: now,
    },
  ];

  const defaultProblemUpdates = existing.problemUpdates ?? [
    {
      id: 'update-demo-1',
      problem_id: 'problem-demo-1',
      status: 'In Progress',
      comment: 'Maintenance team has been deployed to inspect the location.',
      image_url: '',
      created_date: now,
    },
  ];

  const nextStore = {
    ...existing,
    users: nextUsers.map((user) => ({ ...user, role: normalizeRole(user.role) })),
    departments: defaultDepartments,
    problems: defaultProblems,
    notifications: defaultNotifications,
    problemUpdates: defaultProblemUpdates,
  };

  writeJson(STORAGE_KEY, nextStore);
  return nextStore;
};

const emitStoreChange = (entity = 'store') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { entity } }));
};

const sortItems = (items, sortField = '') => {
  if (!sortField) return items;
  const sortKey = sortField.replace(/^[+-]/, '');
  const descending = sortField.startsWith('-');
  return [...items].sort((a, b) => {
    const aValue = a?.[sortKey];
    const bValue = b?.[sortKey];
    const left = aValue === null || aValue === undefined ? '' : aValue;
    const right = bValue === null || bValue === undefined ? '' : bValue;
    if (left < right) return descending ? 1 : -1;
    if (left > right) return descending ? -1 : 1;
    return 0;
  });
};

const matchesQuery = (item, query = {}) => {
  if (!query || typeof query !== 'object') return true;
  return Object.entries(query).every(([key, value]) => item?.[key] === value);
};

const createEntityCollection = (collectionKey, entityName) => ({
  list: async (sortField = '', limit = null) => {
    const store = await seedStore();
    let items = sortItems(store[collectionKey] ?? [], sortField);
    if (typeof limit === 'number' && limit > 0) items = items.slice(0, limit);
    return items;
  },
  filter: async (query = {}, sortField = '', limit = null) => {
    const store = await seedStore();
    let items = (store[collectionKey] ?? []).filter((item) => matchesQuery(item, query));
    items = sortItems(items, sortField);
    if (typeof limit === 'number' && limit > 0) items = items.slice(0, limit);
    return items;
  },
  get: async (id) => {
    const store = await seedStore();
    return (store[collectionKey] ?? []).find((item) => item.id === id) ?? null;
  },
  create: async (payload = {}) => {
    const store = await seedStore();
    const item = {
      ...payload,
      id: payload.id || makeId(entityName),
      created_date: payload.created_date || getTimestamp(),
    };
    store[collectionKey] = [...(store[collectionKey] ?? []), item];
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return item;
  },
  update: async (id, changes = {}) => {
    const store = await seedStore();
    const items = store[collectionKey] ?? [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`${entityName} not found`);
    }
    const updated = { ...items[index], ...changes, updated_date: getTimestamp() };
    items[index] = updated;
    store[collectionKey] = items;
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return updated;
  },
  bulkCreate: async (items = []) => {
    const store = await seedStore();
    const created = items.map((entry) => ({
      ...entry,
      id: entry.id || makeId(entityName),
      created_date: entry.created_date || getTimestamp(),
    }));
    store[collectionKey] = [...(store[collectionKey] ?? []), ...created];
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return created;
  },
  bulkUpdate: async (items = []) => {
    const store = await seedStore();
    const nextList = [...(store[collectionKey] ?? [])];
    for (const entry of items) {
      const index = nextList.findIndex((item) => item.id === entry.id);
      if (index >= 0) {
        nextList[index] = { ...nextList[index], ...entry, updated_date: getTimestamp() };
      }
    }
    store[collectionKey] = nextList;
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return nextList;
  },
  subscribe: (callback) => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    const handler = (event) => callback?.(event.detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  },
});

const getAuthenticatedUser = async () => {
  const auth = parseJson(AUTH_KEY, null);
  if (!auth || !auth.userId) return null;
  const store = await seedStore();
  return (store.users ?? []).find((user) => user.id === auth.userId) || null;
};

const persistAuthenticatedUser = (user) => {
  if (!user) {
    writeJson(AUTH_KEY, null);
    appParams.setToken(null);
    return;
  }
  const normalizedUser = { ...user, role: normalizeRole(user.role) };
  writeJson(AUTH_KEY, { userId: normalizedUser.id, token: normalizedUser.id });
  appParams.setToken(normalizedUser.id);
};

let googleIdentityLoadPromise = null;

const loadGoogleIdentityScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google authentication is only available in the browser.'));
  }

  if (window.google && window.google.accounts && window.google.accounts.id) {
    return Promise.resolve(window.google);
  }

  if (!googleIdentityLoadPromise) {
    googleIdentityLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-identity]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load Google authentication.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-identity', 'true');
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Unable to load Google authentication.'));
      document.head.appendChild(script);
    });
  }

  return googleIdentityLoadPromise;
};

const ensureGoogleReady = async () => {
  const googleApi = await loadGoogleIdentityScript();
  if (!googleApi || !googleApi.accounts || !googleApi.accounts.oauth2) {
    throw new Error('Google sign-in is not available right now. Please try again.');
  }
  return googleApi;
};

const requireAdminRole = async () => {
  const user = await getAuthenticatedUser();
  if (!user || normalizeRole(user.role) !== 'admin') {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  return user;
};

const auth = {
  me: async () => {
    const user = await getAuthenticatedUser();
    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    return user;
  },
  requireAdmin: requireAdminRole,
  loginViaEmailPassword: async (email, password) => {
    const store = await seedStore();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const match = (store.users ?? []).find((user) => user.email.toLowerCase() === normalizedEmail);
    if (!match) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const valid = await passwordMatches(password, match.password);
    if (!valid) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const user = { ...match, role: normalizeRole(match.role) };
    persistAuthenticatedUser(user);
    return user;
  },
  register: async ({ email, password }) => {
    const value = String(email || '').trim();
    const store = await seedStore();
    if (!value || !password) {
      throw new Error('Email and password are required');
    }
    const existing = (store.users ?? []).find((user) => user.email.toLowerCase() === value.toLowerCase());
    if (existing) {
      throw new Error('An account with that email already exists');
    }
    const user = {
      id: makeId('user'),
      email: value,
      password: await hashPassword(password),
      role: 'citizen',
      full_name: value.split('@')[0],
      phone_number: '',
      created_date: getTimestamp(),
    };
    store.users = [...(store.users ?? []), user];
    writeJson(STORAGE_KEY, store);
    persistAuthenticatedUser(user);
    return { success: true, access_token: user.id, user };
  },
  verifyOtp: async ({ email, otpCode }) => {
    const pending = parseJson(PENDING_REGISTRATION_KEY, null);
    if (!pending) {
      throw new Error('No pending registration found');
    }
    const supplied = String(otpCode || '').trim();
    const target = String(email || '').trim();
    if (pending.email.toLowerCase() !== target.toLowerCase() || pending.otp !== supplied) {
      throw new Error('Invalid verification code');
    }
    const store = await seedStore();
    const user = {
      id: makeId('user'),
      email: pending.email,
      password: pending.password,
      role: 'citizen',
      full_name: pending.email.split('@')[0],
      phone_number: '',
      created_date: getTimestamp(),
    };
    store.users = [...(store.users ?? []), user];
    writeJson(STORAGE_KEY, store);
    writeJson(PENDING_REGISTRATION_KEY, null);
    persistAuthenticatedUser(user);
    return { access_token: user.id, user };
  },
  resendOtp: async (email) => {
    const value = String(email || '').trim();
    const pending = parseJson(PENDING_REGISTRATION_KEY, null);
    if (!pending || pending.email.toLowerCase() !== value.toLowerCase()) {
      throw new Error('Registration request not found');
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    writeJson(PENDING_REGISTRATION_KEY, { ...pending, otp });
    return { success: true, otp };
  },
  updateMe: async (updates = {}) => {
    const user = await getAuthenticatedUser();
    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    const store = await seedStore();
    const nextUsers = [...(store.users ?? [])];
    for (const [index, entry] of nextUsers.entries()) {
      if (entry.id !== user.id) continue;
      const nextUser = { ...entry, ...updates };
      if (updates.role) nextUser.role = normalizeRole(updates.role);
      if (updates.password) nextUser.password = await hashPassword(updates.password);
      nextUsers[index] = nextUser;
    }
    store.users = nextUsers;
    writeJson(STORAGE_KEY, store);
    const refreshed = nextUsers.find((entry) => entry.id === user.id);
    persistAuthenticatedUser(refreshed);
    return refreshed;
  },
  logout: (redirectUrl) => {
    persistAuthenticatedUser(null);
    if (typeof window !== 'undefined') {
      if (redirectUrl && !redirectUrl.includes('/login')) {
        window.location.assign('/login');
      } else if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
  },
  redirectToLogin: (redirectUrl) => {
    if (typeof window !== 'undefined') {
      const next = redirectUrl && redirectUrl.includes('/login') ? redirectUrl : `/login?returnTo=${encodeURIComponent(redirectUrl || '/dashboard')}`;
      window.location.assign(next);
    }
  },
  resetPasswordRequest: async (email) => {
    const value = String(email || '').trim();
    const store = await seedStore();
    const user = (store.users ?? []).find((entry) => entry.email.toLowerCase() === value.toLowerCase());
    if (!user) {
      throw new Error('No account found for that email');
    }
    const token = makeId('reset').slice(0, 12).toUpperCase();
    writeJson(`${STORAGE_KEY}:reset-token`, { email: value, token });
    return { success: true, resetToken: token };
  },
  resetPassword: async ({ resetToken, newPassword }) => {
    const tokenRecord = parseJson(`${STORAGE_KEY}:reset-token`, null);
    if (!tokenRecord || tokenRecord.token !== String(resetToken || '').trim()) {
      throw new Error('Invalid or expired reset token');
    }
    const store = await seedStore();
    const index = (store.users ?? []).findIndex((entry) => entry.email.toLowerCase() === tokenRecord.email.toLowerCase());
    if (index < 0) {
      throw new Error('User not found');
    }
    store.users[index].password = await hashPassword(newPassword);
    writeJson(STORAGE_KEY, store);
    writeJson(`${STORAGE_KEY}:reset-token`, null);
    return { success: true };
  },
  loginWithProvider: async (provider, redirectTo = '/dashboard') => {
    const adminConfig = readAdminConfig();
    const store = await seedStore();

    if (provider === 'google') {
      const { clientId } = readGoogleConfig();
      if (!clientId || isPlaceholderGoogleClientId(clientId)) {
        const error = new Error('Google sign-in is not configured. Set a real VITE_GOOGLE_CLIENT_ID in your .env file for the OAuth client created in Google Cloud Console.');
        error.type = 'google_config_missing';
        throw error;
      }

      const googleApi = await ensureGoogleReady();
      const accessToken = await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback) => (response) => {
          if (settled) return;
          settled = true;
          callback(response);
        };

        const tokenClient = googleApi.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: finish((response) => {
            if (response?.access_token) resolve(response.access_token);
            else reject(new Error('Google sign-in was cancelled.'));
          }),
          error_callback: finish((error) => {
            reject(new Error(error?.type === 'popup_failed_to_open'
              ? 'Google sign-in popup was blocked. Please allow popups and try again.'
              : 'Google sign-in was cancelled.'));
          }),
        });

        try {
          tokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch {
          reject(new Error('Unable to open Google sign-in. Please allow popups and try again.'));
        }
      });

      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileResponse.ok) {
        throw new Error('Unable to read your Google account information.');
      }
      const payload = await profileResponse.json();
      const email = String(payload?.email || '').trim().toLowerCase();
      if (!email) {
        throw new Error('Unable to read your Google account information.');
      }

      const policyRole = email.toLowerCase() === adminConfig.email.toLowerCase() ? 'admin' : 'citizen';
      const existing = (store.users ?? []).find((user) => user.email.toLowerCase() === email);

      const user = existing ?? {
        id: makeId('user'),
        email,
        password: await hashPassword(`google:${payload?.sub || email}`),
        role: policyRole,
        full_name: payload?.name || email.split('@')[0],
        phone_number: '',
        provider: 'google',
        provider_id: payload?.sub || '',
        created_date: getTimestamp(),
      };

      if (existing) {
        user.role = normalizeRole(existing.role === 'admin' || email === adminConfig.email.toLowerCase() ? 'admin' : 'citizen');
      }

      if (!existing) {
        store.users = [...(store.users ?? []), user];
      } else {
        const index = (store.users ?? []).findIndex((entry) => entry.id === existing.id);
        if (index >= 0) {
          store.users[index] = {
            ...existing,
            full_name: payload?.name || existing.full_name || email.split('@')[0],
            provider: 'google',
            provider_id: payload?.sub || existing.provider_id || '',
            role: normalizeRole(email === adminConfig.email.toLowerCase() ? 'admin' : existing.role || 'citizen'),
          };
        }
      }

      writeJson(STORAGE_KEY, store);
      persistAuthenticatedUser({ ...user, role: normalizeRole(user.role) });
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo || '/dashboard');
      }
      return { ...user, role: normalizeRole(user.role) };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  },
};

const users = {
  inviteUser: async (email, role = 'citizen') => {
    const value = String(email || '').trim();
    const store = await seedStore();
    if (!value) {
      throw new Error('Email is required');
    }
    if ((store.users ?? []).some((user) => user.email.toLowerCase() === value.toLowerCase())) {
      return (store.users ?? []).find((user) => user.email.toLowerCase() === value.toLowerCase());
    }
    const newUser = {
      id: makeId('user'),
      email: value,
      password: await hashPassword('temporary-password'),
      role: normalizeRole(role),
      full_name: value.split('@')[0],
      phone_number: '',
      created_date: getTimestamp(),
    };
    store.users = [...(store.users ?? []), newUser];
    writeJson(STORAGE_KEY, store);
    emitStoreChange('user');
    return newUser;
  },
};

const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      if (!file) {
        return { file_url: '' };
      }
      if (typeof window !== 'undefined' && typeof window.URL !== 'undefined' && window.URL.createObjectURL) {
        return { file_url: window.URL.createObjectURL(file) };
      }
      return { file_url: `data:${file.type || 'image/png'};base64,` };
    },
  },
};

export const base44 = {
  auth,
  entities: {
    User: createEntityCollection('users', 'user'),
    Problem: createEntityCollection('problems', 'problem'),
    ProblemUpdate: createEntityCollection('problemUpdates', 'problemUpdate'),
    Notification: createEntityCollection('notifications', 'notification'),
    Department: createEntityCollection('departments', 'department'),
  },
  users,
  integrations,
};

export { appParams };
