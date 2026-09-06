// Skärmdumps-rigg för konvergens-passet (L304-formen: fristående Playwright
// med e2e-svitens storageState). Loggar in TEST_USER mot dev-servern en gång,
// sparar playwright/.auth/user.json, och tar helsides-skärmdumpar i sv-SE på
// desktop (1440) och iPad (820) med 2x DPR (husets 2x-beslut).
//
//   node proto-shot.mjs <utkatalog> <namn>=<sökväg> [<namn>=<sökväg> ...]
//   flaggor: --login (tvinga ny inloggning) --vy=desktop|ipad|both
//            --klick="<css>" (klicka före dump)  --vänta=<ms>
//            --steg="klick:<css>;fyll:<css>=<värde>;rulla:botten|topp|<px>;vänta:<ms>"
//              (ordnad sekvens — `rulla` finns för appens FASTA bottennav: i en
//               `fullPage`-dump ritas ett `position: fixed`-element EN gång, på
//               sin plats relativt rullningen vid dumpens början, så ett osäkert
//               rullningsläge lägger navet tvärs över sidans mitt. Mätt
//               2026-09-06: iPad-dumpen av sätt-alla-blocket fick navet rakt
//               över de tre segmenten. `rulla:botten` före dumpen sätter navet
//               där det hör hemma.)
//
// TRÄDET HÄRLEDS UR SKRIPTETS EGEN PLATS, inte ur en literal (TASK-402.8
// slutvarvet). Konstanten pekade tidigare på worktreen `s121-registrera-
// betalning`, som var borttagen när slutvarvet skulle ta om bilderna — en
// hårdkodad syskonsökväg är en tidsinställd bomb i ett träd där worktrees
// skapas och rivs per uppdrag. `PROTO_WT` finns kvar som utväg för den som
// vill köra riggen mot ett ANNAT träd än det den ligger i.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// bilagor-katalogen ligger fyra nivåer under trädets rot:
// <rot>/tasks/sessions/bilagor/<prototyp>/riggen-proto-shot.mjs
const WT = process.env.PROTO_WT ?? path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(WT, 'package.json'));
const { chromium } = require('@playwright/test');

const BASE = process.env.PROTO_BASE ?? 'http://localhost:5174';
const AUTH = path.join(WT, 'playwright/.auth/user.json');

function lasEnv(fil) {
  const ut = {};
  for (const rad of fs.readFileSync(fil, 'utf8').split('\n')) {
    const m = rad.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/);
    if (m) ut[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return ut;
}

const args = process.argv.slice(2);
const flaggor = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.length ? v.join('=') : true];
    }),
);
const pos = args.filter((a) => !a.startsWith('--'));
const utdir = pos[0];
const mal = pos.slice(1).map((p) => {
  const i = p.indexOf('=');
  return { namn: p.slice(0, i), sokvag: p.slice(i + 1) };
});
if (!utdir || mal.length === 0) {
  console.error('användning: node proto-shot.mjs <utkatalog> namn=/sökväg ...');
  process.exit(2);
}
fs.mkdirSync(utdir, { recursive: true });

const VYER = {
  desktop: { width: 1440, height: 900 },
  ipad: { width: 820, height: 1180 },
};
const vyval = flaggor.vy ?? 'both';
const vyer = vyval === 'both' ? ['desktop', 'ipad'] : [vyval];

// `--lang` styr Chromiums UI-språk, som native `type=date` följer (page-locale räcker inte).
const browser = await chromium.launch({ args: ['--lang=sv-SE'] });

async function loggaIn() {
  const env = lasEnv(path.join(WT, '.env.test'));
  const ctx = await browser.newContext({ locale: 'sv-SE', timezoneId: 'Europe/Stockholm' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.locator('#login-email').fill(env.TEST_USER_EMAIL);
  await page.locator('#login-password').fill(env.TEST_USER_PASSWORD);
  await Promise.all([page.waitForURL('**/hem'), page.locator('button[type="submit"]').click()]);
  fs.mkdirSync(path.dirname(AUTH), { recursive: true });
  await ctx.storageState({ path: AUTH });
  await ctx.close();
  console.log('inloggad, storageState sparad');
}

if (flaggor.login || !fs.existsSync(AUTH)) await loggaIn();

for (const vy of vyer) {
  const ctx = await browser.newContext({
    storageState: AUTH,
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm',
    viewport: VYER[vy],
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  for (const { namn, sokvag } of mal) {
    await page.goto(`${BASE}${sokvag}`, { waitUntil: 'networkidle' });
    if (page.url().includes('/login')) {
      console.error('sessionen är ute — kör med --login');
      process.exit(3);
    }
    await page.waitForSelector('main h1', { timeout: 15000 });
    if (flaggor.klick) {
      for (const sel of String(flaggor.klick).split('|')) {
        await page.locator(sel).first().click();
        await page.waitForTimeout(150);
      }
    }
    if (flaggor.hovra) {
      await page.locator(String(flaggor.hovra)).first().hover();
      await page.waitForTimeout(250);
    }
    // `--steg` finns för de lägen `--klick` inte når: ett tillstånd som kräver
    // att ett fält FYLLS mitt i en klickkedja. `--klick` kan bara klicka, och
    // ordningen mellan flaggorna är fast — här är ordningen din.
    if (flaggor.steg) {
      for (const steg of String(flaggor.steg).split(';')) {
        const skiljetecken = steg.indexOf(':');
        const verb = steg.slice(0, skiljetecken).trim();
        const rest = steg.slice(skiljetecken + 1);
        if (verb === 'klick') {
          await page.locator(rest).first().click();
        } else if (verb === 'fyll') {
          const likhetstecken = rest.lastIndexOf('=');
          const falt = page.locator(rest.slice(0, likhetstecken)).first();
          await falt.fill(rest.slice(likhetstecken + 1));
          await falt.blur();
        } else if (verb === 'rulla') {
          await page.evaluate((vart) => {
            const y =
              vart === 'botten'
                ? document.documentElement.scrollHeight
                : vart === 'topp'
                  ? 0
                  : Number(vart);
            window.scrollTo(0, y);
          }, rest);
        } else if (verb === 'vänta') {
          await page.waitForTimeout(Number(rest));
        } else {
          console.error(`okänt steg-verb: ${verb}`);
          process.exit(2);
        }
        await page.waitForTimeout(150);
      }
    }
    await page.waitForTimeout(Number(flaggor['vänta'] ?? 400));
    const fil = path.join(utdir, `${namn}-${vy}.png`);
    await page.screenshot({ path: fil, fullPage: true });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${fil}  (${VYER[vy].width}×${h})`);
  }
  await ctx.close();
}
await browser.close();
