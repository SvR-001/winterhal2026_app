"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { APP_VERSION } from "@/app/lib/version";

type Status = "playing" | "problem" | "idle";

type PlayerStatus = {
  name: string;
  status: Status;
};

type ScheduleDay = {
  date: string;
  weekNumber: number;
  dayLabel: string;
  displayDate: string;
  players: PlayerStatus[];
};

type SeasonMeta = {
  players: string[];
  joker: string | null;
  playersPerDay: number;
  seasonLabel: string;
  title: string;
  subtitle: string;
  location: string;
  startTime: string;
};

const DEFAULT_META: SeasonMeta = {
  players: ["Sjoerd", "Sebas", "Robert", "Danny", "Jelmer", "Michel", "Wouter"],
  joker: "Wouter",
  playersPerDay: 4,
  seasonLabel: "Winter tennis",
  title: "Blaashal 2026/2027",
  subtitle: "donderdag 21:00 · baan 5",
  location: "Baan 5, T.C. Domstad",
  startTime: "21:00",
};

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}

function formatWeekday(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long" }).format(value);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIcsDate(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function toIcsLocalTime(date: Date) {
  return `${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function CalendarExportIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M12 13v5" />
      <path d="m9.5 15.5 2.5 2.5 2.5-2.5" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function openWhatsAppShare(message: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function buildMentionLine(players: PlayerStatus[], excludeName?: string) {
  // Only tag players who haven't responded (idle) — someone already marked
  // "kan niet" (problem/red) shouldn't be asked again.
  const available = players.filter((player) => player.name !== excludeName && player.status === "idle");

  if (available.length === 0) {
    return "";
  }

  const mentions = available.map((player) => `@${player.name}`).join(", ");
  return ` ${mentions}, kan een van jullie?`;
}

// Easter egg: tapping the club logo shows a made-up "fact" about a random player.
const NONSENSE_FACTS = [
  "{name} heeft ooit een tennisbal zo hard geslagen dat hij nu in een baan om de aarde draait.",
  "{name} slaapt elke nacht met een racket onder het kussen, voor de zekerheid.",
  "{name} kan een lob slaan over de Domtoren, maar alleen op dinsdag.",
  "{name} heeft de tiebreak uitgevonden, maar was te bescheiden om het te claimen.",
  "{name} telt schapen in games: 15, 30, 40, game.",
  "{name} heeft ooit een wedstrijd gewonnen zonder één bal te raken. De tegenstander gaf op van bewondering.",
  "{name} ruikt aan nieuwe tennisballen zoals anderen aan wijn.",
  "{name} noemt de blaashal stiekem 'de grote ballon' en zwaait er elke keer naar.",
  "{name} heeft een geheime smash die alleen werkt bij volle maan.",
  "{name} spreekt vloeiend Netpaals, de taal van de netpalen.",
  "Het eerste woordje van {name} werd gezegd tijdens een let: \"Overnieuw!\"",
  "{name} bewaart alle gebroken snaren in een schoenendoos met de naam 'herinneringen'.",
  "{name} warmt zich op door drie keer rond de baan te moonwalken.",
  "{name} is ooit door een bal geraakt en de bal heeft sorry gezegd.",
  "{name} heeft een uitgebreide mening over welk geluid een perfecte volley maakt.",
  "{name} droomt elke woensdagnacht al over donderdagavond.",
  "{name} heeft eens een ace geslagen die zo snel was dat de scheidsrechter hem pas vrijdag zag.",
  "{name} gelooft heilig dat de derde helft de belangrijkste set is.",
  "{name} doet elke wissel een kleine buiging naar het publiek, ook als er geen publiek is.",
  "{name} heeft een racket met een eigen naam: Gerrit.",
];

function pickNonsenseFact(players: string[], previous: string | null) {
  if (players.length === 0) {
    return null;
  }

  // Avoid showing the exact same fact twice in a row.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const name = players[Math.floor(Math.random() * players.length)];
    const template = NONSENSE_FACTS[Math.floor(Math.random() * NONSENSE_FACTS.length)];
    const fact = template.replace("{name}", name);
    if (fact !== previous) {
      return fact;
    }
  }

  return previous;
}

type SeasonalTheme = "sinterklaas" | "kerst" | "vuurwerk";

// Easter egg: decorate the match day closest before Sinterklaas and Christmas, and
// the first match day of the new year. Derived from the schedule so it keeps working
// for any season the panel generates.
function getSeasonalThemes(schedule: ScheduleDay[]) {
  const themes = new Map<string, SeasonalTheme>();
  const dates = schedule.map((day) => day.date).sort();
  if (dates.length === 0) {
    return themes;
  }

  const startYear = Number(dates[0].slice(0, 4));
  const lastOnOrBefore = (limit: string) => dates.filter((date) => date <= limit).at(-1);

  const sinterklaasDate = lastOnOrBefore(`${startYear}-12-05`);
  const kerstDate = lastOnOrBefore(`${startYear}-12-25`);
  const newYearDate = dates.find((date) => date >= `${startYear + 1}-01-01`);

  if (sinterklaasDate && sinterklaasDate >= `${startYear}-11-28`) {
    themes.set(sinterklaasDate, "sinterklaas");
  }
  if (kerstDate && kerstDate >= `${startYear}-12-06` && !themes.has(kerstDate)) {
    themes.set(kerstDate, "kerst");
  }
  if (newYearDate) {
    themes.set(newYearDate, "vuurwerk");
  }

  return themes;
}

const PEPERNOTEN_POSITIONS = [
  { left: "8%", top: "70%", size: 7, rotate: 10 },
  { left: "24%", top: "82%", size: 6, rotate: -20 },
  { left: "41%", top: "68%", size: 8, rotate: 35 },
  { left: "55%", top: "84%", size: 6, rotate: 0 },
  { left: "63%", top: "60%", size: 7, rotate: -15 },
  { left: "74%", top: "80%", size: 8, rotate: 25 },
  { left: "86%", top: "66%", size: 6, rotate: -30 },
  { left: "93%", top: "85%", size: 7, rotate: 5 },
];

const FIREWORK_SPARKS = [
  { right: "2.4rem", top: "55%", color: "#facc15", delay: "0s" },
  { right: "0.6rem", top: "40%", color: "#f472b6", delay: "0.5s" },
  { right: "3.6rem", top: "75%", color: "#60a5fa", delay: "1s" },
  { right: "1.4rem", top: "85%", color: "#34d399", delay: "0.8s" },
];

function SeasonalDecoration({ theme }: { theme: SeasonalTheme }) {
  if (theme === "sinterklaas") {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {PEPERNOTEN_POSITIONS.map((nut, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-[#c98a4b] shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.25)]"
            style={{
              left: nut.left,
              top: nut.top,
              width: nut.size,
              height: nut.size - 1,
              transform: `rotate(${nut.rotate}deg)`,
            }}
          />
        ))}
      </div>
    );
  }

  if (theme === "kerst") {
    return (
      <div className="pointer-events-none absolute bottom-1 right-3 flex items-end" aria-hidden="true">
        <span className="animate-twinkle mb-5 mr-0.5 text-[10px] text-yellow-300">✦</span>
        <span className="text-2xl leading-none">🎄</span>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="absolute bottom-1 right-3 text-2xl leading-none">🎆</span>
      {FIREWORK_SPARKS.map((spark, index) => (
        <span
          key={index}
          className="animate-firework absolute h-1.5 w-1.5 rounded-full"
          style={{
            right: spark.right,
            top: spark.top,
            backgroundColor: spark.color,
            boxShadow: `0 0 6px ${spark.color}`,
            animationDelay: spark.delay,
          }}
        />
      ))}
    </div>
  );
}

function TableExportIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="13" rx="1.5" />
      <line x1="3" y1="8.5" x2="21" y2="8.5" />
      <line x1="9" y1="3" x2="9" y2="16" />
      <line x1="15" y1="3" x2="15" y2="16" />
      <path d="M12 17v4" />
      <path d="m9.5 19 2.5 2 2.5-2" />
    </svg>
  );
}

async function buildAndDownloadScheduleExcel(schedule: ScheduleDay[], meta: SeasonMeta) {
  const ExcelJS = (await import("exceljs")).default;

  const players = meta.players;
  const corePlayerCount = meta.joker ? players.length - 1 : players.length;
  const columns = ["Wk", "Datum", "Dag", ...players];
  const lastCol = columns.length;

  const RED = "FFC8102E";
  const BLACK = "FF1B1B1F";
  const GREEN = "FF1E8F5F";
  const GRAY_CELL = "FFF1F2F4";
  const ROW_ALT = "FFFBF7F2";
  const WHITE = "FFFFFFFF";
  const DARK_RED = "FF8C0B20";
  const FOOTNOTE_GRAY = "FF6B6F76";
  const BORDER_COLOR = "FFD8DAE0";
  const thinBorder = { style: "thin" as const, color: { argb: BORDER_COLOR } };
  const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Schema", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 4, showGridLines: false }],
  });

  sheet.columns = columns.map((_, index) =>
    index === 0 ? { width: 6 } : index === 1 ? { width: 13 } : index === 2 ? { width: 12 } : {},
  );

  sheet.mergeCells(1, 1, 1, lastCol);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `T.C. Domstad — ${meta.title}`;
  titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastCol);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = meta.subtitle;
  subtitleCell.font = { name: "Calibri", size: 11, color: { argb: WHITE } };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 19.5;

  sheet.getRow(3).height = 6;

  const headerRow = sheet.getRow(4);
  headerRow.height = 21.75;
  columns.forEach((label, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = label;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = allBorders;
  });

  schedule.forEach((day, dayIndex) => {
    const row = sheet.getRow(5 + dayIndex);
    const rowFill = dayIndex % 2 === 0 ? WHITE : ROW_ALT;

    const wkCell = row.getCell(1);
    wkCell.value = day.weekNumber;
    const dateCell = row.getCell(2);
    dateCell.value = new Date(`${day.date}T12:00:00`);
    dateCell.numFmt = "dd\\-mm\\-yyyy";
    const dayCell = row.getCell(3);
    dayCell.value = formatWeekday(day.date);

    [wkCell, dateCell, dayCell].forEach((cell, index) => {
      cell.font = { name: "Calibri", size: 10.5, bold: index < 2, color: { argb: BLACK } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = allBorders;
    });

    players.forEach((name, playerIndex) => {
      const cell = row.getCell(4 + playerIndex);
      const isPlaying = day.players.some((member) => member.name === name && member.status === "playing");
      cell.value = isPlaying ? "speelt" : null;
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isPlaying ? GREEN : GRAY_CELL } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = allBorders;
    });
  });

  const totalsRowIndex = 5 + schedule.length;
  const totalsRow = sheet.getRow(totalsRowIndex);
  totalsRow.height = 21.75;
  sheet.mergeCells(totalsRowIndex, 1, totalsRowIndex, 3);
  const totalsLabelCell = totalsRow.getCell(1);
  totalsLabelCell.value = "Totaal speeldagen";
  totalsLabelCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
  totalsLabelCell.alignment = { horizontal: "right", vertical: "middle" };
  for (let col = 1; col <= 3; col += 1) {
    const cell = totalsRow.getCell(col);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_RED } };
    cell.border = allBorders;
  }

  players.forEach((name, playerIndex) => {
    const cell = totalsRow.getCell(4 + playerIndex);
    cell.value = schedule.filter((day) =>
      day.players.some((member) => member.name === name && member.status === "playing"),
    ).length;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_RED } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = allBorders;
  });

  const weekdayLabel = schedule.length > 0 ? formatWeekday(schedule[0].date) : "";

  const footnoteRow1 = totalsRowIndex + 2;
  sheet.mergeCells(footnoteRow1, 1, footnoteRow1, lastCol);
  sheet.getCell(footnoteRow1, 1).value =
    `Elke ${weekdayLabel} om ${meta.startTime} uur speelt dit team op ${meta.location} ` +
    `(${meta.playersPerDay} van de ${corePlayerCount} spelers per week).`;
  sheet.getCell(footnoteRow1, 1).font = { name: "Calibri", size: 9.5, color: { argb: FOOTNOTE_GRAY } };

  const footnoteRow2 = footnoteRow1 + 1;
  sheet.mergeCells(footnoteRow2, 1, footnoteRow2, lastCol);
  const now = new Date();
  const exportedAt = `${formatDateLabel(now.toISOString().slice(0, 10))} om ${pad(now.getHours())}:${pad(now.getMinutes())} uur`;
  sheet.getCell(footnoteRow2, 1).value = `Live export vanuit het beschikbaarheidsbord — gegenereerd op ${exportedAt}.`;
  sheet.getCell(footnoteRow2, 1).font = { name: "Calibri", size: 9.5, color: { argb: FOOTNOTE_GRAY } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tc-domstad-schema-${now.toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildAgendaFile(player: string, schedule: ScheduleDay[], meta: SeasonMeta) {
  const events = schedule
    .filter((day) => day.players.some((member) => member.name === player && member.status === "playing"))
    .map((day) => {
      const start = new Date(`${day.date}T${meta.startTime}:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const compactDate = day.date.replace(/-/g, "");

      return [
        "BEGIN:VEVENT",
        `UID:${day.date}-${player}@tcdomstad`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART;TZID=Europe/Amsterdam:${compactDate}T${toIcsLocalTime(start)}`,
        `DTEND;TZID=Europe/Amsterdam:${compactDate}T${toIcsLocalTime(end)}`,
        `SUMMARY:T.C. Domstad — ${meta.title} - ${player}`,
        `DESCRIPTION:Speelavond ${meta.title}`,
        `LOCATION:${meta.location}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//T.C. Domstad//Availability Board//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export default function HomePage() {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [meta, setMeta] = useState<SeasonMeta>(DEFAULT_META);
  const [isLoading, setIsLoading] = useState(true);
  const [nonsenseFact, setNonsenseFact] = useState<string | null>(null);
  const [logoWiggleKey, setLogoWiggleKey] = useState(0);

  useEffect(() => {
    if (!nonsenseFact) {
      return;
    }

    const timeout = window.setTimeout(() => setNonsenseFact(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [nonsenseFact]);

  const handleLogoClick = () => {
    setNonsenseFact((previous) => pickNonsenseFact(meta.players, previous));
    setLogoWiggleKey((key) => key + 1);
  };

  const getSchedule = useCallback(async () => {
    try {
      const response = await fetch("/api/schedule", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("schedule request failed");
      }

      const payload = await response.json();
      setSchedule(payload.schedule ?? []);
      setMeta({
        players: payload.players ?? DEFAULT_META.players,
        joker: payload.joker ?? null,
        playersPerDay: payload.playersPerDay ?? DEFAULT_META.playersPerDay,
        seasonLabel: payload.seasonLabel ?? DEFAULT_META.seasonLabel,
        title: payload.title ?? DEFAULT_META.title,
        subtitle: payload.subtitle ?? DEFAULT_META.subtitle,
        location: payload.location ?? DEFAULT_META.location,
        startTime: payload.startTime ?? DEFAULT_META.startTime,
      });
    } catch (error) {
      console.error(error);
      setSchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void getSchedule();
    const interval = window.setInterval(() => {
      void getSchedule();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [getSchedule]);

  const handleStatusChange = async (date: string, player: string, status: Status) => {
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, player, status }),
    });

    await getSchedule();
  };

  const completeDays = useMemo(
    () =>
      schedule.filter((day) => day.players.filter((player) => player.status === "playing").length >= meta.playersPerDay)
        .length,
    [schedule, meta.playersPerDay],
  );

  const incompleteDays = useMemo(
    () =>
      schedule.filter((day) => day.players.filter((player) => player.status === "playing").length < meta.playersPerDay),
    [schedule, meta.playersPerDay],
  );

  const playerDayCounts = useMemo(() => {
    const countFor = (name: string) =>
      schedule.filter((day) => day.players.some((member) => member.name === name && member.status === "playing"))
        .length;

    const corePlayers = meta.joker ? meta.players.filter((name) => name !== meta.joker) : meta.players;
    const counts = corePlayers.map((name) => ({ name, count: countFor(name) }));

    if (meta.joker) {
      const jokerCount = countFor(meta.joker);
      if (jokerCount > 0) {
        counts.push({ name: meta.joker, count: jokerCount });
      }
    }

    return counts;
  }, [schedule, meta.players, meta.joker]);

  const seasonalThemes = useMemo(() => getSeasonalThemes(schedule), [schedule]);

  const handleJumpToDay = (date: string) => {
    const element = document.getElementById(date);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleShareIncompleteDay = (day: ScheduleDay) => {
    const greenCount = day.players.filter((player) => player.status === "playing").length;
    const needed = Math.max(0, meta.playersPerDay - greenCount);
    const boardUrl = window.location.origin;
    const mentionLine = buildMentionLine(day.players);

    openWhatsAppShare(
      `⚠️ ${meta.title}: ${formatDateLabel(day.date)} is nog niet compleet (${greenCount}/${meta.playersPerDay} — nog ${needed} nodig).${mentionLine}\n${boardUrl}`,
    );
  };

  const handleExportAgenda = (player: string) => {
    const calendar = buildAgendaFile(player, schedule, meta);
    const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tc-domstad-blaashal-${player.toLowerCase()}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    void buildAndDownloadScheduleExcel(schedule, meta);
  };

  const renderPlayer = (day: ScheduleDay, player: PlayerStatus) => {
    const isPlaying = player.status === "playing";
    const isProblem = player.status === "problem";
    const playingCount = day.players.filter((member) => member.status === "playing").length;
    const isLocked = !isPlaying && playingCount >= meta.playersPerDay;

    const chipStyle = isPlaying
      ? "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
      : isProblem
        ? "border-red-300 bg-red-100 text-red-900 hover:bg-red-200"
        : isLocked
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200";

    const handleToggle = () => {
      if (isLocked) {
        return;
      }

      const nextStatus: Status = isPlaying ? "problem" : "playing";
      const confirmed = window.confirm("Je past je beschikbaarheid aan, weet je het zeker?");

      if (!confirmed) {
        return;
      }

      void handleStatusChange(day.date, player.name, nextStatus).then(() => {
        if (nextStatus !== "problem") {
          return;
        }

        const remaining = playingCount - 1;
        const needed = Math.max(0, meta.playersPerDay - remaining);
        const sendMessage = window.confirm(
          `${player.name} kan niet op ${formatDateLabel(day.date)} — nog ${needed} speler(s) nodig. WhatsApp-bericht sturen naar de groep?`,
        );

        if (sendMessage) {
          const boardUrl = window.location.origin;
          const mentionLine = buildMentionLine(day.players, player.name);
          openWhatsAppShare(
            `📋 ${meta.title}: ${player.name} kan niet op ${formatDateLabel(day.date)} (${remaining}/${meta.playersPerDay} — nog ${needed} nodig).${mentionLine}\n${boardUrl}`,
          );
        }
      });
    };

    return (
      <button
        key={`${day.date}-${player.name}`}
        type="button"
        className={`flex w-full min-w-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left text-sm font-medium shadow-sm transition-all ${chipStyle}`}
        onClick={handleToggle}
        disabled={isLocked}
        aria-label={`${player.name} ${player.status}`}
        title={isLocked ? `Er spelen al ${meta.playersPerDay} spelers deze avond` : undefined}
      >
        <span className="text-[0.7rem] font-bold">
          {player.status === "playing" ? "✓" : player.status === "problem" ? "✕" : "○"}
        </span>
        <span className="truncate">{player.name}</span>
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-[#f5f3ef] text-[#1b1b1b]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 overflow-hidden rounded-2xl border border-[#1d1d1b] bg-[#1d1d1b] shadow-[0_10px_20px_rgba(17,17,17,0.15)]">
          <div className="relative flex items-center gap-4 p-4">
            <span className="absolute right-3 top-2 text-[0.65rem] font-medium tabular-nums text-[#6b6b68]">
              v{APP_VERSION}
            </span>
            <button type="button" onClick={handleLogoClick} className="shrink-0 cursor-default" aria-label="T.C. Domstad">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={logoWiggleKey}
                src="/domstad-logo.svg"
                alt="T.C. Domstad"
                className={`h-9 w-auto sm:h-11 ${logoWiggleKey > 0 ? "animate-logo-wiggle" : ""}`}
              />
            </button>
            <div className="min-w-0">
              {isLoading ? (
                <div className="animate-pulse space-y-2 py-1">
                  <div className="h-3 w-28 rounded bg-white/20" />
                  <div className="h-6 w-48 rounded bg-white/20" />
                  <div className="h-3 w-36 rounded bg-white/20" />
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e40520]">
                    {meta.seasonLabel}
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{meta.title}</h1>
                  <p className="mt-1 text-sm text-white/70">{meta.subtitle}</p>
                </>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full bg-[#e40520]" />
        </header>

        <div
          className={`mb-5 rounded-2xl border p-4 shadow-sm transition ${
            incompleteDays.length > 0 ? "border-red-300 bg-red-50/60" : "border-[#e6ddd4] bg-white"
          }`}
        >
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">Status</div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-2xl font-black text-emerald-700">{completeDays}</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80">
                Compleet
              </div>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 ${
                incompleteDays.length > 0
                  ? "border-red-400 bg-red-100"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div
                className={`text-2xl font-black ${
                  incompleteDays.length > 0 ? "text-red-700" : "text-slate-500"
                }`}
              >
                {incompleteDays.length}
              </div>
              <div
                className={`text-xs font-semibold uppercase tracking-wide ${
                  incompleteDays.length > 0 ? "text-red-700/80" : "text-slate-500"
                }`}
              >
                Incompleet
              </div>
            </div>
          </div>

          {incompleteDays.length > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
                <span aria-hidden="true">⚠</span> Actie nodig
              </div>
              <div className="flex flex-wrap gap-2">
                {incompleteDays.map((day) => (
                  <div key={day.date} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleJumpToDay(day.date)}
                      className="rounded-full border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                    >
                      {formatDateLabel(day.date)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareIncompleteDay(day)}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-600 shadow-sm transition hover:bg-emerald-50"
                      aria-label={`WhatsApp-bericht voor ${formatDateLabel(day.date)}`}
                      title="Stuur WhatsApp-bericht"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[#ece3da] pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b6b6b]">
              Speeldagen per speler
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {playerDayCounts.map(({ name, count }) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#ece3da] bg-[#faf7f2] px-3 py-2"
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-sm font-semibold text-[#1d1d1b]">{name}</span>
                    <span className="whitespace-nowrap text-xs text-[#8a8a8a]">{count} speeldagen</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportAgenda(name)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1d1d1b] bg-white text-[#1d1d1b] transition hover:bg-[#1d1d1b] hover:text-white"
                    aria-label={`Exporteer agenda voor ${name}`}
                    title="Exporteer naar agenda"
                  >
                    <CalendarExportIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#1d1d1b] bg-white px-3.5 py-2 text-sm font-semibold text-[#1d1d1b] shadow-sm transition hover:bg-[#1d1d1b] hover:text-white"
            >
              <TableExportIcon className="h-4 w-4" />
              Download schema (Excel)
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-[#e9dfd5] bg-white p-4 shadow-sm">
                <div className="mb-4 h-4 w-20 rounded bg-slate-200" />
                <div className="mb-3 h-7 w-32 rounded bg-slate-200" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((__, chipIndex) => (
                    <div key={chipIndex} className="h-9 rounded-full bg-slate-200" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !schedule.length ? (
          <div className="rounded-2xl border border-dashed border-[#c9b6a4] bg-white p-8 text-center text-[#4a4a4a]">
            Geen data beschikbaar
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {schedule.map((day) => {
              const greenCount = day.players.filter((player) => player.status === "playing").length;
              const complete = greenCount >= meta.playersPerDay;
              const needed = Math.max(0, meta.playersPerDay - greenCount);
              const statusText = complete
                ? `${meta.playersPerDay}/${meta.playersPerDay} compleet`
                : `${greenCount}/${meta.playersPerDay} — nog ${needed} nodig`;
              const seasonalTheme = seasonalThemes.get(day.date);

              return (
                <article
                  id={day.date}
                  key={day.date}
                  className="overflow-hidden rounded-2xl border border-[#1d1d1b]/15 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative bg-[#1d1d1b] px-4 py-3">
                    {seasonalTheme && <SeasonalDecoration theme={seasonalTheme} />}
                    <div className="relative flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e40520]">
                          Week {day.weekNumber}
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-white">{formatDateLabel(day.date)}</h2>
                      </div>
                      <div
                        className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          complete
                            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                            : "border-red-400/40 bg-red-400/10 text-red-300"
                        }`}
                      >
                        {statusText}
                      </div>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-[#e40520]" />

                  <div className="grid gap-2 p-4">
                    {day.players.map((player) => renderPlayer(day, player))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {nonsenseFact && (
        <div
          key={nonsenseFact}
          role="status"
          className="animate-fact-pop fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[#e40520]/40 bg-[#1d1d1b] px-4 py-3 text-white shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none" aria-hidden="true">🤫</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e40520]">Wist je dat…</p>
              <p className="mt-1 text-sm leading-snug text-white/90">{nonsenseFact}</p>
            </div>
            <button
              type="button"
              onClick={() => setNonsenseFact(null)}
              className="shrink-0 text-white/50 transition hover:text-white"
              aria-label="Sluiten"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
