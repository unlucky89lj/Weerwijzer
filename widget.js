// Weer & Alarm – widget voor Scriptable (iPhone)
// Werkt als klein, middel, groot en op het vergrendelscherm. Tik om de app te openen.
//
// Parameter (lang indrukken → Wijzig widget → Parameter). Laat leeg voor je huidige locatie.
// Je kunt delen combineren met ";", bijvoorbeeld:  fiets; 52.37,4.89
//   fiets          → fietsweer per uur met het beste moment (middel)
//   regen          → regenbalkje voor de komende 2 uur (middel)
//   compact        → altijd de compacte weergave, ook als het rustig is (middel)
//   standby        → groot en wit op zwart, voor StandBy naast je bed (klein)
//   52.37,4.89     → vaste plek (breedte,lengte)
//   Thuis=Lisse; Werk=Leiden   → twee plekken naast elkaar (middel). Eén naam = huidige plek + die plek.

const APP_URL = "https://unlucky89lj.github.io/Weerwijzer/";

const WMO = {0:"Helder",1:"Overwegend helder",2:"Half bewolkt",3:"Bewolkt",45:"Mist",48:"Rijpmist",
  51:"Lichte motregen",53:"Motregen",55:"Dichte motregen",56:"Onderkoelde motregen",57:"Onderkoelde motregen",
  61:"Lichte regen",63:"Regen",65:"Zware regen",66:"IJzel",67:"Zware ijzel",71:"Lichte sneeuw",73:"Sneeuw",
  75:"Zware sneeuw",77:"Korrelsneeuw",80:"Lichte buien",81:"Buien",82:"Zware buien",85:"Sneeuwbuien",
  86:"Zware sneeuwbuien",95:"Onweer",96:"Onweer met hagel",99:"Zwaar onweer met hagel"};
const SHORT = (c, night) => c<=1?(night?"helder":"zonnig"):c===2?"half bewolkt":c===3?"bewolkt":c<=48?"mist":c<=57?"motregen":c<=67?"regen":c<=77?"sneeuw":c<=82?"buien":c<=86?"sneeuwbuien":"onweer";
const SYMBOL = c => c===0||c===1 ? "sun.max.fill" : c===2 ? "cloud.sun.fill" : c===3 ? "cloud.fill" :
  c===45||c===48 ? "cloud.fog.fill" : c>=51&&c<=57 ? "cloud.drizzle.fill" : c>=61&&c<=67 ? "cloud.rain.fill" :
  c>=71&&c<=77 ? "cloud.snow.fill" : c>=80&&c<=82 ? "cloud.heavyrain.fill" : c>=85&&c<=86 ? "cloud.snow.fill" : "cloud.bolt.rain.fill";
const NIGHT_SYMBOL = c => c<=1 ? moon(Date.now()).sym : c===2 ? "cloud.moon.fill" : SYMBOL(c);
const HSYM = (f, i) => (f.is_day && f.is_day[i] === 0) ? (f.weather_code[i] <= 1 ? "moon.stars.fill" : NIGHT_SYMBOL(f.weather_code[i])) : SYMBOL(f.weather_code[i]);

// Zelfde kleuren als de achtergrond in de app (overdag iets donkerder voor leesbare witte tekst)
const GRAD = { clear:["#2470b5","#4f9fd8"], partly:["#2f74ad","#5f9bc9"], cloudy:["#4d6676","#7d93a0"],
  fog:["#5f6f78","#8e9ba1"], rain:["#2c4152","#526a7c"], storm:["#151c25","#33404e"], snow:["#5f7a8d","#93a9b8"] };
const NIGHT = { clear:["#07122a","#1b3263"], partly:["#0b1730","#24395e"], cloudy:["#141d27","#2d3a46"],
  fog:["#1d252b","#3c474e"], rain:["#0f1820","#26343f"], storm:["#090d12","#1e2630"], snow:["#1e2833","#3d4b58"] };
const GOLD = { dawn:["#3c5b93","#c98fae","#f7c27e"], dusk:["#2a2c66","#b4618a","#f2955a"] };
const WARN = ["#ff6a2b","#c2410c"];
const kindOf = c => c>=95?"storm":[71,73,75,77,85,86].includes(c)?"snow":(c>=51&&c<=67)||(c>=80&&c<=82)?"rain":
  (c===45||c===48)?"fog":c===3?"cloudy":c===2?"partly":"clear";
const nl = v => String(Math.round(v*10)/10).replace(".", ",");
const hm = t => t.slice(11, 16);
const DIRS = ["N","NO","O","ZO","Z","ZW","W","NW"];
const ARROWS = ["↑","↗","→","↘","↓","↙","←","↖"]; // richting waar de wind heen waait
const windTxt = (dir, spd) => `uit ${DIRS[Math.round(dir/45)%8]} ${ARROWS[Math.round(((dir+180)%360)/45)%8]} ${Math.round(spd)} km/u`;
const dur = m => m >= 60 ? `${Math.floor(m/60)} u${m%60 ? " " + (m%60) + " m" : ""}` : `${m} min`;

