import { Redis } from "@upstash/redis";

export type Status = "playing" | "problem" | "idle";

export type SeasonConfig = {
  id: string;
  seasonLabel: string;
  title: string;
  subtitle: string;
  location: string;
  startTime: string;
  players: string[];
  joker: string | null;
  playersPerDay: number;
  days: { date: string; weekNumber: number }[];
};

export type SchedulePlayer = {
  name: string;
  status: Status;
};

export type ScheduleDay = {
  date: string;
  weekNumber: number;
  dayLabel: string;
  displayDate: string;
  players: SchedulePlayer[];
};

const SEASON_KEY = "domstad-season-v1";
const STATUS_KEY = "domstad-availability-v1";

const DEFAULT_PLAYERS = ["Sjoerd", "Sebas", "Robert", "Danny", "Jelmer", "Michel", "Wouter"];
const DEFAULT_JOKER = "Wouter";
const DEFAULT_PLAYERS_PER_DAY = 4;

const DEFAULT_SEED: { date: string; playing: string[] }[] = [
  { date: "2026-10-01", playing: ["Sjoerd", "Robert", "Jelmer", "Michel"] },
  { date: "2026-10-08", playing: ["Sjoerd", "Sebas", "Danny", "Michel"] },
  { date: "2026-10-15", playing: ["Sebas", "Robert", "Danny", "Jelmer"] },
  { date: "2026-10-22", playing: ["Sebas", "Danny", "Jelmer", "Michel"] },
  { date: "2026-10-29", playing: ["Sjoerd", "Sebas", "Robert", "Michel"] },
  { date: "2026-11-05", playing: ["Sjoerd", "Robert", "Danny", "Jelmer"] },
  { date: "2026-11-12", playing: ["Sebas", "Robert", "Danny", "Michel"] },
  { date: "2026-11-19", playing: ["Sjoerd", "Sebas", "Robert", "Jelmer"] },
  { date: "2026-11-26", playing: ["Sjoerd", "Danny", "Jelmer", "Michel"] },
  { date: "2026-12-03", playing: ["Sjoerd", "Sebas", "Danny", "Jelmer"] },
  { date: "2026-12-10", playing: ["Sebas", "Robert", "Jelmer", "Michel"] },
  { date: "2026-12-17", playing: ["Sjoerd", "Robert", "Danny", "Michel"] },
  { date: "2027-01-07", playing: ["Sjoerd", "Sebas", "Jelmer", "Michel"] },
  { date: "2027-01-14", playing: ["Robert", "Danny", "Jelmer", "Michel"] },
  { date: "2027-01-21", playing: ["Sjoerd", "Sebas", "Robert", "Danny"] },
  { date: "2027-01-28", playing: ["Sebas", "Robert", "Danny", "Jelmer"] },
  { date: "2027-02-04", playing: ["Sjoerd", "Sebas", "Danny", "Michel"] },
  { date: "2027-02-11", playing: ["Sjoerd", "Robert", "Jelmer", "Michel"] },
  { date: "2027-02-18", playing: ["Sebas", "Robert", "Danny", "Michel"] },
  { date: "2027-02-25", playing: ["Sjoerd", "Sebas", "Robert", "Jelmer"] },
  { date: "2027-03-04", playing: ["Sjoerd", "Danny", "Jelmer", "Michel"] },
  { date: "2027-03-11", playing: ["Sjoerd", "Robert", "Danny", "Jelmer"] },
  { date: "2027-03-18", playing: ["Sebas", "Robert", "Jelmer", "Michel"] },
];

