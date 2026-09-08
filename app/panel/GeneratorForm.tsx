"use client";

import { useActionState } from "react";

import { generateSeasonAction } from "@/app/actions/panel";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "zondag" },
  { value: 1, label: "maandag" },
  { value: 2, label: "dinsdag" },
  { value: 3, label: "woensdag" },
  { value: 4, label: "donderdag" },
  { value: 5, label: "vrijdag" },
  { value: 6, label: "zaterdag" },
];

type Props = {
  defaultSeasonLabel: string;
  defaultTitle: string;
  defaultSubtitle: string;
  defaultLocation: string;
  defaultStartTime: string;
  defaultWeekday: number;
  defaultStartDate: string;
  defaultEndDate: string;
  defaultPlayers: string;
  defaultJoker: string;
  defaultPlayersPerDay: number;
};

const inputClass =
  "w-full rounded-xl border border-[#d9c9c2] bg-white px-3.5 py-2 text-sm text-[#1e1e1e] outline-none focus:border-[#1d1d1b]";
const labelClass = "mb-1 block text-sm font-semibold text-[#252525]";

export default function GeneratorForm(props: Props) {
  const [state, formAction, pending] = useActionState(generateSeasonAction, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-[#e2d5c8] bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="seasonLabel">
            Label (klein bovenschrift)
          </label>
          <input
            id="seasonLabel"
            name="seasonLabel"
            defaultValue={props.defaultSeasonLabel}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="title">
            Titel
          </label>
          <input id="title" name="title" defaultValue={props.defaultTitle} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="subtitle">
            Subtitel (dag · tijd · locatie)
          </label>
          <input
            id="subtitle"
            name="subtitle"
            defaultValue={props.defaultSubtitle}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="location">
            Locatie (voor agenda-export)
          </label>
          <input
            id="location"
            name="location"
            defaultValue={props.defaultLocation}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="startTime">
            Starttijd
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={props.defaultStartTime}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="weekday">
            Dag van de week
          </label>
          <select id="weekday" name="weekday" defaultValue={props.defaultWeekday} className={inputClass}>
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="startDate">
            Startdatum
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={props.defaultStartDate}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="endDate">
            Einddatum
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={props.defaultEndDate}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="skipDates">
          Data overslaan (vakanties etc., één per regel, yyyy-mm-dd)
        </label>
        <textarea
          id="skipDates"
          name="skipDates"
          rows={2}
          className={inputClass}
          placeholder={"2027-04-15\n2027-05-06"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="players">
            Vaste spelers (één naam per regel)
          </label>
          <textarea
            id="players"
            name="players"
            rows={6}
            defaultValue={props.defaultPlayers}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass} htmlFor="playersPerDay">
              Spelers per avond
            </label>
            <input
              id="playersPerDay"
              name="playersPerDay"
              type="number"
              min={1}
              defaultValue={props.defaultPlayersPerDay}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="joker">
              Joker / invaller (optioneel)
            </label>
            <input
              id="joker"
              name="joker"
              defaultValue={props.defaultJoker}
              className={inputClass}
              placeholder="bijv. Wouter"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          const confirmed = window.confirm(
            "Dit vervangt het huidige actieve seizoen en alle statussen direct voor iedereen. Weet je het zeker?",
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
        className="inline-flex items-center justify-center rounded-full border border-[#e40520] bg-[#e40520] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b80419] disabled:opacity-60"
      >
        {pending ? "Bezig met genereren…" : "Genereer nieuw seizoen"}
      </button>

      <p className="text-xs text-[#8a8a8a]">
        Let op: dit vervangt het huidige actieve seizoen en alle beschikbaarheid-statussen direct voor iedereen.
      </p>
    </form>
  );
}