function sunPos(lat, lon, dt) {
  const r = Math.PI/180, d = dt/864e5 + 2440587.5 - 2451545, g = (357.529 + .98560028*d)*r, q = 280.459 + .98564736*d;
  const Lm = (q + 1.915*Math.sin(g) + .02*Math.sin(2*g))*r, e = (23.439 - 3.6e-7*d)*r;
  const dec = Math.asin(Math.sin(e)*Math.sin(Lm)), ra = Math.atan2(Math.cos(e)*Math.sin(Lm), Math.cos(Lm))/r;
  let ha = ((18.697374558 + 24.06570982441908*d) % 24)*15 + lon - ra; ha = ((ha + 540) % 360) - 180;
  return { el: Math.asin(Math.sin(lat*r)*Math.sin(dec) + Math.cos(lat*r)*Math.cos(dec)*Math.cos(ha*r))/r, ha };
}
function moon(dt) {
  const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14), age = (((dt - ref)/864e5) % syn + syn) % syn, fr = (1 - Math.cos(2*Math.PI*age/syn))/2;
  const n = age<1.85?"Nieuwe maan":age<5.54?"Wassende sikkel":age<9.23?"Eerste kwartier":age<12.92?"Wassende maan":age<16.61?"Volle maan":age<20.30?"Afnemende maan":age<23.99?"Laatste kwartier":age<27.68?"Afnemende sikkel":"Nieuwe maan";
  const sym = age<1.85||age>=27.68?"moon.stars.fill":age<5.54?"moonphase.waxing.crescent":age<9.23?"moonphase.first.quarter":age<12.92?"moonphase.waxing.gibbous":age<16.61?"moonphase.full.moon":age<20.30?"moonphase.waning.gibbous":age<23.99?"moonphase.last.quarter":"moonphase.waning.crescent";
  return { n, pct: Math.round(fr*100), sym };
}
function mix(a, b, t) {
  const p = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16)), x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i]-v)*t).toString(16).padStart(2, "0")).join("");
}

// ---------- parameter ----------
function parseParam() {
  const out = { mode: "", fixed: null, places: [] };
  for (const raw of (args.widgetParameter || "").split(";")) {
    const t = raw.trim(); if (!t) continue;
    const low = t.toLowerCase();
    if (["fiets","regen","compact","standby"].includes(low)) { out.mode = low; continue; }
    if (t.includes("=")) { const [name, val] = t.split("=").map(x => x.trim()); if (name && val) out.places.push({ name, val }); continue; }
    const m = t.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (m) out.fixed = { lat: +m[1], lon: +m[2], name: null };
  }
  return out;
}
async function geocode(val) {
  const m = val.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return { lat: +m[1], lon: +m[2] };
  try {
    const d = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=nl&name=${encodeURIComponent(val)}`, "wa-geo-" + val.replace(/\W/g, "") + ".json");
    const r = d.results && d.results[0]; return r ? { lat: r.latitude, lon: r.longitude } : null;
  } catch (e) { return null; }
}
async function here(P) {
  if (P.fixed) return P.fixed;
  try {
    Location.setAccuracyToThreeKilometers();
    const l = await Location.current();
    let name = null;
    try { const g = await Location.reverseGeocode(l.latitude, l.longitude, "nl_NL"); name = g[0] && (g[0].locality || g[0].name); } catch (e) {}
    return { lat: l.latitude, lon: l.longitude, name };
  } catch (e) { return { lat: 52.373, lon: 4.89, name: "Amsterdam" }; }
}

// ---------- data ----------
async function getJSON(u, cacheName) {
  const fm = FileManager.local(), path = fm.joinPath(fm.cacheDirectory(), cacheName);
  try { const d = await new Request(u).loadJSON(); fm.writeString(path, JSON.stringify(d)); return d; }
  catch (e) { if (fm.fileExists(path)) { const d = JSON.parse(fm.readString(path)); d._offline = true; return d; } throw e; }
}
async function getWeather(loc, tag = "") {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day` +
    `&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,snowfall,weather_code,wind_gusts_10m,is_day,uv_index&past_hours=24&forecast_hours=12` +
    `&minutely_15=precipitation&forecast_minutely_15=8` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset,daylight_duration&forecast_days=4&timezone=auto`;
  return getJSON(u, "weer-alarm-widget" + tag + ".json");
}
async function getPollen(loc) {
  try {
    const d = await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=grass_pollen,birch_pollen,alder_pollen&timezone=auto`, "weer-alarm-pollen.json");
    const c = d.current || {}, hi = [];
    if ((c.grass_pollen || 0) >= 50) hi.push("gras");
    if ((c.birch_pollen || 0) >= 100) hi.push("berk");
    if ((c.alder_pollen || 0) >= 100) hi.push("els");
    return hi;
  } catch (e) { return []; }
}
function future(d) {
  const h = d.hourly, now = d.current.time.slice(0, 13);
  let i0 = h.time.findIndex(t => t.slice(0, 13) === now); if (i0 < 0) i0 = 0;
  const f = { i0 };
  for (const k of Object.keys(h)) f[k] = h[k].slice(i0);
  return f;
}

