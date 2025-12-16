import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { NextResponse } from "next/server";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_ISSUERS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const OUR_JWT_SECRET = new TextEncoder().encode(process.env.OUR_JWT_SECRET!);

async function verifyGoogleIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: GOOGLE_CLIENT_ID,
  });
  if (!GOOGLE_ISSUERS.has(String(payload.iss))) {
    throw new Error("Invalid issuer");
  }
  if (payload.email_verified !== true) {
    throw new Error("Email not verified");
  }

  return payload;
}

async function issueOurJwt(params: { userId: string; email: string }) {
  return new SignJWT({ email: params.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("bookmaker")
    .setAudience("bookmaker-web")
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime("3h") // 3h
    .sign(OUR_JWT_SECRET);
}

export async function POST(req: Request) {
  try {
    const { id_token } = (await req.json()) as { id_token?: string };
    if (!id_token) {
      return NextResponse.json(
        { error: "Missing id_token", ok: false },
        { status: 400 },
      );
    }
    // Verify id token
    const payload = await verifyGoogleIdToken(id_token);
    const userId = String(payload.sub);
    const email = String(payload.email);
    const jwt = await issueOurJwt({ userId, email });
    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set("bookmaker_auth", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 3, // 3 hours
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { error: "Invalid credentials", ok: false },
      { status: 401 },
    );
  }
}