function getIsoWeek(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function buildDefaultSeason(): SeasonConfig {
  return {
    id: "blaashal-2026-2027",
    seasonLabel: "Winter competitie",
    title: "Blaashal 2026/2027",
    subtitle: "donderdag 21:00 · baan 5",
    location: "Baan 5, T.C. Domstad",
    startTime: "21:00",
    players: DEFAULT_PLAYERS,
    joker: DEFAULT_JOKER,
    playersPerDay: DEFAULT_PLAYERS_PER_DAY,
    days: DEFAULT_SEED.map((entry) => ({
      date: entry.date,
      weekNumber: getIsoWeek(new Date(`${entry.date}T12:00:00`)),
    })),
  };
}

function buildDefaultStatusState(): Record<string, Status> {
  const state: Record<string, Status> = {};

  for (const entry of DEFAULT_SEED) {
    for (const player of DEFAULT_PLAYERS) {
      state[`${entry.date}|${player}`] = entry.playing.includes(player) ? "playing" : "idle";
    }
  }

  return state;
}

const globalState = globalThis as typeof globalThis & {
  __domstadSeason?: SeasonConfig;
  __domstadAvailability?: Record<string, Status>;
};

async function getRedisClient(): Promise<Redis | null> {
  const url = process.env.KV_URL;
  const token = process.env.KV_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

export async function getSeason(): Promise<SeasonConfig> {
  const redis = await getRedisClient();

  if (redis) {
    const existing = await redis.get<SeasonConfig>(SEASON_KEY);

    if (existing) {
      return existing;
    }

    const seeded = buildDefaultSeason();
    await redis.set(SEASON_KEY, seeded);
    return seeded;
  }

  if (!globalState.__domstadSeason) {
    globalState.__domstadSeason = buildDefaultSeason();
  }

  return globalState.__domstadSeason;
}

async function persistState(state: Record<string, Status>): Promise<void> {
  const redis = await getRedisClient();

  if (redis) {
    await redis.set(STATUS_KEY, state);
    return;
  }

  globalState.__domstadAvailability = state;
}

async function ensureState(): Promise<Record<string, Status>> {
  const redis = await getRedisClient();

  if (redis) {
    const existing = (await redis.get<Record<string, Status>>(STATUS_KEY)) ?? {};

    if (Object.keys(existing).length === 0) {
      const seeded = buildDefaultStatusState();
      await redis.set(STATUS_KEY, seeded);
      return seeded;
    }

    return existing;
  }

  if (!globalState.__domstadAvailability) {
    globalState.__domstadAvailability = buildDefaultStatusState();
  }

  return globalState.__domstadAvailability;
}

export async function getStatusMap(): Promise<Record<string, Status>> {
  const state = await ensureState();

  if (!globalState.__domstadAvailability) {
    globalState.__domstadAvailability = state;
  }

  return state;
}

export async function saveSeason(season: SeasonConfig, statusState: Record<string, Status>): Promise<void> {
  const redis = await getRedisClient();

  if (redis) {
    await redis.set(SEASON_KEY, season);
    await redis.set(STATUS_KEY, statusState);
    return;
  }

  globalState.__domstadSeason = season;
  globalState.__domstadAvailability = statusState;
}

export async function updatePlayerStatus(date: string, player: string, status: Status): Promise<Status> {
  const season = await getSeason();

  if (!season.days.some((day) => day.date === date)) {
    throw new Error("Invalid schedule date");
  }

  if (!season.players.includes(player)) {
    throw new Error("Player is not part of the current season");
  }

  const state = await getStatusMap();
  const countPlaying = () =>
    season.players.filter((teammate) => state[`${date}|${teammate}`] === "playing").length;

  let resolvedStatus = status;

  if (status === "problem") {
    // Only the player whose toggle drops the day from complete to
    // incomplete is flagged red; toggling off an already-incomplete day
    // just clears back to idle.
    const wasComplete = countPlaying() >= season.playersPerDay;
    resolvedStatus = wasComplete ? "problem" : "idle";
  }

  state[`${date}|${player}`] = resolvedStatus;

  if (resolvedStatus === "playing" && countPlaying() >= season.playersPerDay) {
    for (const teammate of season.players) {
      const key = `${date}|${teammate}`;
      if (state[key] === "problem") {
        state[key] = "idle";
      }
    }
  }

  await persistState(state);

  return resolvedStatus;
}

export async function getScheduleOverview(): Promise<{ season: SeasonConfig; days: ScheduleDay[] }> {
  const season = await getSeason();
  const state = await getStatusMap();

  const days = season.days.map((day) => {
    const players: SchedulePlayer[] = season.players.map((player) => ({
      name: player,
      status: state[`${day.date}|${player}`] ?? "idle",
    }));

    const dateValue = new Date(`${day.date}T12:00:00`);

    return {
      date: day.date,
      weekNumber: day.weekNumber,
      dayLabel: new Intl.DateTimeFormat("nl-NL", {
        weekday: "long",
        timeZone: "Europe/Amsterdam",
      }).format(dateValue),
      displayDate: new Intl.DateTimeFormat("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Europe/Amsterdam",
      }).format(dateValue),
      players,
    };
  });

  return { season, days };
}

// --- Season generator (used by the /panel admin tool) ---

export type GenerateSeasonInput = {
  seasonLabel: string;
  title: string;
  subtitle: string;
  location: string;
  startTime: string;
  weekday: number; // 0 = Sunday .. 6 = Saturday, matches Date#getDay()
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  skipDates: string[]; // yyyy-mm-dd entries to exclude (e.g. holidays)
  players: string[];
  playersPerDay: number;
  joker: string | null;
};

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function enumerateWeekdayDates(startDate: string, endDate: string, weekday: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (cursor.getDay() !== weekday && cursor <= end) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "seizoen"
  );
}

function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function generateFairRotation(
  players: string[],
  days: { date: string }[],
  playersPerDay: number,
): Record<string, Status> {
  const counts = new Map(players.map((player) => [player, 0]));
  const state: Record<string, Status> = {};

  days.forEach((day, index) => {
    const shuffled = seededShuffle(players, index + 1);
    const ranked = [...shuffled].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
    const playing = new Set(ranked.slice(0, playersPerDay));

    for (const player of players) {
      const isPlaying = playing.has(player);
      state[`${day.date}|${player}`] = isPlaying ? "playing" : "idle";

      if (isPlaying) {
        counts.set(player, (counts.get(player) ?? 0) + 1);
      }
    }
  });

  return state;
}

export function generateSeason(input: GenerateSeasonInput): SeasonConfig {
  const dates = enumerateWeekdayDates(input.startDate, input.endDate, input.weekday).filter(
    (date) => !input.skipDates.includes(date),
  );

  const days = dates.map((date) => ({
    date,
    weekNumber: getIsoWeek(new Date(`${date}T12:00:00`)),
  }));

  const orderedPlayers = input.joker
    ? [...input.players.filter((name) => name !== input.joker), input.joker]
    : input.players;

  return {
    id: `${slugify(input.title)}-${Date.now()}`,
    seasonLabel: input.seasonLabel,
    title: input.title,
    subtitle: input.subtitle,
    location: input.location,
    startTime: input.startTime,
    players: orderedPlayers,
    joker: input.joker,
    playersPerDay: input.playersPerDay,
    days,
  };
}
