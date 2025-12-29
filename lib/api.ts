let refreshing = false;
let subscribers: (() => void)[] = [];

async function refreshAccessToken() {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Refresh failed");
  }

  return res.json();
}

export async function authFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);

  if (res.status !== 401) {
    return res;
  }

  if (refreshing) {
    await new Promise((resolve) => subscribers.push(resolve as () => void));
    return fetch(url, options);
  }

  refreshing = true;

  try {
    await refreshAccessToken();

    subscribers.forEach((cb) => cb());
    subscribers = [];

    return fetch(url, options);
  } catch (error) {
    window.location.href = "/login";
    throw error;
  } finally {
    refreshing = false;
  }
}
