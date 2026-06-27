// Admin password guarding the room-management console and the destructive
// room-delete endpoint. Override in production by setting an ADMIN_PASSWORD
// secret (`wrangler secret put ADMIN_PASSWORD`). The default below is only meant
// for local development — change it before deploying.
export const DEFAULT_ADMIN_PASSWORD = "monopoly-admin";

export function adminPassword(env: { ADMIN_PASSWORD?: string }): string {
  const fromEnv = env.ADMIN_PASSWORD;
  return typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : DEFAULT_ADMIN_PASSWORD;
}

/** True when the request carries the correct admin password header. */
export function isAuthorized(req: Request, env: { ADMIN_PASSWORD?: string }): boolean {
  const provided = req.headers.get("x-admin-password");
  return !!provided && provided === adminPassword(env);
}

// The Next.js app is served from a different origin than the Worker host, so
// these endpoints need permissive CORS. The custom auth header also forces a
// preflight, handled via preflight() below.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
