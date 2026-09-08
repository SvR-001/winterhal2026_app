"use server";

import { redirect } from "next/navigation";

import { createPanelSession, deletePanelSession } from "@/app/lib/panel-session";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Vul een wachtwoord in." };
  }

  const expected = process.env.PANEL_PASSWORD;

  if (!expected) {
    return { error: "PANEL_PASSWORD is niet ingesteld op de server." };
  }

  if (password !== expected) {
    return { error: "Onjuist wachtwoord." };
  }

  await createPanelSession();
  redirect("/panel");
}

export async function logout(): Promise<void> {
  await deletePanelSession();
  redirect("/panel/login");
}
