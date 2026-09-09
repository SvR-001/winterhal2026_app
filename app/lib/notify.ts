import "server-only";

import { Client as QStashClient } from "@upstash/qstash";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";

import type { ScheduleDay, SeasonConfig } from "@/app/lib/schedule";

const CHECK_DELAY_SECONDS = 5 * 60;
const NOTIFIED_TTL_SECONDS = 10 * 60;
const NOTIFIED_KEY_PREFIX = "notify-sent:";

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}

function getRedisClient(): Redis | null {
  const url = process.env.KV_URL;
  const token = process.env.KV_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

// Schedules a one-off check via QStash: "is this date still short-handed in
// 5 minutes?" Silently no-ops if QStash/base-URL aren't configured (e.g.
// local dev) — this feature is optional, not required for the board to work.
export async function scheduleIncompleteCheck(date: string): Promise<void> {
  const token = process.env.QSTASH_TOKEN;
  const baseUrl = process.env.APP_BASE_URL;

  if (!token || !baseUrl) {
    return;
  }

  const client = new QStashClient({ token });

  await client.publishJSON({
    url: `${baseUrl}/api/notify/check-incomplete`,
    body: { date },
    delay: CHECK_DELAY_SECONDS,
  });
}

export async function wasRecentlyNotified(date: string): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  const value = await redis.get(`${NOTIFIED_KEY_PREFIX}${date}`);
  return value !== null;
}

export async function markNotified(date: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  await redis.set(`${NOTIFIED_KEY_PREFIX}${date}`, "1", { ex: NOTIFIED_TTL_SECONDS });
}

export async function sendIncompleteEmail(params: {
  season: SeasonConfig;
  day: ScheduleDay;
  greenCount: number;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;

  if (!apiKey || !to) {
    return;
  }

  const { season, day, greenCount } = params;
  const needed = Math.max(0, season.playersPerDay - greenCount);
  const boardUrl = process.env.APP_BASE_URL ?? "";
  const notPlaying = day.players.filter((player) => player.status !== "playing").map((player) => player.name);

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "T.C. Domstad bord <onboarding@resend.dev>",
    to,
    subject: `⚠️ ${formatDateLabel(day.date)} nog niet compleet — ${season.title}`,
    text: [
      `${formatDateLabel(day.date)} is 5 minuten na de laatste wijziging nog steeds niet compleet.`,
      `Status: ${greenCount}/${season.playersPerDay} — nog ${needed} nodig.`,
      notPlaying.length > 0 ? `Nog niet spelend: ${notPlaying.join(", ")}.` : "",
      "",
      `Bekijk het bord: ${boardUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
