import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { getSessionByToken } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionByToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  return Response.json(
    {
      user: session?.user ?? null,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
