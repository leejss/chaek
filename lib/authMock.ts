export const AUTH_STORAGE_KEY = "bookmaker:isAuthenticated";

export const isServerMockAuthenticated = process.env.MOCK_AUTH === "true";

export const readMockAuth = () =>
  typeof window !== "undefined" &&
  localStorage.getItem(AUTH_STORAGE_KEY) === "true";

export const setMockAuth = () => {
  localStorage.setItem(AUTH_STORAGE_KEY, "true");
};

export const clearMockAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};


