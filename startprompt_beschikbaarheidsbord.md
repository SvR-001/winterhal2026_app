# Startprompt voor Claude Code (VS Code) — Blaashal beschikbaarheidsbord

Plak onderstaande prompt in Claude Code (VS Code) op je privé-account om de app te laten bouwen.

---

Bouw een kleine webapp: een gedeeld, no-login beschikbaarheidsbord voor mijn
tennisteam voor de blaashal wintercompetitie 2026/2027 (T.C. Domstad).

## Context

Team van 6 spelers: Sjoerd, Sebas, Robert, Danny, Jelmer, Michel.
We spelen elke donderdag om 21:00 uur op baan 5. Van de 6 spelers spelen er
elke week 4; 2 zijn vrij. Er zijn 23 speeldagen tussen 1 oktober 2026 en
18 maart 2027 (kerstvakantie-weken zijn al uitgesloten). Sjoerd is vrijgehouden
op 22-10-2026 (herfstvakantie regio Utrecht).

Het schema is al eerlijk verdeeld (iedereen speelt 15 of 16 van de 23 dagen).
Gebruik onderstaande data als seed — niet opnieuw genereren.

```json
[
  {"date": "2026-10-01", "playing": ["Sjoerd", "Robert", "Jelmer", "Michel"], "sitting": ["Sebas", "Danny"]},
  {"date": "2026-10-08", "playing": ["Sjoerd", "Sebas", "Danny", "Michel"], "sitting": ["Jelmer", "Robert"]},
  {"date": "2026-10-15", "playing": ["Sebas", "Robert", "Danny", "Jelmer"], "sitting": ["Sjoerd", "Michel"]},
  {"date": "2026-10-22", "playing": ["Sebas", "Danny", "Jelmer", "Michel"], "sitting": ["Sjoerd", "Robert"]},
  {"date": "2026-10-29", "playing": ["Sjoerd", "Sebas", "Robert", "Michel"], "sitting": ["Danny", "Jelmer"]},
  {"date": "2026-11-05", "playing": ["Sjoerd", "Robert", "Danny", "Jelmer"], "sitting": ["Michel", "Sebas"]},
  {"date": "2026-11-12", "playing": ["Sebas", "Robert", "Danny", "Michel"], "sitting": ["Sjoerd", "Jelmer"]},
  {"date": "2026-11-19", "playing": ["Sjoerd", "Sebas", "Robert", "Jelmer"], "sitting": ["Danny", "Michel"]},
  {"date": "2026-11-26", "playing": ["Sjoerd", "Danny", "Jelmer", "Michel"], "sitting": ["Robert", "Sebas"]},
  {"date": "2026-12-03", "playing": ["Sjoerd", "Sebas", "Danny", "Jelmer"], "sitting": ["Michel", "Robert"]},
  {"date": "2026-12-10", "playing": ["Sebas", "Robert", "Jelmer", "Michel"], "sitting": ["Sjoerd", "Danny"]},
  {"date": "2026-12-17", "playing": ["Sjoerd", "Robert", "Danny", "Michel"], "sitting": ["Sebas", "Jelmer"]},
  {"date": "2027-01-07", "playing": ["Sjoerd", "Sebas", "Jelmer", "Michel"], "sitting": ["Robert", "Danny"]},
  {"date": "2027-01-14", "playing": ["Robert", "Danny", "Jelmer", "Michel"], "sitting": ["Sebas", "Sjoerd"]},
  {"date": "2027-01-21", "playing": ["Sjoerd", "Sebas", "Robert", "Danny"], "sitting": ["Michel", "Jelmer"]},
  {"date": "2027-01-28", "playing": ["Sebas", "Robert", "Danny", "Jelmer"], "sitting": ["Sjoerd", "Michel"]},
  {"date": "2027-02-04", "playing": ["Sjoerd", "Sebas", "Danny", "Michel"], "sitting": ["Robert", "Jelmer"]},
  {"date": "2027-02-11", "playing": ["Sjoerd", "Robert", "Jelmer", "Michel"], "sitting": ["Danny", "Sebas"]},
  {"date": "2027-02-18", "playing": ["Sebas", "Robert", "Danny", "Michel"], "sitting": ["Jelmer", "Sjoerd"]},
  {"date": "2027-02-25", "playing": ["Sjoerd", "Sebas", "Robert", "Jelmer"], "sitting": ["Danny", "Michel"]},
  {"date": "2027-03-04", "playing": ["Sjoerd", "Danny", "Jelmer", "Michel"], "sitting": ["Robert", "Sebas"]},
  {"date": "2027-03-11", "playing": ["Sjoerd", "Robert", "Danny", "Jelmer"], "sitting": ["Sebas", "Michel"]},
  {"date": "2027-03-18", "playing": ["Sebas", "Robert", "Jelmer", "Michel"], "sitting": ["Sjoerd", "Danny"]}
]
```

