"use client";

import { useActionState } from "react";

import { updateSeasonDetailsAction } from "@/app/actions/panel";

type Props = {
  defaultSeasonLabel: string;
  defaultTitle: string;
  defaultSubtitle: string;
  defaultLocation: string;
  defaultStartTime: string;
};

const inputClass =
  "w-full rounded-xl border border-[#d9c9c2] bg-white px-3.5 py-2 text-sm text-[#1e1e1e] outline-none focus:border-[#1d1d1b]";
const labelClass = "mb-1 block text-sm font-semibold text-[#252525]";

export default function QuickEditForm(props: Props) {
  const [state, formAction, pending] = useActionState(updateSeasonDetailsAction, undefined);

  return (
    <form
      action={formAction}
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#e2d5c8] bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#6b6b6b]">Snel bewerken</h2>
        <p className="text-xs text-[#8a8a8a]">
          Past alleen de tekst aan (naam, tijd, locatie) — laat speeldagen, spelers en ieders
          beschikbaarheid ongemoeid.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="qe-seasonLabel">
            Label (klein bovenschrift)
          </label>
          <input
            id="qe-seasonLabel"
            name="seasonLabel"
            defaultValue={props.defaultSeasonLabel}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="qe-title">
            Titel
          </label>
          <input id="qe-title" name="title" defaultValue={props.defaultTitle} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="qe-subtitle">
            Subtitel
          </label>
          <input
            id="qe-subtitle"
            name="subtitle"
            defaultValue={props.defaultSubtitle}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="qe-location">
            Locatie
          </label>
          <input
            id="qe-location"
            name="location"
            defaultValue={props.defaultLocation}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="qe-startTime">
            Starttijd
          </label>
          <input
            id="qe-startTime"
            name="startTime"
            type="time"
            defaultValue={props.defaultStartTime}
            required
            className={inputClass}
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Opgeslagen.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center self-start rounded-full border border-[#1d1d1b] bg-[#1d1d1b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Opslaan"}
      </button>
    </form>
  );
}
