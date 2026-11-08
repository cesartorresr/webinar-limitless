import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const forbidden = [
  "calendar.google.com",
  "outlook.office.com",
  "BEGIN:VCALENDAR",
  "text/calendar",
  "METHOD:PUBLISH",
  "cal-google",
  "cal-outlook",
  "cal-ics",
  "webinar.ics",
  "Agrégalo a tu calendario",
  "Adicione à sua agenda",
  "Add it to your calendar",
  "Te enviamos la confirmación",
  "Enviamos a confirmação por e-mail",
  "We emailed your confirmation",
  "Tu lugar está reservado",
  "gcal:",
];

test("the landing no longer builds a calendar invite", () => {
  for (const phrase of forbidden) {
    assert.equal(html.includes(phrase), false, phrase);
  }
});

test("success copy states both zones and waits for the GoTo mail", () => {
  assert.match(html, /dTitle: "Recibimos tu solicitud, \{n\}\."/);
  assert.match(html, /dWhen: "\{date\}, \{mx\} \(hora del Centro de México\) y \{bog\} \(Bogotá\)\."/);
  const es = 'dSub: "Tu registro queda confirmado cuando recibes el correo de GoTo Webinar. Para entrar y guardar el evento en tu calendario, usa únicamente esa confirmación, que incluye tu enlace personal. Si no la encuentras, revisa spam."';
  assert.ok(html.includes(es), "spanish success paragraph");
  assert.match(es, /cuando recibes/);
  assert.doesNotMatch(es, /ya (te )?enviamos|te enviamos|no pudimos|falló|error/i);

  assert.match(html, /dTitle: "Recebemos sua solicitação, \{n\}\."/);
  assert.ok(html.includes('dSub: "Seu registro fica confirmado quando você recebe o e-mail do GoTo Webinar. Para entrar e salvar o evento na agenda, use somente essa confirmação, que inclui seu link pessoal. Se não a encontrar, verifique o spam."'));

  assert.match(html, /dTitle: "We received your request, \{n\}\."/);
  assert.ok(html.includes('dSub: "Your registration is confirmed when you receive the GoTo Webinar email. To join and save the event on your calendar, use only that confirmation, which includes your personal link. If you do not see it, check spam."'));

  assert.match(html, /zoneRange\("America\/Mexico_City"\)/);
  assert.match(html, /zoneRange\("America\/Bogota"\)/);
});

test("faq points at the GoTo confirmation", () => {
  assert.ok(html.includes("enlace personal de la confirmación de GoTo Webinar."));
  assert.ok(html.includes("link pessoal da confirmação do GoTo Webinar."));
  assert.ok(html.includes("personal link in the GoTo Webinar confirmation."));
});

test("registration payload, consent, company step, share and analytics stay", () => {
  assert.ok(html.includes('const FORMS_URL = "https://script.google.com/macros/s/AKfycbyyop230ePpCw8ElP0fR3fkjOX2PpRv2MieRCqb5uSvP8Xh71XVVoDx_T54Ra_VWyWZ7Q/exec";'));
  assert.ok(html.includes('src="/_vercel/insights/script.js"'));
  assert.ok(html.includes('mode: "no-cors"'));
  assert.ok(html.includes('await send({ type: "webinar", event: E.slug, title: plainTitle, start: E.start, duration: E.duration, lang: E.lang, page: pageUrl,\n      name, email, whatsapp, consent: true, source, website: String(f.get("website") || "") });'));
  assert.ok(html.includes('send({ type: "webinar_update", event: E.slug, email: registeredEmail, company: f.get("company"), role: f.get("role"), country: f.get("country") })'));
  assert.ok(html.includes('name="consent"'));
  assert.ok(html.includes('id="more"'));
  assert.ok(html.includes('id="s-wa"'));
  assert.ok(html.includes('waHint: "Te avisamos por aquí el día del evento con el enlace para entrar."'));
  assert.ok(html.includes("start: \"2026-11-12T16:00:00Z\""));
  assert.ok(html.includes("duration: 90"));
});