// ---------- berekeningen (zelfde als in de app) ----------
function hoursUntil(t) { return Math.max(0, Math.round((new Date(t).getTime() - Date.now())/36e5)); }
function signals(d, f, pollen) {
  const c = d.current, out = [];
  const gust = Math.max(c.wind_gusts_10m, ...f.wind_gusts_10m), minT = Math.min(c.temperature_2m, ...f.temperature_2m);
  const when = i => { if (i <= 0) return { cd: "nu" }; const h = hoursUntil(f.time[i]); return { cd: h < 1 ? "binnen 1 u" : `over ${h} u`, t: hm(f.time[i]) }; };
  const iz = f.weather_code.findIndex(x => [56,57,66,67].includes(x));
  const gl = f.time.findIndex((t, i) => (f.snowfall[i] || 0) > 0 || ((f.precipitation[i] || 0) > 0 && f.temperature_2m[i] <= 1));
  if (iz >= 0) { const w = when(iz); out.push({ t: `IJzel ${w.cd}` + (w.t ? ` (vanaf ${w.t})` : ""), short: "IJzel " + (w.t || "nu"), sub: "Spiegelglad. Eigen inschatting, geen KNMI-waarschuwing.", lvl: "hi" }); }
  else if (gl >= 0) { const w = when(gl); out.push({ t: `Glad ${w.cd}` + (w.t ? ` (vanaf ${w.t})` : ""), short: "Glad " + (w.t || "nu"), sub: `Neerslag bij ${nl(minT)} °C. Eigen inschatting.`, lvl: "hi" }); }
  else if (minT <= 1 && c.relative_humidity_2m > 85) {
    const i = c.temperature_2m <= 1 ? 0 : f.temperature_2m.findIndex(t => t <= 1), w = when(i);
    out.push({ t: "Kans op rijp" + (w.t ? ` ${w.cd} (vanaf ${w.t})` : ""), short: "Rijp " + (w.t || "nu"), sub: `Vochtig en het koelt af tot ${nl(minT)} °C. Eigen inschatting.`, lvl: "lo" });
  }
  if (gust >= 75) { const w = when(c.wind_gusts_10m >= 75 ? 0 : f.wind_gusts_10m.findIndex(g => g >= 75)); out.push({ t: `Zware windstoten ${Math.round(gust)} km/u ${w.cd}`, short: `Storm ${w.t || "nu"}`, sub: "Blijf uit de buurt van bomen.", lvl: "hi" }); }
  else if (gust >= 60) { const w = when(c.wind_gusts_10m >= 60 ? 0 : f.wind_gusts_10m.findIndex(g => g >= 60)); out.push({ t: `Harde windstoten ${Math.round(gust)} km/u ${w.cd}`, short: `Wind ${Math.round(gust)}`, sub: "", lvl: "lo" }); }
  const on = f.weather_code.findIndex(x => x >= 95);
  if (on >= 0) { const w = when(on); out.push({ t: `Onweer ${w.cd}` + (w.t ? ` (vanaf ${w.t})` : ""), short: "Onweer " + (w.t || "nu"), sub: "", lvl: "hi" }); }
  if (pollen.length) out.push({ t: "Hooikoorts: " + pollen.join(", "), short: "Pollen", sub: "Veel pollen in de lucht.", lvl: "lo" });
  return out.sort((a, b) => (a.lvl === "hi" ? 0 : 1) - (b.lvl === "hi" ? 0 : 1));
}
function rainLine(d, f) {
  const c = d.current, m = d.minutely_15 || {}, p = m.precipitation || [], t = m.time || [], wet = v => v >= 0.1, now = Date.now();
  const mins = i => Math.max(5, Math.round((new Date(t[i]).getTime() - now)/6e4));
  if (p.length) {
    if (wet(c.precipitation) || wet(p[0])) { const j = p.findIndex(v => !wet(v)); return j < 0 ? "Regen houdt nog 2 uur aan" : j === 0 ? "Regen stopt zo" : `Droog over ${mins(j)} min`; }
    const i = p.findIndex(wet); if (i >= 0) return `Over ${mins(i)} min regen`;
  }
  const k = f.precipitation.findIndex(wet); return k < 0 ? "Komende 12 uur droog" : `Droog tot ${hm(f.time[k])}`;
}
function ptype(f) {
  for (let i = 0; i < f.time.length; i++) {
    const w = f.weather_code[i], t = f.temperature_2m[i], sn = f.snowfall[i] || 0, pr = f.precipitation[i] || 0, at = i === 0 ? "nu" : hm(f.time[i]);
    if (w === 96 || w === 99) return `Hagel ${at}`;
    if ([56,57,66,67].includes(w)) return `IJzel ${at}`;
    if (sn > 0 && t > 0.5 && t <= 3 && pr > sn*0.7) return `Natte sneeuw ${at}`;
    if (sn > 0) return `Sneeuw ${at}`;
  }
  return null;
}
function clothes(fl, gust, rainSoon) {
  const a = fl<=-5?"Winterjas, muts, handschoenen":fl<=2?"Dikke jas, handschoenen":fl<=8?"Warme jas":fl<=14?"Jas of dikke trui":fl<=20?"Trui of dun jasje":fl<=26?"T-shirt":"Luchtig, drink genoeg";
  return a + (rainSoon ? ", paraplu" : "") + (gust >= 50 ? ", harde wind" : "");
}
const bikeScore = (fl, rain, gust) => Math.max(1, Math.min(10, Math.round(10 - Math.min(6, rain*4) - Math.max(0, (gust-20)/8) - (fl<5?(5-fl)/3:0) - (fl>28?(fl-28)/2:0))));
const bikeWhy = (fl, rain, gust) => rain >= 0.2 ? "regen" : gust >= 35 ? "harde wind" : fl < 2 ? "kou" : fl > 28 ? "hitte" : "";
const bikeCol = s => s >= 7 ? "#2f9e6b" : s >= 5 ? "#f2c94c" : "#e5533d";
const bikeFg = s => s >= 5 && s < 7 ? new Color("#1a1300") : Color.white();
function sunInfo(d) {
  const dl = d.daily; if (!dl || !dl.sunrise) return null;
  const now = Date.now(), rise = new Date(dl.sunrise[0]).getTime(), set = new Date(dl.sunset[0]).getTime();
  const rise2 = dl.sunrise[1] ? new Date(dl.sunrise[1]).getTime() : rise + 864e5;
  if (now < rise) return { txt: `Zon op over ${dur(Math.round((rise-now)/6e4))} (${hm(dl.sunrise[0])})`, prog: 0, day: false };
  if (now < set) return { txt: `Zon onder over ${dur(Math.round((set-now)/6e4))} (${hm(dl.sunset[0])})`, prog: (now-rise)/(set-rise), day: true };
  return { txt: `Zon op over ${dur(Math.round((rise2-now)/6e4))} (${hm(dl.sunrise[1] || dl.sunrise[0])})`, prog: 1, day: false };
}
function uvInfo(d, f, day) {
  if (!day || !d.daily || !d.daily.uv_index_max) return null;
  const mx = d.daily.uv_index_max[0]; if (mx == null || mx < 6) return null;
  const today = d.current.time.slice(0, 10); let bi = -1, bv = -1;
  (f.uv_index || []).forEach((v, i) => { if (f.time[i].slice(0, 10) === today && v > bv) { bv = v; bi = i; } });
  return `Smeren: UV ${Math.round(mx)}` + (bi >= 0 ? ` rond ${hm(f.time[bi])}` : "");
}
function isCalm(d, f, sig) {
  return !sig.length && !f.precipitation.some(v => v >= 0.1) && Math.max(d.current.wind_gusts_10m, ...f.wind_gusts_10m) < 40 && !ptype(f);
}
function calmSentence(d, f) {
  const c = d.current, mx = Math.max(...f.temperature_2m), mn = Math.min(...f.temperature_2m);
  const feel = mx >= 24 ? "warm" : mx >= 14 ? "zacht" : mx >= 8 ? "fris" : mn <= 0 ? "koud" : "koel";
  return `Droog en ${feel} weer${c.is_day ? ", de rest van de dag" : " vannacht"}.`;
}
function tomorrow(d) {
  const dl = d.daily; if (!dl || !dl.temperature_2m_max || dl.temperature_2m_max.length < 2) return "";
  const p = dl.precipitation_sum ? dl.precipitation_sum[1] : 0;
  return `Morgen ${Math.round(dl.temperature_2m_max[1])}° · ${p >= 1 ? SHORT(dl.weather_code[1]) + " (" + nl(p) + " mm)" : SHORT(dl.weather_code[1])}`;
}

