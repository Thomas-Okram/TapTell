const K_API_BASE = "taptell_kiosk_apiBase";
const K_DEVICE_KEY = "taptell_kiosk_deviceKey";

export function normalizeBase(url: string) {
  return url.trim().replace(/\/+$/, "");
}

export function getKioskConfig(): {
  apiBase: string;
  deviceKey: string;
} | null {
  const apiBase = localStorage.getItem(K_API_BASE) || "";
  const deviceKey = localStorage.getItem(K_DEVICE_KEY) || "";
  if (!apiBase || !deviceKey) return null;
  return { apiBase, deviceKey };
}

export function setKioskConfig(apiBase: string, deviceKey: string) {
  localStorage.setItem(K_API_BASE, normalizeBase(apiBase));
  localStorage.setItem(K_DEVICE_KEY, deviceKey.trim());
}

export function clearKioskConfig() {
  localStorage.removeItem(K_API_BASE);
  localStorage.removeItem(K_DEVICE_KEY);
}
