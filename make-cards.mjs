// Card factory for the HID webinar speaker announcements.
// Writes one 1080x1080 HTML per speaker; a headless Chrome loop screenshots each to PNG.
// Reusable: add a speaker to SPEAKERS and rerun. Run: node make-cards.mjs
import { writeFileSync } from 'fs';

const SPEAKERS = [
  { slug:'ricardo', role:'Moderador', name:'Ricardo<br>Moreira', line1:'CISO · Especialista em SOC', line2:'e Resposta a Incidentes', photo:'ricardo_foto.jpeg' },
  { slug:'deborah', role:'Painelista', name:'Deborah<br>Nardy', line1:'Regional Sales Manager', line2:'HID Global Brasil', photo:'deborah_foto.jpeg' },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  :root{--bg:#040A14;--text:#fafafa;--text2:#94a3b8;--hid-blue:#1A56A8;--hid-medium:#2E6FC2;--hid-light:#5B9BD5;--hid-orange:#E8912D;--hid-yellow:#F2C94C}
  *{margin:0;padding:0;box-sizing:border-box}
  body{margin:0;background:var(--bg)}
  .card{width:1080px;height:1080px;position:relative;overflow:hidden;font-family:'Inter',sans-serif;color:var(--text);
    background:radial-gradient(1200px 700px at 78% -10%,rgba(26,86,168,.38),transparent 60%),radial-gradient(900px 600px at 0% 110%,rgba(46,111,194,.20),transparent 55%),linear-gradient(155deg,#040A14 0%,#091C3E 55%,#0D2240 100%)}
  .card::after{content:"";position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(125deg,rgba(91,155,213,.05) 0 2px,transparent 2px 46px);mask:linear-gradient(160deg,transparent 40%,#000 100%)}
  .inner{position:absolute;inset:0;padding:72px 76px;display:flex;flex-direction:column;z-index:2}
  .top{display:flex;align-items:center;justify-content:space-between}
  .hid-logo{height:52px}
  .oficial{font-size:15px;font-weight:600;letter-spacing:2.5px;color:var(--hid-light);text-transform:uppercase;border:1px solid rgba(91,155,213,.35);border-radius:100px;padding:9px 18px}
  .body{flex:1;display:flex;align-items:center;gap:56px;margin-top:26px}
  .photo-wrap{flex-shrink:0;position:relative}
  .photo{width:400px;height:480px;object-fit:cover;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
  .photo-wrap::before{content:"";position:absolute;inset:-3px;border-radius:21px;background:linear-gradient(150deg,var(--hid-medium),var(--hid-orange));z-index:-1;opacity:.9}
  .txt{flex:1}
  .role-badge{display:inline-block;background:linear-gradient(135deg,var(--hid-orange),var(--hid-yellow));color:#0D2240;font-size:22px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:11px 24px;border-radius:100px;margin-bottom:26px}
  .name{font-size:70px;font-weight:800;line-height:1.03;letter-spacing:-1.5px}
  .role{font-size:30px;font-weight:600;color:var(--hid-light);margin-top:16px;line-height:1.3}
  .company{font-size:24px;font-weight:500;color:var(--text2);margin-top:6px}
  .bottom{margin-top:26px;border-top:1px solid rgba(91,155,213,.22);padding-top:30px;display:flex;align-items:flex-end;justify-content:space-between}
  .ev-label{font-size:16px;font-weight:600;letter-spacing:2px;color:var(--hid-orange);text-transform:uppercase}
  .ev-title{font-size:38px;font-weight:800;margin-top:8px;letter-spacing:-.5px}
  .ev-meta{margin-top:12px;font-size:22px;color:var(--text2)}
  .ev-meta b{color:var(--text)}
  .date-chip{text-align:center;background:var(--hid-blue);border-radius:16px;padding:20px 30px;flex-shrink:0}
  .date-chip .d{font-size:52px;font-weight:900;line-height:1;color:#fff}
  .date-chip .m{font-size:18px;font-weight:700;letter-spacing:2px;color:var(--hid-yellow);text-transform:uppercase;margin-top:6px}
  .url{margin-top:22px;font-size:20px;color:var(--hid-light);font-weight:600}
`;

const card = (s) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="card"><div class="inner">
  <div class="top"><img class="hid-logo" src="hid-logo.png" alt="HID"><span class="oficial">Webinar Oficial</span></div>
  <div class="body">
    <div class="photo-wrap"><img class="photo" src="${s.photo}" alt="${s.name.replace(/<br>/g,' ')}"></div>
    <div class="txt">
      <span class="role-badge">${s.role}</span>
      <div class="name">${s.name}</div>
      <div class="role">${s.line1}</div>
      ${s.line2 ? `<div class="company">${s.line2}</div>` : ''}
    </div>
  </div>
  <div class="bottom">
    <div>
      <div class="ev-label">Blindagem de Identidade Híbrida</div>
      <div class="ev-title">Resiliência de acesso<br>frente a ransomware</div>
      <div class="ev-meta"><b>11h</b> Brasília · online · gratuito</div>
      <div class="url">webinar-limitless.vercel.app</div>
    </div>
    <div class="date-chip"><div class="d">13</div><div class="m">Ago</div></div>
  </div>
</div></div></body></html>`;

for (const s of SPEAKERS) {
  writeFileSync(new URL(`./card-${s.slug}.html`, import.meta.url), card(s));
  console.log(`wrote card-${s.slug}.html`);
}