// ---------- tekenen ----------
const soft = a => new Color("#ffffff", a);
function txt(stack, s, size, opts = {}) {
  const t = stack.addText(s);
  t.font = opts.bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = opts.color || Color.white();
  t.lineLimit = opts.lines || 1;
  t.minimumScaleFactor = opts.min || 0.7;
  return t;
}
function sfImg(stack, name, size, alpha = 1) {
  const sf = SFSymbol.named(name) || SFSymbol.named("cloud.fill"); if (!sf) return null;
  sf.applyFont(Font.systemFont(size));
  const im = stack.addImage(sf.image); im.imageSize = new Size(size, size); im.tintColor = soft(alpha);
  return im;
}
function pill(stack, text, bg, fg = Color.white(), size = 11) {
  const s = stack.addStack(); s.backgroundColor = new Color(bg); s.cornerRadius = 7; s.setPadding(2, 7, 2, 7);
  txt(s, text, size, { bold: true, color: fg, min: 0.6 }); return s;
}
function sunBar(prog, w = 300) {
  const ctx = new DrawContext(); ctx.size = new Size(w, 14); ctx.opaque = false; ctx.respectScreenScale = true;
  ctx.setFillColor(soft(0.22)); const p = new Path(); p.addRoundedRect(new Rect(0, 5, w, 4), 2, 2); ctx.addPath(p); ctx.fillPath();
  ctx.setFillColor(soft(0.55)); const q = new Path(); q.addRoundedRect(new Rect(0, 5, Math.max(4, w*prog), 4), 2, 2); ctx.addPath(q); ctx.fillPath();
  ctx.setFillColor(new Color("#ffd34d")); ctx.fillEllipse(new Rect(Math.min(w-14, Math.max(0, w*prog-7)), 0, 14, 14));
  return ctx.getImage();
}
function rainBars(p, w = 300, h = 40) {
  const ctx = new DrawContext(); ctx.size = new Size(w, h); ctx.opaque = false; ctx.respectScreenScale = true;
  const n = p.length, gap = 4, bw = (w - gap*(n-1))/n, mx = Math.max(2, ...p);
  p.forEach((v, i) => {
    const bh = v < 0.1 ? 3 : Math.max(6, (v/mx)*h);
    ctx.setFillColor(v < 0.1 ? soft(0.25) : new Color(v >= 4 ? "#a78bfa" : v >= 1 ? "#3b82f6" : "#7cc4ff"));
    const r = new Path(); r.addRoundedRect(new Rect(i*(bw+gap), h-bh, bw, bh), 2, 2); ctx.addPath(r); ctx.fillPath();
  });
  return ctx.getImage();
}
function background(w, d, sig, loc, mode) {
  if (mode === "standby") { w.backgroundColor = Color.black(); return false; }
  const c = d.current, day = c.is_day !== 0, kind = kindOf(c.weather_code), severe = sig.some(x => x.lvl === "hi");
  const se = sunPos(loc.lat, loc.lon, new Date());
  const gold = se.el > -5 && se.el < 7 && ["clear","partly","cloudy"].includes(kind) ? (se.ha < 0 ? "dawn" : "dusk") : "";
  let cols = severe ? WARN : gold ? GOLD[gold] : (day ? GRAD : NIGHT)[kind];
  if (!severe && c.temperature_2m <= 0) cols = cols.map(x => mix(x, "#7fb8ff", 0.22));
  if (!severe && c.temperature_2m >= 28) cols = cols.map(x => mix(x, "#ff8a3d", 0.25));
  const g = new LinearGradient(); g.colors = cols.map(x => new Color(x)); g.locations = cols.length === 3 ? [0, 0.55, 1] : [0, 1];
  w.backgroundGradient = g;
  return severe;
}
function topIcon(d, severe) { const c = d.current; return severe ? "exclamationmark.triangle.fill" : c.is_day !== 0 ? SYMBOL(c.weather_code) : NIGHT_SYMBOL(c.weather_code); }
function footer(w, d) { txt(w, (d._offline ? "Offline · " : "Bijgewerkt ") + new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }), 9, { color: soft(0.6) }); }
function hourRow(w, f, step, withProb) {
  const row = w.addStack(); const idx = [];
  for (let i = 0; i < f.time.length && idx.length < 6; i += step) idx.push(i);
  idx.forEach((i, k) => {
    const col = row.addStack(); col.layoutVertically(); col.size = new Size(44, 0);
    const a = col.addStack(); a.addSpacer(); txt(a, i === 0 ? "Nu" : hm(f.time[i]), 11, { color: soft(0.8) }); a.addSpacer();
    col.addSpacer(2);
    const b = col.addStack(); b.addSpacer(); sfImg(b, HSYM(f, i), 18); b.addSpacer();
    col.addSpacer(2);
    const t = col.addStack(); t.addSpacer(); txt(t, `${Math.round(f.temperature_2m[i])}°`, 13, { bold: true }); t.addSpacer();
    if (withProb) { const p = col.addStack(); p.addSpacer(); txt(p, `${f.precipitation_probability[i] ?? 0}%`, 10, { color: new Color("#bfe3ff") }); p.addSpacer(); }
    if (k < idx.length - 1) row.addSpacer();
  });
}
function iconRow(w, sym, text, bold = false, size = 12.5) {
  const r = w.addStack(); r.centerAlignContent();
  const ic = r.addStack(); ic.size = new Size(20, 16); sfImg(ic, sym, 14, 0.9);
  r.addSpacer(7); txt(r, text, size, { bold, min: 0.6 });
  return r;
}

