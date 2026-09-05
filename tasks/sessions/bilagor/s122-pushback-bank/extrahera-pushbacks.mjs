#!/usr/bin/env node
// Research-pass S122: extrahera Marcus designpushbacks ur råa Claude Code-transkript.
// Läser varje .jsonl-fil rad för rad (readline, aldrig hela filen i minnet).
//
// Schema-fakta verifierade FÖRE detta skript skrevs (python3-sondering, se
// transkript i denna session):
//   - "type":"user" täcker BÅDE riktiga människomeddelanden, tool_result-svar,
//     skill-injicerad pseudo-text (isMeta:true) och async task-notifications.
//   - origin.kind === "human" är ett SÄKERT positivt signal — men finns bara på
//     5450/24904 user-poster (nyare schema-version). Äldre filer saknar fältet
//     helt, även för genuint mänskliga meddelanden (verifierat på det äldsta
//     transkriptet, bd46e99e…, "Återuppta S96." saknar origin-fältet).
//   - origin.kind === "task-notification" / "peer" är SÄKERT synteiskt — utesluts.
//   - isMeta === true flaggar skill-injicerad text ("Base directory for this
//     skill: …") som ANDRA typer av user-poster saknar.
//   - content-array med ETT ELLER FLERA item.type === "tool_result" är alltid
//     ett verktygssvar, oavsett origin/isMeta — utesluts helt (per uppdraget).
// Fallback för äldre filer utan origin-fält: content-baserad heuristik +
// tag-stripping (se STRIP_TAGS) + tomhetstest efter strippning.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const TRANSCRIPT_DIR = '/Users/marcus/.claude/projects/-Users-marcus-Repon-miranon-media-admin';
const OUT_DIR =
  '/private/tmp/claude-501/-Users-marcus-Repon-miranon-media-admin/d2a05dc9-fb23-4d5a-9c81-c8131c3c27a8/scratchpad';

const DESIGN_WORDS = [
  'prototyp',
  'variant',
  'konvergens',
  'divergens',
  'snygg',
  'ful',
  'slarv',
  'kort',
  'knapp',
  'rubrik',
  'bredd',
  'höjd',
  'hjälptext',
  'sidkrom',
  'sidram',
  'exakt som',
  'samma som',
  'ta bort',
  'flytta',
  'centrera',
  'linjera',
  'chevron',
  'pill',
  'facit',
];

// Block-taggar som stryks HELT (icke-girigt, dotall) innan tomhetstestet.
// De fyra första + system-reminder är uppdragets egen lista. task-notification
// och local-command-caveat är en EGEN UTVIDGNING (dokumenterad i rapporten) —
// utan dem läcker async-bakgrundsnotiser och kommando-caveats in som
// "människomeddelanden" med tom-men-inte-riktigt-tom text.
const STRIP_TAGS = [
  'system-reminder',
  'command-name',
  'command-message',
  'command-args',
  'local-command-stdout',
  'local-command-caveat',
  'task-notification',
];

function stripSyntheticBlocks(text) {
  let out = text;
  for (const tag of STRIP_TAGS) {
    const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi');
    out = out.replace(re, '');
  }
  return out;
}

function extractHumanText(obj) {
  const origin = obj.origin && obj.origin.kind;
  if (origin === 'task-notification' || origin === 'peer') return null;
  if (obj.isMeta === true) return null;
  // KRITISKT fynd under sondering (python3-verifierat, 2026-09-05): Claude
  // Code auto-compact injicerar sin EGEN, MASKINGENERERADE konversations-
  // sammanfattning ("This session is being continued from a previous
  // conversation…") som en "type":"user"-post. Den bär det maskinläsbara
  // fältet isCompactSummary:true — utan denna exkludering hade en sådan post
  // (17 363 tecken, 27 designordsträffar) felklassats som Marcus prosa i
  // Steg 1/2. 4 av 24 909 user-poster i hela korpusen bär flaggan.
  if (obj.isCompactSummary === true) return null;

  const content = obj.message && obj.message.content;
  let rawText = null;
  if (typeof content === 'string') {
    rawText = content;
  } else if (Array.isArray(content)) {
    if (content.some((item) => item && item.type === 'tool_result')) {
      return null;
    }
    const textParts = content
      .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text);
    if (textParts.length === 0) return null;
    rawText = textParts.join('\n\n');
  } else {
    return null;
  }

  const stripped = stripSyntheticBlocks(rawText).trim();
  if (stripped.length === 0) return null;

  // EGEN UTVIDGNING (utöver uppdragets stripplista): en handfull poster (7 av
  // 24 909 i hela korpusen) är rå text som börjar med "/compact" följt av en
  // FOKUS-INSTRUKTION Code självt författat åt sig via pre-compact-skillen
  // (ADR-101) — Marcus klistrar bara in den. Det är alltså inte organisk
  // Marcus-prosa även om raden tekniskt är "typed". Utesluts explicit, aldrig
  // tyst inräknad i designordsträffarna.
  if (/^\/compact\b/i.test(stripped)) return null;

  // EGEN UTVIDGNING #2: Marcus egen "!"-bang-kanal (CLAUDE.md § Prod-EF-deploy
  // — "kontrollera får gå via !-prefixet") loggar kommandots TERMINALUTDATA
  // som en "type":"user"-post inslagen i <bash-stdout>…</bash-stdout>
  // (+ <bash-stderr>). Det är maskinutdata från ett kommando Marcus körde —
  // INTE hans prosa — även om turen tekniskt är "human". 88 av 24 909
  // user-poster i hela korpusen matchar mönstret; flera landade som
  // falsklarm i Steg 1-sonderingen (t.ex. en 10 674-tecken deploy-logg med
  // 30 "träffar" på ord som bara råkade stå i commit-/filnamn).
  // <bash-input> (kommandot Marcus FAKTISKT skrev) behålls — det är genuint
  // human-författat, om än kommandoform snarare än prosa.
  if (/^<bash-stdout>/i.test(stripped)) return null;

  return stripped;
}

