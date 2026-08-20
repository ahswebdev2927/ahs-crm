import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "local_development_jwt_access_secret_key_long_enough";

/**
 * Base64URL to ArrayBuffer helper for Web Crypto API
 */
const base64UrlToBuf = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad base64 if needed
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    buf[i] = raw.charCodeAt(i);
  }
  return buf;
};

/**
 * Edge-compatible JWT verification using native Web Crypto API (no Node.js crypto needed)
 */
const verifyJwt = async (token: string, secret: string): Promise<any | null> => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const sigBuf = base64UrlToBuf(signatureB64);
    const keyData = encoder.encode(secret);

    // Import secret key as HMAC SHA-256
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Verify HMAC signature
    const isValid = await crypto.subtle.verify("HMAC", key, sigBuf as any, data as any);
    if (!isValid) return null;

    // Decode and parse payload
    const decodedPayload = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error("Proxy JWT verification exception:", error);
    return null;
  }
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // =============================================================
  // 1. CORS & CSRF Checks for API routes
  // =============================================================
  if (pathname.startsWith("/api/")) {
    // Exclude cron routes from standard CORS/CSRF checks
    if (pathname.startsWith("/api/cron/")) {
      return NextResponse.next();
    }

    const origin = request.headers.get("origin");
    const method = request.method;
    const isProduction = process.env.APP_ENV === "production";
    
    // Whitelisted origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : [];
      
    const host = request.headers.get("host") || "";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const hostOrigin = `${protocol}://${host}`;
    
    // 1.1 CORS Verification
    if (origin && origin !== hostOrigin) {
      if (isProduction && !allowedOrigins.includes(origin)) {
        return new NextResponse(
          JSON.stringify({
            status: false,
            statusCode: 403,
            message: "CORS policy: Access denied.",
            errorCode: "CORS_ERROR",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // 1.2 CSRF/Origin check on state-changing browser requests (POST/PUT/PATCH/DELETE)
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const referer = request.headers.get("referer");
      let isSameOrigin = false;
      
      if (origin) {
        isSameOrigin = origin === hostOrigin || allowedOrigins.includes(origin);
      } else if (referer) {
        try {
          const refererUrl = new URL(referer);
          const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
          isSameOrigin = refererOrigin === hostOrigin || allowedOrigins.includes(refererOrigin);
        } catch (e) {
          isSameOrigin = false;
        }
      } else {
        const hasSession = request.cookies.has("session_token");
        isSameOrigin = !hasSession;
      }
      
      if (!isSameOrigin) {
        return new NextResponse(
          JSON.stringify({
            status: false,
            statusCode: 403,
            message: "CSRF policy: Invalid request origin.",
            errorCode: "CSRF_ERROR",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
    
    return NextResponse.next();
  }

  // =============================================================
  // 2. Auth redirect logic for Page routes
  // =============================================================
  const sessionToken = request.cookies.get("session_token")?.value;
  let decodedToken = null;
  if (sessionToken) {
    decodedToken = await verifyJwt(sessionToken, JWT_SECRET);
  }

  const isAuthenticated = !!decodedToken;
  const isLoginPage = pathname === "/login";

  if (!isAuthenticated) {
    // Allow unauthenticated users to access / and /login.
    // Redirect them to /login if they attempt to access protected pages (like /dashboard).
    if (pathname !== "/" && !isLoginPage) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  } else {
    // If authenticated and trying to access /login or root /, redirect to dashboard
    if (isLoginPage || pathname === "/") {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (Next.js static build outputs)
     * - _next/image (Next.js image optimization)
     * - favicon.ico (Favicon asset)
     * - test-ui (Manual testing page)
     */
    "/((?!_next/static|_next/image|favicon.ico|test-ui).*)",
  ],
};

