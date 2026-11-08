/**
 * Opens the real landing, stubs every Apps Script request, and submits a fake
 * registration. Nothing is posted to Google and no email is sent.
 *
 * Requires puppeteer-core (not a project dependency, so Vercel stays a static
 * deploy) and the system Chrome binary:
 *   npm install --prefix /tmp/webinar-test puppeteer-core
 *   node --test test/confirmation-browser.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const chrome = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
const puppeteerPkg = process.env.PUPPETEER_CORE_ROOT || "/tmp/webinar-test/node_modules/puppeteer-core/package.json";
const shotDir = process.env.SHOT_DIR || "/opt/cursor/artifacts";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".js": "text/javascript",
  ".css": "text/css",
};

function serve() {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    const safe = normalize(path);
    if (safe.includes("..")) {
      res.writeHead(400);
      res.end();
      return;
    }
    const file = join(root, safe === "/" ? "index.html" : safe);
    try {
      const buf = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

test("stubbed registration shows both zones, keeps the payload, and does not call Apps Script", async (t) => {
  assert.equal(existsSync(chrome), true, `chrome missing at ${chrome}`);
  assert.equal(existsSync(puppeteerPkg), true, `install puppeteer-core so ${puppeteerPkg} exists`);
  const puppeteer = createRequire(puppeteerPkg)("puppeteer-core");
  const { server, port } = await serve();
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const posts = [];
  const scriptHits = [];
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: process.env.HEADED ? false : true,
    slowMo: Number(process.env.SLOWMO || 0),
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--host-resolver-rules=MAP script.google.com ~NOTFOUND, MAP script.googleusercontent.com ~NOTFOUND",
      "--window-size=1280,900",
      "--window-position=0,0",
    ],
    defaultViewport: { width: 1280, height: 900 },
  });
  t.after(() => browser.close());

  const page = await browser.newPage();
  await page.emulateTimezone("America/Bogota");
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    let host = "";
    try { host = new URL(req.url()).hostname; } catch { /* ignore malformed */ }
    if (host === "script.google.com" || host === "script.googleusercontent.com") {
      scriptHits.push(`${req.method()} ${req.url()}`);
      if (req.method() === "POST") posts.push(req.postData() || "");
      req.respond({ status: 200, contentType: "application/json", body: '{"count":0}' });
      return;
    }
    req.continue();
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#submit")?.textContent?.includes("Reservar"));

  await page.type('#form [name="name"]', "Ana López");
  await page.type('#form [name="email"]', "ana.lopez@example.com");
  await page.type("#phone", "3001234567");
  await page.click('#form [name="consent"]');
  await page.click("#submit");
  await page.waitForSelector("#done", { visible: true, timeout: 5000 });

  const title = await page.$eval("#d-title", (el) => el.textContent);
  const sub = await page.$eval("#d-sub", (el) => el.textContent);
  assert.equal(title, "Recibimos tu solicitud, Ana.");
  assert.equal(sub, "12 de noviembre de 2026, 10:00–11:30 (hora del Centro de México) y 11:00–12:30 (Bogotá). Tu registro queda confirmado cuando recibes el correo de GoTo Webinar. Para entrar y guardar el evento en tu calendario, usa únicamente esa confirmación, que incluye tu enlace personal. Si no la encuentras, revisa spam.");
  assert.doesNotMatch(sub, /te enviamos|ya enviamos|no pudimos|intenta de nuevo/i);

  assert.equal(await page.$("#cal-google"), null);
  assert.equal(await page.$("#cal-outlook"), null);
  assert.equal(await page.$("#cal-ics"), null);
  const hrefs = await page.$$eval("a[href]", (els) => els.map((a) => a.href));
  assert.equal(hrefs.some((href) => /calendar\.google\.com|outlook\.office\.com|webinar\.ics/.test(href)), false);

  assert.equal(posts.length, 1, `unexpected posts: ${posts.join(" | ")}`);
  const body = JSON.parse(posts[0]);
  assert.deepEqual(body, {
    type: "webinar",
    event: "nearshoring-identidad-norte-mx-2026",
    title: "Retos del Nearshoring: Identidad y Control de Identidades en la Industria Automotriz y Maquiladoras",
    start: "2026-11-12T16:00:00Z",
    duration: 90,
    lang: "es",
    page: `http://127.0.0.1:${port}/`,
    name: "Ana López",
    email: "ana.lopez@example.com",
    whatsapp: "573001234567",
    consent: true,
    source: "",
    website: "",
  });
  assert.equal(scriptHits.filter((line) => line.startsWith("POST ")).length, 1);
  assert.equal(scriptHits.some((line) => line.startsWith("GET ")), true, "count read should also be stubbed");

  await page.type("#m-company", "Planta Norte");
  await page.type("#m-role", "Seguridad");
  await page.click("#m-submit");
  await page.waitForSelector("#m-saved", { visible: true });
  assert.equal(posts.length, 2);
  assert.deepEqual(JSON.parse(posts[1]), {
    type: "webinar_update",
    event: "nearshoring-identidad-norte-mx-2026",
    email: "ana.lopez@example.com",
    company: "Planta Norte",
    role: "Seguridad",
    country: "Colombia",
  });

  const wa = await page.$eval("#s-wa", (el) => el.href);
  const li = await page.$eval("#s-li", (el) => el.href);
  assert.match(wa, /^https:\/\/wa\.me\//);
  assert.match(li, /linkedin\.com\/sharing/);
  assert.equal(await page.$eval('script[src="/_vercel/insights/script.js"]', (el) => el.getAttribute("src")), "/_vercel/insights/script.js");

  await page.$eval("#register", (el) => el.scrollIntoView({ block: "start" }));
  if (existsSync(shotDir)) {
    await page.screenshot({ path: `${shotDir}/hid-goto-confirmation-desktop.png` });
  }

  await page.evaluate(() => {
    const item = [...document.querySelectorAll("#faq details")].find((d) => d.querySelector("summary").textContent.includes("instalar"));
    item.open = true;
  });
  const faq = await page.$eval("#faq", (el) => el.innerText);
  assert.match(faq, /enlace personal de la confirmación de GoTo Webinar/);

  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.$eval("#d-title", (el) => el.textContent), "Recibimos tu solicitud, Ana.");
  assert.equal(await page.$eval("#form", (el) => getComputedStyle(el).display), "none");
  if (existsSync(shotDir)) {
    await page.$eval("#register", (el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `${shotDir}/hid-goto-confirmation-mobile.png` });
  }
});
