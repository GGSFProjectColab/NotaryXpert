// src/lib/fingerprint/connectorApi.ts

/**
 * Minimal client for the local Flask connector (Mantra MFS100).
 *
 * The connector runs on http://127.0.0.1:<port> (default 5000) and exposes:
 *   GET  /status  – health check
 *   POST /capture – returns JSON { success, template, preview, deviceInfo }
 */

const DEFAULT_CONNECTOR_URL = "http://127.0.0.1:5000";

/** Check if the local connector is reachable. */
export async function isConnectorAvailable(
  baseUrl: string = DEFAULT_CONNECTOR_URL,
  timeoutMs: number = 2000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${baseUrl}/status`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "online";
  } catch {
    return false;
  }
}

/** Capture a fingerprint via the connector.
 *  Returns the base64‑encoded template and optional preview image.
 */
export async function captureViaConnector(
  baseUrl: string = DEFAULT_CONNECTOR_URL,
  timeoutMs: number = 20000
): Promise<{ template: string; preview?: string; deviceInfo?: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${baseUrl}/capture`, {
    method: "POST",
    signal: controller.signal,
  });
  clearTimeout(timer);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Connector capture failed: ${res.status} ${err}`);
  }
  const payload = await res.json();
  if (!payload.success) {
    throw new Error(payload.error ?? "Unknown connector error");
  }
  return {
    template: payload.template,
    preview: payload.preview,
    deviceInfo: payload.deviceInfo,
  };
}
