"use client";

import { useActionState } from "react";

import { login } from "@/app/actions/panel-auth";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold text-[#252525]">
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="w-full rounded-full border border-[#d9c9c2] bg-white px-3.5 py-2 text-sm text-[#1e1e1e] outline-none focus:border-[#1d1d1b]"
        />
      </div>

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center rounded-full border border-[#1d1d1b] bg-[#1d1d1b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