// ---------- weergaven ----------
function viewSmall(w, d, f, sig, loc, severe) {
  const c = d.current; w.url = APP_URL + "#now";
  const top = w.addStack(); top.centerAlignContent();
  const left = top.addStack(); left.layoutVertically();
  txt(left, loc.name || "Mijn locatie", 13, { bold: true });
  txt(left, WMO[c.weather_code] || "", 11, { color: soft(0.85) });
  top.addSpacer(); sfImg(top, topIcon(d, severe), 22);
  w.addSpacer(2);
  const tr = w.addStack(); tr.bottomAlignContent();
  txt(tr, `${Math.round(c.temperature_2m)}°`, 34, { bold: true }); tr.addSpacer(6);
  txt(tr, `voelt ${Math.round(c.apparent_temperature)}°`, 11, { color: soft(0.85) });
  w.addSpacer(4);
  const pt = ptype(f);
  if (sig.length) { const s = w.addStack(); s.backgroundColor = new Color("#1a0a02", 0.72); s.cornerRadius = 7; s.setPadding(2, 6, 2, 6); txt(s, sig[0].short, 11, { bold: true, min: 0.6 }); }
  else txt(w, pt || rainLine(d, f), 11, { bold: true, min: 0.6, lines: 2 });
  w.addSpacer(); footer(w, d);
}
function viewStandby(w, d, f, sig, loc) {
  const c = d.current; w.url = APP_URL + "#now"; w.setPadding(10, 12, 10, 12);
  txt(w, loc.name || "Mijn locatie", 13, { bold: true, color: soft(0.8) });
  txt(w, `${Math.round(c.temperature_2m)}°`, 64, { bold: true, min: 0.5 });
  txt(w, `Voelt ${Math.round(c.apparent_temperature)}° · ${SHORT(c.weather_code, c.is_day === 0)}`, 12, { color: soft(0.85) });
  w.addSpacer(4);
  if (sig.length) txt(w, "⚠︎ " + sig[0].short, 13, { bold: true, color: new Color("#f6cf6b") });
  else txt(w, rainLine(d, f), 12, { color: soft(0.85), lines: 2 });
}
function viewMediumCompact(w, d, f, sig, loc, severe) {
  const c = d.current; w.setPadding(12, 14, 10, 14);
  const top = w.addStack(); top.centerAlignContent(); top.url = APP_URL + "#now";
  const L = top.addStack(); L.layoutVertically();
  const tr = L.addStack(); tr.centerAlignContent();
  sfImg(tr, topIcon(d, severe), 30); tr.addSpacer(8);
  txt(tr, `${Math.round(c.temperature_2m)}°`, 34, { bold: true, min: 0.6 });
  L.addSpacer(2);
  txt(L, sig.length ? sig[0].short : ptype(f) || (WMO[c.weather_code] || ""), 14, { bold: true, min: 0.55 });
  txt(L, `${loc.name ? loc.name + " · " : ""}Voelt als ${Math.round(c.apparent_temperature)}°`, 12, { color: soft(0.85), min: 0.55 });
  top.addSpacer();
  const R = top.addStack(); R.layoutVertically(); R.size = new Size(118, 0);
  const gust = Math.max(c.wind_gusts_10m, ...f.wind_gusts_10m.slice(0, 6));
  const rain = f.precipitation.slice(0, 6).reduce((a, b) => a + b, 0);
  const hi = Math.round(d.daily.temperature_2m_max[0]), lo = Math.round(d.daily.temperature_2m_min[0]);
  const line = (sym, text) => { const r = R.addStack(); r.centerAlignContent(); sfImg(r, sym, 14, 0.85); r.addSpacer(6); txt(r, text, 13, { bold: true, min: 0.6 }); R.addSpacer(5); };
  line("wind", `${Math.round(gust)} km/u`);
  line("drop.fill", `${nl(rain)} mm`);
  line("thermometer.medium", `${hi}° / ${lo}°`);
  w.addSpacer();
  const hr = w.addStack(); hr.url = APP_URL + "#uur"; hourRow(hr, f, 2, false);
}
function viewMediumCalm(w, d, f, loc) {
  const c = d.current; w.url = APP_URL + "#now";
  const top = w.addStack(); top.centerAlignContent();
  const left = top.addStack(); left.layoutVertically();
  txt(left, loc.name || "Mijn locatie", 14, { bold: true }); txt(left, WMO[c.weather_code] || "", 12, { color: soft(0.9) });
  top.addSpacer(); sfImg(top, topIcon(d, false), 28);
  w.addSpacer(4);
  const mid = w.addStack(); mid.centerAlignContent();
  txt(mid, `${Math.round(c.temperature_2m)}°`, 48, { bold: true }); mid.addSpacer(12);
  const sm = mid.addStack(); sm.layoutVertically();
  txt(sm, calmSentence(d, f), 15, { bold: true, lines: 2, min: 0.6 });
  const uv = uvInfo(d, f, c.is_day !== 0); if (uv) { sm.addSpacer(3); pill(sm, uv, "#7a3d00"); }
  w.addSpacer();
  txt(w, tomorrow(d), 12, { color: soft(0.9) });
}
function viewMediumBike(w, d, f, loc) {
  const c = d.current; w.url = APP_URL + "#uur";
  const nowS = bikeScore(f.apparent_temperature[0], Math.max(c.precipitation, f.precipitation[0]), Math.max(c.wind_gusts_10m, f.wind_gusts_10m[0]));
  const top = w.addStack(); top.centerAlignContent();
  txt(top, `Fietsweer ${loc.name || ""}`.trim(), 15, { bold: true }); top.addSpacer();
  pill(top, `${nowS}/10`, bikeCol(nowS), bikeFg(nowS), 12);
  w.addSpacer(8);
  const sc = f.time.map((t, i) => ({ t, i, s: i === 0 ? nowS : bikeScore(f.apparent_temperature[i], f.precipitation[i], f.wind_gusts_10m[i]) }));
  const row = w.addStack(); const idx = [0, 2, 4, 6, 8, 10].filter(i => i < sc.length);
  idx.forEach((i, k) => {
    const col = row.addStack(); col.layoutVertically(); col.size = new Size(44, 0);
    const a = col.addStack(); a.addSpacer(); txt(a, i === 0 ? "Nu" : hm(sc[i].t), 11, { color: soft(0.8) }); a.addSpacer();
    col.addSpacer(3);
    const b = col.addStack(); b.addSpacer(); pill(b, String(sc[i].s), bikeCol(sc[i].s), bikeFg(sc[i].s), 12); b.addSpacer();
    if (k < idx.length - 1) row.addSpacer();
  });
  w.addSpacer();
  const day = sc.filter(o => { const h = +o.t.slice(11, 13); return h >= 7 && h <= 21; });
  const best = (day.length ? day : sc).reduce((a, b) => b.s > a.s ? b : a, sc[0]);
  const worst = sc.reduce((a, b) => b.s < a.s ? b : a, sc[0]);
  const why = bikeWhy(f.apparent_temperature[worst.i], f.precipitation[worst.i], f.wind_gusts_10m[worst.i]);
  txt(w, `Beste moment ${best.i === 0 ? "nu" : hm(best.t)}` + (why && worst.s < best.s ? ` · ${worst.i === 0 ? "nu" : "om " + hm(worst.t)} laag door ${why}` : ""), 12, { bold: true, min: 0.6 });
  txt(w, `Voelt ${Math.round(c.apparent_temperature)}° · wind ${windTxt(c.wind_direction_10m, c.wind_speed_10m)}`, 11, { color: soft(0.85), min: 0.6 });
}
function viewMediumRain(w, d, f, loc) {
  const c = d.current, p = (d.minutely_15 && d.minutely_15.precipitation) || []; w.url = APP_URL + "#buien";
  const top = w.addStack(); top.centerAlignContent();
  txt(top, `Buien ${loc.name || ""}`.trim(), 15, { bold: true }); top.addSpacer();
  const dry = !p.some(v => v >= 0.1) && !(c.precipitation >= 0.1);
  if (dry) {
    w.addSpacer();
    txt(w, "Komende 2 uur droog", 20, { bold: true });
    const rl = rainLine(d, f);
    txt(w, rl === "Komende 12 uur droog" ? "De komende 12 uur blijft het droog" : rl.replace("Droog tot", "Regen vanaf"), 12, { color: soft(0.85) });
    w.addSpacer(); return;
  }
  txt(top, rainLine(d, f), 12, { bold: true });
  w.addSpacer(8);
  const im = w.addImage(rainBars(p, 300, 46)); im.imageSize = new Size(300, 46);
  w.addSpacer(3);
  const lab = w.addStack(); txt(lab, "nu", 10, { color: soft(0.75) }); lab.addSpacer();
  const mx = Math.max(...p), mi = p.indexOf(mx), t = d.minutely_15.time[mi];
  txt(lab, mx >= 4 ? `zwaar rond ${hm(t)}` : mx >= 1 ? `matig rond ${hm(t)}` : "licht", 10, { color: soft(0.85) }); lab.addSpacer();
  txt(lab, "+2 uur", 10, { color: soft(0.75) });
}
async function viewMediumTwo(w, P, here0) {
  w.setPadding(12, 12, 12, 12);
  const list = P.places.length >= 2 ? P.places.slice(0, 2) : [{ name: "Hier", val: null }, P.places[0]];
  const panels = [];
  for (let k = 0; k < 2; k++) {
    const pl = list[k]; const loc = pl.val ? await geocode(pl.val) : here0;
    if (!loc) { panels.push({ name: pl.name, err: true }); continue; }
    try { const d = await getWeather(loc, "-p" + k); const f = future(d); panels.push({ name: pl.name + (pl.val && !/\d/.test(pl.val) ? " · " + pl.val : ""), d, f, sig: signals(d, f, []), loc }); }
    catch (e) { panels.push({ name: pl.name, err: true }); }
  }
  const main = panels.find(p => !p.err);
  if (main) background(w, main.d, panels.flatMap(p => p.sig || []), main.loc, "");
  else w.backgroundColor = new Color("#0f3b47");
  w.url = APP_URL + "#now";
  const row = w.addStack();
  panels.forEach((p, k) => {
    const box = row.addStack(); box.layoutVertically(); box.backgroundColor = new Color("#000000", 0.18); box.cornerRadius = 14; box.setPadding(8, 10, 8, 10); box.size = new Size(150, 130);
    txt(box, p.name, 13, { bold: true, min: 0.6 });
    if (p.err) { txt(box, "Plaats niet gevonden", 11, { color: soft(0.8), lines: 2 }); }
    else {
      box.addSpacer(4);
      const tr = box.addStack(); tr.centerAlignContent(); txt(tr, `${Math.round(p.d.current.temperature_2m)}°`, 32, { bold: true }); tr.addSpacer(); sfImg(tr, topIcon(p.d, false), 22);
      box.addSpacer(2);
      txt(box, `${SHORT(p.d.current.weather_code, p.d.current.is_day === 0)} · voelt ${Math.round(p.d.current.apparent_temperature)}°`, 11, { color: soft(0.9), min: 0.6 });
      box.addSpacer();
      if (p.sig.length) txt(box, "⚠︎ " + p.sig[0].short, 11, { bold: true, color: new Color("#f6cf6b"), min: 0.6 });
      else txt(box, rainLine(p.d, p.f), 11, { bold: true, min: 0.6, lines: 2 });
    }
    if (k === 0) row.addSpacer(8);
  });
}
function viewLarge(w, d, f, sig, loc, severe) {
  const c = d.current, day = c.is_day !== 0; w.setPadding(14, 16, 12, 16);
  const head = w.addStack(); head.layoutVertically(); head.url = APP_URL + "#now";
  const top = head.addStack(); top.centerAlignContent();
  const L = top.addStack(); L.layoutVertically();
  txt(L, loc.name || "Mijn locatie", 15, { bold: true }); txt(L, WMO[c.weather_code] || "", 13, { color: soft(0.88) });
  top.addSpacer(); sfImg(top, topIcon(d, severe), 32);
  const tr = head.addStack(); tr.bottomAlignContent();
  txt(tr, `${Math.round(c.temperature_2m)}°`, 46, { bold: true }); tr.addSpacer(10);
  const fs = tr.addStack(); fs.layoutVertically();
  txt(fs, `Voelt als ${Math.round(c.apparent_temperature)}°`, 14, { color: soft(0.92) });
  const yIdx = f.i0 - 24;
  if (yIdx >= 0) { const diff = Math.round(c.temperature_2m - d.hourly.temperature_2m[yIdx]); txt(fs, diff === 0 ? "Even warm als gisteren" : `${Math.abs(diff)}° ${diff < 0 ? "kouder" : "warmer"} dan gisteren`, 11, { color: soft(0.8) }); }
  fs.addSpacer(6);
  const uv = uvInfo(d, f, day); if (uv) { tr.addSpacer(); const u = tr.addStack(); u.layoutVertically(); pill(u, uv, "#7a3d00"); u.addSpacer(10); }

  w.addSpacer(6);
  const pt = ptype(f);
  iconRow(w, "wind", `Wind ${windTxt(c.wind_direction_10m, c.wind_speed_10m)} · stoten ${Math.round(c.wind_gusts_10m)}`); w.addSpacer(3);
  iconRow(w, pt ? "cloud.sleet.fill" : "cloud.rain", pt ? `${pt} · ${rainLine(d, f)}` : rainLine(d, f), !!pt); w.addSpacer(3);
  const rainSoon = f.precipitation.slice(0, 4).some(v => v >= 0.2);
  iconRow(w, "tshirt", clothes(c.apparent_temperature, c.wind_gusts_10m, rainSoon)); w.addSpacer(3);
  const nowS = bikeScore(c.apparent_temperature, c.precipitation, c.wind_gusts_10m);
  const sc = f.time.map((t, i) => ({ t, s: bikeScore(f.apparent_temperature[i], f.precipitation[i], f.wind_gusts_10m[i]) }));
  const d7 = sc.filter(o => { const h = +o.t.slice(11, 13); return h >= 7 && h <= 21; });
  const best = (d7.length ? d7 : sc).reduce((a, b) => b.s > a.s ? b : a, sc[0]);
  iconRow(w, "bicycle", `Fietsweer nu ${nowS}/10` + (best && best.s > nowS ? ` · beste ${hm(best.t)} (${best.s}/10)` : "")); w.addSpacer(3);
  const si = sunInfo(d);
  if (si) {
    iconRow(w, si.day ? "sunset" : "sunrise", si.txt + (!day ? ` · ${moon(Date.now()).n.toLowerCase()}` : "")); w.addSpacer(4);
    const im = w.addImage(sunBar(si.prog, 306)); im.imageSize = new Size(306, 14);
  }
  if (sig.length) {
    w.addSpacer(6);
    const s = sig[0], box = w.addStack(); box.layoutVertically(); box.cornerRadius = 12; box.setPadding(6, 10, 6, 10); box.url = APP_URL + "#now";
    box.backgroundColor = severe ? new Color("#1a0a02", 0.55) : new Color("#2c2410", 0.85);
    txt(box, s.t, 13.5, { bold: true, color: severe ? Color.white() : new Color("#f6cf6b"), min: 0.6 });
    if (s.sub) txt(box, s.sub, 10.5, { color: severe ? soft(0.85) : new Color("#e9c977"), min: 0.6 });
  }
  w.addSpacer();
  const hr = w.addStack(); hr.layoutVertically(); hr.url = APP_URL + "#uur";
  hourRow(hr, f, 2, false);
  const dl = d.daily;
  if (dl && dl.time && dl.time.length > 3) {
    w.addSpacer(5);
    const dr = w.addStack(); dr.centerAlignContent();
    for (let i = 1; i <= 3; i++) {
      const name = new Date(dl.time[i] + "T12:00").toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", "");
      const it = dr.addStack(); it.centerAlignContent();
      txt(it, name.charAt(0).toUpperCase() + name.slice(1, 2) + " ", 11.5, { bold: true });
      sfImg(it, SYMBOL(dl.weather_code[i]), 13); it.addSpacer(4);
      txt(it, `${Math.round(dl.temperature_2m_max[i])}° / ${Math.round(dl.temperature_2m_min[i])}°`, 11.5, { color: soft(0.9) });
      if (i < 3) dr.addSpacer();
    }
  }
  w.addSpacer(3);
}
function viewAccessory(w, fam, d, f, sig, loc) {
  const c = d.current; w.url = APP_URL + "#now";
  if (fam === "accessoryInline") { w.addText(`${Math.round(c.temperature_2m)}° ${loc.name || ""}` + (sig.length ? ` · ${sig[0].short}` : ` · ${SHORT(c.weather_code, c.is_day === 0)}`)); return; }
  w.addAccessoryWidgetBackground = true;
  if (fam === "accessoryCircular") {
    const s = w.addStack(); s.layoutVertically(); s.centerAlignContent();
    if (sig.some(x => x.lvl === "hi")) {
      const a = s.addStack(); a.addSpacer(); sfImg(a, "exclamationmark.triangle.fill", 16); a.addSpacer();
      const b = s.addStack(); b.addSpacer(); txt(b, sig[0].short, 10, { bold: true, min: 0.5 }); b.addSpacer();
    } else {
      const a = s.addStack(); a.addSpacer(); txt(a, `${Math.round(c.temperature_2m)}°`, 20, { bold: true }); a.addSpacer();
      const b = s.addStack(); b.addSpacer(); sfImg(b, topIcon(d, false), 11); b.addSpacer(2); txt(b, `${Math.round(c.apparent_temperature)}°`, 10); b.addSpacer();
    }
    return;
  }
  const top = w.addStack(); top.centerAlignContent();
  txt(top, `${loc.name || "Weer"} ${Math.round(c.temperature_2m)}°`, 14, { bold: true }); top.addSpacer(4); sfImg(top, topIcon(d, false), 13);
  txt(w, `${SHORT(c.weather_code, c.is_day === 0)} · voelt ${Math.round(c.apparent_temperature)}°`, 12);
  txt(w, sig.length ? "⚠︎ " + sig[0].short : rainLine(d, f), 12, { bold: !!sig.length });
}

