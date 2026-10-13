/**
 * Security response headers for every etlabs.app response (security sweep 2026-10-13, M1/M4/M5).
 * Set in the Worker (run_worker_first) so they apply uniformly, including redirects and API responses.
 * CSP ships as Report-Only first; enforce after a clean observation window.
 */
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // inline scripts exist on most pages; CF Web Analytics beacon is edge-injected; Supabase UMD (Total Cross); Turnstile (/study)
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com https://*.supabase.co wss://*.supabase.co",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export const SECURITY_HEADERS = {
  "strict-transport-security": "max-age=31536000",
  "content-security-policy-report-only": CSP_REPORT_ONLY,
  "x-frame-options": "SAMEORIGIN",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
};

/* Adds any missing security header; never overrides one a route set on purpose. */
export function withSecurityHeaders(response) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!r.headers.has(k)) r.headers.set(k, v);
  }
  return r;
}
