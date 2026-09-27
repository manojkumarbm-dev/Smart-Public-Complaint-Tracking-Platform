const getStorageValue = (key, fallback = null) => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setStorageValue = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const appParams = {
  appId: 'PRJ_364',
  token: getStorageValue('smart-complaint-token', null),
  fromUrl: typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173',
  functionsVersion: 'v1',
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  setToken(token) {
    setStorageValue('smart-complaint-token', token);
    this.token = token;
  },
};
