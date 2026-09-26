import { validateSessionToken, type SessionUser } from "./session";

export const SESSION_COOKIE_NAME = "session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // must match session.ts
const isProduction = process.env.NODE_ENV === "production";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface RequestContext {
  user: SessionUser;
  sessionId: string;
}

function buildCookie(value: string, expiresAt: Date): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

export function createSessionCookie(token: string): string {
  return buildCookie(token, new Date(Date.now() + SESSION_TTL_MS));
}

export function createBlankSessionCookie(): string {
  return buildCookie("", new Date(0));
}

export function getSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const pair of header.split(";")) {
    const [name, ...rest] = pair.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      const value = rest.join("=");
      return value.length > 0 ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export async function getRequestContext(
  request: Request,
): Promise<RequestContext | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const { session, user } = await validateSessionToken(token);
  if (!session || !user) return null;
  return { user, sessionId: session.id };
}

/** Throws UnauthorizedError when there is no valid session. Use in server handlers. */
export async function requireUser(request: Request): Promise<RequestContext> {
  const context = await getRequestContext(request);
  if (!context) throw new UnauthorizedError();
  return context;
}
