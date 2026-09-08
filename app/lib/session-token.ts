import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "panel_session";
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecretKey() {
  const secret = process.env.PANEL_SESSION_SECRET;

  if (!secret) {
    throw new Error("PANEL_SESSION_SECRET is not set");
  }

  return new TextEncoder().encode(secret);
}

export async function encryptSession(expiresAt: Date): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return payload.authenticated === true;
  } catch {
    return false;
  }
}
