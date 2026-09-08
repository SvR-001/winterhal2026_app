import { NextResponse } from "next/server";

import { getScheduleOverview } from "@/app/lib/schedule";

export async function GET() {
  const { season, days } = await getScheduleOverview();

  return NextResponse.json({
    schedule: days,
    players: season.players,
    joker: season.joker,
    playersPerDay: season.playersPerDay,
    seasonLabel: season.seasonLabel,
    title: season.title,
    subtitle: season.subtitle,
    location: season.location,
    startTime: season.startTime,
  });
}
