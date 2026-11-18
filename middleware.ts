import { NextRequest, NextResponse } from "next/server";
import { isTrustedHost, isTrustedRequest } from "@/lib/security/request-guard";

function rejected(status: number, code: string, message: string, isApiRequest: boolean) {
  const headers = { "Cache-Control": "no-store" };
  if (isApiRequest) {
    return NextResponse.json({ error: { code, message } }, { status, headers });
  }
  const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${code} · OnSite</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f3;color:#202820;font:16px/1.5 system-ui,sans-serif}
      main{max-width:440px;margin:24px;padding:32px;border:1px solid #dfe5dc;border-radius:20px;background:#fff}
      p{color:#5d685d}a{color:#226d46;font-weight:600}
    </style>
  </head>
  <body><main><p>ONSITE · REQUEST BLOCKED</p><h1>This request can’t be completed</h1><p>${message}</p><a href="/">Return to OnSite</a></main></body>
</html>`;
  return new NextResponse(page, {
    status,
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" }
  });
}

export function middleware(request: NextRequest) {
  const appOrigin =
    process.env.APP_ORIGIN ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : null);
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (!appOrigin) {
    return rejected(
      503,
      "APP_ORIGIN_REQUIRED",
      "OnSite is not configured for this domain.",
      isApiRequest
    );
  }

  if (!isTrustedHost(request.headers.get("host"), appOrigin)) {
    return rejected(421, "UNTRUSTED_HOST", "This host is not served by OnSite.", isApiRequest);
  }

  if (!isTrustedRequest(request.method, request.headers.get("origin"), appOrigin)) {
    return rejected(403, "UNTRUSTED_ORIGIN", "This request origin is not allowed.", isApiRequest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
