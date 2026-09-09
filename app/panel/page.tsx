import type { Metadata } from "next";

import { logout } from "@/app/actions/panel-auth";
import { verifyPanelSession } from "@/app/lib/panel-session";
import { getSeason } from "@/app/lib/schedule";

import GeneratorForm from "./GeneratorForm";
import QuickEditForm from "./QuickEditForm";

export const metadata: Metadata = {
  title: "Beheerpaneel",
};

export default async function PanelPage() {
  await verifyPanelSession();
  const season = await getSeason();

  const corePlayers = season.joker
    ? season.players.filter((name) => name !== season.joker)
    : season.players;
  const firstDay = season.days[0]?.date ?? "";
  const lastDay = season.days[season.days.length - 1]?.date ?? "";
  const weekday = firstDay ? new Date(`${firstDay}T12:00:00`).getDay() : 4;

  return (
    <main className="min-h-screen bg-[#f5f3ef] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#1d1d1b]">Beheerpaneel</h1>
            <p className="text-sm text-[#6b6b6b]">Huidig actief seizoen: {season.title}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="shrink-0 rounded-full border border-[#1d1d1b] px-3 py-1.5 text-xs font-semibold text-[#1d1d1b] transition hover:bg-[#1d1d1b] hover:text-white"
            >
              Uitloggen
            </button>
          </form>
        </div>

        <QuickEditForm
          defaultSeasonLabel={season.seasonLabel}
          defaultTitle={season.title}
          defaultSubtitle={season.subtitle}
          defaultLocation={season.location}
          defaultStartTime={season.startTime}
        />

        <h2 className="mb-3 text-lg font-black text-[#1d1d1b]">Nieuw seizoen genereren</h2>
        <GeneratorForm
          defaultSeasonLabel={season.seasonLabel}
          defaultTitle={season.title}
          defaultSubtitle={season.subtitle}
          defaultLocation={season.location}
          defaultStartTime={season.startTime}
          defaultWeekday={weekday}
          defaultStartDate={firstDay}
          defaultEndDate={lastDay}
          defaultPlayers={corePlayers.join("\n")}
          defaultJoker={season.joker ?? ""}
          defaultPlayersPerDay={season.playersPerDay}
        />
      </div>
    </main>
  );
}
