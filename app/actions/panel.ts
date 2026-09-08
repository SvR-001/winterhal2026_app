"use server";

import { redirect } from "next/navigation";

import { verifyPanelSession } from "@/app/lib/panel-session";
import {
  generateFairRotation,
  generateSeason,
  saveSeason,
  type GenerateSeasonInput,
  type Status,
} from "@/app/lib/schedule";

export type GenerateSeasonState = { error?: string } | undefined;

function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function generateSeasonAction(
  _prevState: GenerateSeasonState,
  formData: FormData,
): Promise<GenerateSeasonState> {
  await verifyPanelSession();

  const seasonLabel = String(formData.get("seasonLabel") ?? "").trim() || "Seizoen";
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const weekday = Number(formData.get("weekday"));
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const skipDates = parseLines(String(formData.get("skipDates") ?? ""));
  const corePlayers = parseLines(String(formData.get("players") ?? ""));
  const playersPerDay = Number(formData.get("playersPerDay"));
  const jokerRaw = String(formData.get("joker") ?? "").trim();
  const joker = jokerRaw.length > 0 ? jokerRaw : null;

  if (!title || !subtitle || !location || !startTime) {
    return { error: "Vul titel, subtitel, locatie en starttijd in." };
  }

  if (!startDate || !endDate || endDate < startDate) {
    return { error: "Vul een geldige start- en einddatum in (einddatum na startdatum)." };
  }

  if (Number.isNaN(weekday) || weekday < 0 || weekday > 6) {
    return { error: "Kies een geldige dag van de week." };
  }

  const uniqueCorePlayers = Array.from(new Set(corePlayers));

  if (uniqueCorePlayers.length < 2) {
    return { error: "Voeg minstens twee vaste spelers toe (één per regel)." };
  }

  if (joker && uniqueCorePlayers.includes(joker)) {
    return { error: "De joker moet een aparte naam zijn, niet ook in de vaste spelerslijst." };
  }

  if (!Number.isInteger(playersPerDay) || playersPerDay < 1 || playersPerDay >= uniqueCorePlayers.length) {
    return { error: "Spelers per avond moet minstens 1 zijn en minder dan het aantal vaste spelers." };
  }

  const allPlayers = joker ? [...uniqueCorePlayers, joker] : uniqueCorePlayers;

  const input: GenerateSeasonInput = {
    seasonLabel,
    title,
    subtitle,
    location,
    startTime,
    weekday,
    startDate,
    endDate,
    skipDates,
    players: allPlayers,
    playersPerDay,
    joker,
  };

  const season = generateSeason(input);

  if (season.days.length === 0) {
    return { error: "Er vallen geen speeldagen in de opgegeven periode voor die dag van de week." };
  }

  const statusState: Record<string, Status> = generateFairRotation(
    uniqueCorePlayers,
    season.days,
    playersPerDay,
  );

  if (joker) {
    for (const day of season.days) {
      statusState[`${day.date}|${joker}`] = "idle";
    }
  }

  await saveSeason(season, statusState);

  redirect("/?generated=1");
}
