import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  assertTrustedOrigin,
  getApplicationConfig,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/config";
import { deleteSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
  } catch {
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  }

  await deleteSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  const response = NextResponse.redirect(
    new URL("/sign-in", getApplicationConfig().baseUrl),
    303,
  );
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
  response.headers.set("cache-control", "no-store");

  return response;
}
