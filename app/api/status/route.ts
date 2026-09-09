import { NextResponse } from "next/server";

import { scheduleIncompleteCheck } from "@/app/lib/notify";
import { getSeason, getStatusMap, updatePlayerStatus, type Status } from "@/app/lib/schedule";

const VALID_STATUSES = new Set<Status>(["playing", "problem", "idle"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date?: string;
      player?: string;
      status?: string;
    };

    const { date, player, status } = body;

    if (!date || !player || !status) {
      return NextResponse.json(
        { error: "date, player and status are required" },
        { status: 400 },
      );
    }

    const season = await getSeason();

    if (!season.days.some((day) => day.date === date)) {
      return NextResponse.json({ error: "date is not part of the schedule" }, { status: 400 });
    }

    if (!season.players.includes(player)) {
      return NextResponse.json({ error: "player is not part of the team" }, { status: 400 });
    }

    if (!VALID_STATUSES.has(status as Status)) {
      return NextResponse.json({ error: "status must be playing, problem or idle" }, { status: 400 });
    }

    const result = await updatePlayerStatus(date, player, status as Status);

    try {
      const statusMap = await getStatusMap();
      const playingCount = season.players.filter(
        (teammate) => statusMap[`${date}|${teammate}`] === "playing",
      ).length;

      if (playingCount < season.playersPerDay) {
        await scheduleIncompleteCheck(date);
      }
    } catch (notifyError) {
      console.error("Failed to schedule incomplete-day check", notifyError);
    }

    return NextResponse.json({ ok: true, date, player, status: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