// ---------- start ----------
async function build() {
  const fam = config.widgetFamily || "large";
  const P = parseParam();
  const w = new ListWidget();
  w.url = APP_URL;
  w.setPadding(14, 14, 14, 14);
  w.refreshAfterDate = new Date(Date.now() + 15*60*1000);
  const loc = await here(P);

  if (fam === "medium" && P.places.length) { await viewMediumTwo(w, P, loc); return w; }

  let d;
  try { d = await getWeather(loc); }
  catch (e) {
    w.backgroundColor = new Color("#0f3b47");
    txt(w, "Weer & Alarm", 14, { bold: true }); w.addSpacer(6);
    txt(w, "Geen verbinding. Probeer het later opnieuw.", 12, { lines: 3 });
    return w;
  }
  const f = future(d);
  const pollen = (fam === "medium" || fam === "large") ? await getPollen(loc) : [];
  const sig = signals(d, f, pollen);

  if (fam.startsWith("accessory")) { viewAccessory(w, fam, d, f, sig, loc); return w; }
  const severe = background(w, d, sig, loc, P.mode);

  if (P.mode === "standby") { viewStandby(w, d, f, sig, loc); return w; }
  if (fam === "small") { viewSmall(w, d, f, sig, loc, severe); return w; }
  if (fam === "large" || fam === "extraLarge") { viewLarge(w, d, f, sig, loc, severe); footer(w, d); return w; }
  if (P.mode === "fiets") viewMediumBike(w, d, f, loc);
  else if (P.mode === "regen") viewMediumRain(w, d, f, loc);
  else if (P.mode !== "compact" && isCalm(d, f, sig)) viewMediumCalm(w, d, f, loc);
  else viewMediumCompact(w, d, f, sig, loc, severe);
  return w;
}

const widget = await build();
if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(widget);
else await widget.presentLarge();
Script.complete();