## Functioneel gedrag (belangrijk, exact zo)

Voor elke speeldag toon je **alle 6 namen**, altijd, in vaste volgorde.

- Elke naam heeft een status: **groen** (speelt deze week), of **grijs**
  (staat deze week niet ingepland — default).
- Elke naam heeft een klein kruisje (×) ernaast.
  - Klik op **×** bij een groene naam → naam wordt **rood** (signaal: "deze
    speler kan niet, dag moet opgelost worden").
  - Klik op de **naam zelf** (niet het kruisje) bij een grijze of rode naam →
    naam wordt **groen** (die speler speelt/valt in).
- Per dag laat je een korte indicator zien: hoeveel groen op dit moment
  (bv. "4/4 compleet" met groene rand, of "3/4 — nog 1 nodig" met rode rand/
  badge) zodat in één oogopslag duidelijk is welke dagen actie nodig hebben.
- Geen inlog, geen accounts. Iedereen met de link kan direct klikken.
  Wijzigingen zijn voor iedereen die de pagina open heeft zichtbaar
  (gedeelde state, geen per-apparaat opslag).
- Mobile-first: dit wordt vooral vanaf de telefoon bekeken (WhatsApp-linkje).

## Techniek

- Next.js (App Router) + TypeScript, Tailwind CSS.
- Gedeelde server-side state zonder auth: Vercel KV (Upstash Redis) of Vercel
  Postgres — kies wat het snelst op te zetten is. Eén document/tabel met per
  (datum, speler) de status ("playing" | "problem" | "idle"); seed met de
  JSON hierboven (alle "playing" spelers krijgen status "playing", de rest
  "idle").
- Client ververst live: polling elke ~5 seconden is prima op deze schaal
  (6 spelers, 23 dagen) — geen websockets nodig, tenzij dat net zo makkelijk is.
- API routes: `GET /api/schedule` (hele schema + status), `POST
  /api/status` ({date, player, status}) — geen auth, wel lichte validatie
  (player moet in de vaste lijst van 6 zitten, status moet playing/problem/
  idle zijn).
- Deploy op Vercel.

## Stijl

- Clubkleuren T.C. Domstad: rood (#C8102E) / zwart, warme lichte ondergrond.
  Titel: "T.C. Domstad — Blaashal 2026/2027". Subtitel: "donderdag 21:00 ·
  baan 5".
- Elke speeldag als kaart: weeknummer, datum (dd-mm-jjjj), dag, dan de 6
  naam-chips met kruisje.
- Herfstvakantie-week (22-10-2026) mag een klein label krijgen ("Sjoerd
  vrij — herfstvakantie") zodat duidelijk is waarom hij daar grijs staat.
- Rustige, opgeruimde lay-out, goed leesbaar op een telefoonscherm, duidelijk
  contrast tussen groen/rood/grijs (ook voor kleurenblinden: gebruik ook een
  icoon of tekstlabel, niet alleen kleur).

Bouw dit stap voor stap: eerst het datamodel en de seed, dan de API routes,
dan de UI, dan deploy-instructies.
