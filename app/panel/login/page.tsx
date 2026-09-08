import type { Metadata } from "next";

import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Panel inloggen",
};

export default function PanelLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ef] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#e2d5c8] bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-black text-[#1d1d1b]">Beheerpaneel</h1>
        <p className="mb-5 text-sm text-[#6b6b6b]">Log in om een nieuw seizoen te genereren.</p>
        <LoginForm />
      </div>
    </main>
  );
}
