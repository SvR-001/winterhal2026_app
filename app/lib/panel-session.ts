import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE_NAME, SESSION_DURATION_MS, encryptSession, verifySessionToken } from "@/app/lib/session-token";

export async function createPanelSession(): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encryptSession(expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deletePanelSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// DAL-style guard: call at the top of any protected Server Component or
// Server Action. Redirects to the login page when there is no valid session
// — this is the real (non-optimistic) authorization check; proxy.ts only
// does a fast pre-check on the cookie for UX.
export const verifyPanelSession = cache(async (): Promise<void> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await verifySessionToken(token);

  if (!isValid) {
    redirect("/panel/login");
  }
});