function countDesignHits(lowerText) {
  let total = 0;
  const perWord = {};
  for (const word of DESIGN_WORDS) {
    let count = 0;
    let idx = 0;
    const w = word.toLowerCase();
    while (true) {
      const found = lowerText.indexOf(w, idx);
      if (found === -1) break;
      count++;
      idx = found + w.length;
    }
    if (count > 0) {
      perWord[word] = count;
      total += count;
    }
  }
  return { total, perWord };
}

async function processFile(filePath) {
  const fileId = path.basename(filePath, '.jsonl');
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let humanMsgCount = 0;
  let designMsgCount = 0;
  let designWordHits = 0;
  let firstTs = null;
  let lastTs = null;
  let parseErrors = 0;
  let toolResultExcluded = 0;
  let metaExcluded = 0;
  let notificationExcluded = 0;
  let compactSummaryExcluded = 0;
  let compactPrefixExcluded = 0;
  let bashStdoutExcluded = 0;
  const matched = [];

  for await (const line of rl) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    let obj;
    try {
      obj = JSON.parse(trimmedLine);
    } catch {
      parseErrors++;
      continue;
    }
    if (obj.type !== 'user') continue;

    // Klassificera exkluderingsorsak för statistik (§ Metod-redovisning).
    const origin = obj.origin && obj.origin.kind;
    if (origin === 'task-notification' || origin === 'peer') {
      notificationExcluded++;
      continue;
    }
    if (obj.isMeta === true) {
      metaExcluded++;
      continue;
    }
    if (obj.isCompactSummary === true) {
      compactSummaryExcluded++;
      continue;
    }
    const content = obj.message && obj.message.content;
    if (Array.isArray(content) && content.some((item) => item && item.type === 'tool_result')) {
      toolResultExcluded++;
      continue;
    }
    if (typeof content === 'string' && /^\/compact\b/i.test(content.trim())) {
      compactPrefixExcluded++;
      continue;
    }
    if (typeof content === 'string' && /^<bash-stdout>/i.test(content.trim())) {
      bashStdoutExcluded++;
      continue;
    }

    const text = extractHumanText(obj);
    if (text === null) continue;

    humanMsgCount++;
    const ts = obj.timestamp || null;
    if (ts) {
      if (!firstTs || ts < firstTs) firstTs = ts;
      if (!lastTs || ts > lastTs) lastTs = ts;
    }

    const { total, perWord } = countDesignHits(text.toLowerCase());
    if (total > 0) {
      designMsgCount++;
      designWordHits += total;
      matched.push({
        fileId,
        uuid: obj.uuid || null,
        timestamp: ts,
        hits: total,
        perWord,
        text,
      });
    }
  }

  return {
    fileId,
    filePath,
    humanMsgCount,
    designMsgCount,
    designWordHits,
    firstTs,
    lastTs,
    parseErrors,
    toolResultExcluded,
    metaExcluded,
    notificationExcluded,
    compactSummaryExcluded,
    compactPrefixExcluded,
    bashStdoutExcluded,
    matched,
  };
}

