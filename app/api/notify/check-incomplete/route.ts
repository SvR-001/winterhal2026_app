import { Receiver } from "@upstash/qstash";
import { NextResponse } from "next/server";

import { markNotified, sendIncompleteEmail, wasRecentlyNotified } from "@/app/lib/notify";
import { getScheduleOverview } from "@/app/lib/schedule";

async function verifyRequest(signature: string | null, body: string): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signature || !currentSigningKey || !nextSigningKey) {
    return false;
  }

  const receiver = new Receiver({ currentSigningKey, nextSigningKey });

  try {
    return await receiver.verify({ signature, body });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("upstash-signature");
  const isValid = await verifyRequest(signature, body);

  if (!isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const { date } = JSON.parse(body) as { date?: string };

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const { season, days } = await getScheduleOverview();
  const day = days.find((entry) => entry.date === date);

  if (!day) {
    return NextResponse.json({ ok: true, skipped: "unknown date" });
  }

  const greenCount = day.players.filter((player) => player.status === "playing").length;

  if (greenCount >= season.playersPerDay) {
    return NextResponse.json({ ok: true, skipped: "complete" });
  }

  if (await wasRecentlyNotified(date)) {
    return NextResponse.json({ ok: true, skipped: "already notified" });
  }

  await sendIncompleteEmail({ season, day, greenCount });
  await markNotified(date);

  return NextResponse.json({ ok: true, sent: true });
}