// Denna sessions EGET transkript (orkestreraren som beställde detta
// research-pass, S122, 2026-09-05) — utesluts MEDVETET. Skälet är dubbelt:
// (1) filen skrivs fortfarande LIVE medan detta skript körs (detta pass är
// självt en post i den), så en läsning är strukturellt ofullständig data;
// (2) dess enda designordsträff är uppdragsprompten SJÄLV (som citerar Marcus
// kontext-mening ordagrant) — att räkna in den vore cirkulärt, inte ett nytt
// fynd ur transkripten. Rang 25 utan denna fil blir e9b60a0a i stället
// (disk-verifierat, se steg1-ranking-alla-filer.json).
const CURRENT_SESSION_FILE_ID = 'd2a05dc9-fb23-4d5a-9c81-c8131c3c27a8';

async function main() {
  const files = fs
    .readdirSync(TRANSCRIPT_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .filter((f) => !f.startsWith(CURRENT_SESSION_FILE_ID))
    .map((f) => path.join(TRANSCRIPT_DIR, f));

  console.error(`Hittade ${files.length} .jsonl-filer i ${TRANSCRIPT_DIR}`);

  const results = [];
  for (const f of files) {
    const r = await processFile(f);
    results.push(r);
    console.error(
      `${r.fileId.slice(0, 8)}  human=${r.humanMsgCount}  design_msg=${r.designMsgCount}  hits=${r.designWordHits}  ${r.firstTs ?? '-'} .. ${r.lastTs ?? '-'}`,
    );
  }

  // Steg 1-rapport: ranking över ALLA filer.
  const ranking = results
    .map((r) => ({
      fileId: r.fileId,
      humanMsgCount: r.humanMsgCount,
      designMsgCount: r.designMsgCount,
      designWordHits: r.designWordHits,
      density: r.humanMsgCount > 0 ? r.designMsgCount / r.humanMsgCount : 0,
      firstTs: r.firstTs,
      lastTs: r.lastTs,
      parseErrors: r.parseErrors,
      toolResultExcluded: r.toolResultExcluded,
      metaExcluded: r.metaExcluded,
      notificationExcluded: r.notificationExcluded,
    }))
    .sort((a, b) => b.designWordHits - a.designWordHits);

  fs.writeFileSync(
    path.join(OUT_DIR, 'steg1-ranking-alla-filer.json'),
    JSON.stringify(ranking, null, 2),
  );

  const top25 = ranking.slice(0, 25).map((r) => r.fileId);
  const top25Set = new Set(top25);

  fs.writeFileSync(
    path.join(OUT_DIR, 'steg1-topp25.json'),
    JSON.stringify(ranking.slice(0, 25), null, 2),
  );

  // Steg 2: alla matchade meddelanden ur de 25 filerna, sorterade per fil+tid.
  const top25Matched = results
    .filter((r) => top25Set.has(r.fileId))
    .flatMap((r) => r.matched)
    .sort((a, b) => {
      if (a.fileId !== b.fileId) return a.fileId.localeCompare(b.fileId);
      return (a.timestamp || '').localeCompare(b.timestamp || '');
    });

  fs.writeFileSync(
    path.join(OUT_DIR, 'steg2-matchade-meddelanden-topp25.json'),
    JSON.stringify(top25Matched, null, 2),
  );

  // Global sammanfattning
  const totalHuman = results.reduce((s, r) => s + r.humanMsgCount, 0);
  const totalDesignMsg = results.reduce((s, r) => s + r.designMsgCount, 0);
  const totalHits = results.reduce((s, r) => s + r.designWordHits, 0);
  const totalParseErrors = results.reduce((s, r) => s + r.parseErrors, 0);
  const totalToolResultExcluded = results.reduce((s, r) => s + r.toolResultExcluded, 0);
  const totalMetaExcluded = results.reduce((s, r) => s + r.metaExcluded, 0);
  const totalNotificationExcluded = results.reduce((s, r) => s + r.notificationExcluded, 0);
  const totalCompactSummaryExcluded = results.reduce((s, r) => s + r.compactSummaryExcluded, 0);
  const totalCompactPrefixExcluded = results.reduce((s, r) => s + r.compactPrefixExcluded, 0);
  const totalBashStdoutExcluded = results.reduce((s, r) => s + r.bashStdoutExcluded, 0);

  const summary = {
    totalFiles: files.length,
    totalHumanMsgCount: totalHuman,
    totalDesignMsgCount: totalDesignMsg,
    totalDesignWordHits: totalHits,
    totalParseErrors,
    totalToolResultExcluded,
    totalMetaExcluded,
    totalNotificationExcluded,
    totalCompactSummaryExcluded,
    totalCompactPrefixExcluded,
    totalBashStdoutExcluded,
    top25FileIds: top25,
    top25MatchedMsgCount: top25Matched.length,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, 'steg1-sammanfattning.json'),
    JSON.stringify(summary, null, 2),
  );

  console.error('\n=== SAMMANFATTNING ===');
  console.error(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('FEL:', err);
  process.exit(1);
});
