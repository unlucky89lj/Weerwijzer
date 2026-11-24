// Weer & Alarm – widget voor Scriptable (iPhone)
// Klein, middel of groot. Tik op de widget om de app te openen.
// Optioneel: zet bij "Parameter" een vaste plek als "52.37,4.89" (breedte,lengte).
// Leeg = je huidige locatie (of Amsterdam als dat niet lukt).

const APP_URL = "https://unlucky89lj.github.io/Weerwijzer/";

const WMO = {0:"Helder",1:"Overwegend helder",2:"Half bewolkt",3:"Bewolkt",45:"Mist",48:"Rijpmist",
  51:"Lichte motregen",53:"Motregen",55:"Dichte motregen",56:"Onderkoelde motregen",57:"Onderkoelde motregen",
  61:"Lichte regen",63:"Regen",65:"Zware regen",66:"IJzel",67:"Zware ijzel",71:"Lichte sneeuw",73:"Sneeuw",
  75:"Zware sneeuw",77:"Korrelsneeuw",80:"Lichte buien",81:"Buien",82:"Zware buien",85:"Sneeuwbuien",
  86:"Zware sneeuwbuien",95:"Onweer",96:"Onweer met hagel",99:"Zwaar onweer met hagel"};
const SYMBOL = c => c===0||c===1 ? "sun.max.fill" : c===2 ? "cloud.sun.fill" : c===3 ? "cloud.fill" :
  c===45||c===48 ? "cloud.fog.fill" : c>=51&&c<=57 ? "cloud.drizzle.fill" : c>=61&&c<=67 ? "cloud.rain.fill" :
  c>=71&&c<=77 ? "cloud.snow.fill" : c>=80&&c<=82 ? "cloud.heavyrain.fill" : c>=85&&c<=86 ? "cloud.snow.fill" : "cloud.bolt.rain.fill";
const NIGHT_SYMBOL = c => c<=1 ? "moon.stars.fill" : c===2 ? "cloud.moon.fill" : SYMBOL(c);

// Zelfde kleuren als de achtergrond in de app
const GRAD = { clear:["#2b86d1","#79c1ee"], partly:["#3b88c4","#7fb5d9"], cloudy:["#4d6676","#7d93a0"],
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

function sunPos(lat, lon, dt) {
  const r = Math.PI/180, d = dt/864e5 + 2440587.5 - 2451545, g = (357.529 + .98560028*d)*r, q = 280.459 + .98564736*d;
  const Lm = (q + 1.915*Math.sin(g) + .02*Math.sin(2*g))*r, e = (23.439 - 3.6e-7*d)*r;
  const dec = Math.asin(Math.sin(e)*Math.sin(Lm)), ra = Math.atan2(Math.cos(e)*Math.sin(Lm), Math.cos(Lm))/r;
  let ha = ((18.697374558 + 24.06570982441908*d) % 24)*15 + lon - ra; ha = ((ha + 540) % 360) - 180;
  return { el: Math.asin(Math.sin(lat*r)*Math.sin(dec) + Math.cos(lat*r)*Math.cos(dec)*Math.cos(ha*r))/r, ha };
}
function mix(a, b, t) { // hex-kleuren mengen
  const p = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i]-v)*t).toString(16).padStart(2, "0")).join("");
}

async function where() {
  const p = (args.widgetParameter || "").trim();
  if (p.includes(",")) {
    const [a, b] = p.split(",").map(Number);
    if (!isNaN(a) && !isNaN(b)) return { lat: a, lon: b, name: null };
  }
  try {
    Location.setAccuracyToThreeKilometers();
    const l = await Location.current();
    let name = null;
    try { const g = await Location.reverseGeocode(l.latitude, l.longitude, "nl_NL"); name = g[0] && (g[0].locality || g[0].name); } catch (e) {}
    return { lat: l.latitude, lon: l.longitude, name };
  } catch (e) {
    return { lat: 52.373, lon: 4.89, name: "Amsterdam" };
  }
}

async function getJSON(u, cacheName) {
  const fm = FileManager.local(), path = fm.joinPath(fm.cacheDirectory(), cacheName);
  try { const d = await new Request(u).loadJSON(); fm.writeString(path, JSON.stringify(d)); return d; }
  catch (e) { if (fm.fileExists(path)) { const d = JSON.parse(fm.readString(path)); d._offline = true; return d; } throw e; }
}

async function getWeather(loc) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day` +
    `&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,snowfall,weather_code,wind_gusts_10m&past_hours=24&forecast_hours=12` +
    `&minutely_15=precipitation&forecast_minutely_15=12` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=1&timezone=auto`;
  return getJSON(u, "weer-alarm-widget.json");
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

// Komende uren (zonder het verleden)
function future(d) {
  const h = d.hourly, now = d.current.time.slice(0, 13);
  let i0 = h.time.findIndex(t => t.slice(0, 13) === now); if (i0 < 0) i0 = 0;
  const pick = k => h[k].slice(i0);
  return { i0, time: pick("time"), temperature_2m: pick("temperature_2m"), apparent_temperature: pick("apparent_temperature"),
    precipitation: pick("precipitation"), precipitation_probability: pick("precipitation_probability"), snowfall: pick("snowfall"),
    weather_code: pick("weather_code"), wind_gusts_10m: pick("wind_gusts_10m") };
}

function signals(d, f, pollen) {
  const c = d.current, out = [];
  const gust = Math.max(c.wind_gusts_10m, ...f.wind_gusts_10m), minT = Math.min(...f.temperature_2m);
  if (f.weather_code.some(x => [56,57,66,67].includes(x))) out.push("IJzel mogelijk");
  else if (f.snowfall.some(x => x > 0) || f.precipitation.some((p, i) => p > 0 && f.temperature_2m[i] <= 1)) out.push("Kans op gladheid");
  else if (minT <= 1 && c.relative_humidity_2m > 85) out.push("Kans op rijp");
  if (gust >= 75) out.push(`Zware windstoten ${Math.round(gust)} km/u`);
  else if (gust >= 60) out.push(`Harde windstoten ${Math.round(gust)} km/u`);
  if (f.weather_code.some(x => x >= 95)) out.push("Onweer verwacht");
  if (pollen.length) out.push("Hooikoorts: " + pollen.join(", "));
  return out;
}

function rainLine(d, f) {
  const c = d.current, m = d.minutely_15 || {}, p = m.precipitation || [], t = m.time || [], wet = v => v >= 0.1, now = Date.now();
  const mins = i => Math.max(5, Math.round((new Date(t[i]).getTime() - now)/6e4));
  if (p.length) {
    if (wet(c.precipitation) || wet(p[0])) { const j = p.findIndex(v => !wet(v)); return j < 0 ? "Regen houdt nog 3 uur aan" : j === 0 ? "Regen stopt zo" : `Droog over ${mins(j)} min`; }
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

function txt(stack, s, size, opts = {}) {
  const t = stack.addText(s);
  t.font = opts.bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = opts.color || Color.white();
  t.lineLimit = opts.lines || 1;
  if (opts.min) t.minimumScaleFactor = opts.min;
  return t;
}
const soft = a => new Color("#ffffff", a);

async function build() {
  const fam = config.widgetFamily || "medium";
  const loc = await where();
  const w = new ListWidget();
  w.url = APP_URL;
  w.setPadding(14, 14, 14, 14);
  let d;
  try { d = await getWeather(loc); }
  catch (e) {
    w.backgroundColor = new Color("#0f3b47");
    txt(w, "Weer & Alarm", 14, { bold: true }); w.addSpacer(6);
    txt(w, "Geen verbinding. Probeer het later opnieuw.", 12, { lines: 3 });
    return w;
  }
  const pollen = fam === "small" ? [] : await getPollen(loc);
  const c = d.current, f = future(d), day = c.is_day !== 0, kind = kindOf(c.weather_code);
  const sig = signals(d, f, pollen);

  // Achtergrond: zelfde logica als de app
  const se = sunPos(loc.lat, loc.lon, new Date());
  const gold = se.el > -5 && se.el < 7 && ["clear","partly","cloudy"].includes(kind) ? (se.ha < 0 ? "dawn" : "dusk") : "";
  let cols = sig.length ? WARN : gold ? GOLD[gold] : (day ? GRAD : NIGHT)[kind];
  if (!sig.length && c.temperature_2m <= 0) cols = cols.map(x => mix(x, "#7fb8ff", 0.25));
  if (!sig.length && c.temperature_2m >= 28) cols = cols.map(x => mix(x, "#ff8a3d", 0.25));
  const grad = new LinearGradient();
  grad.colors = cols.map(x => new Color(x));
  grad.locations = cols.length === 3 ? [0, 0.55, 1] : [0, 1];
  w.backgroundGradient = grad;

  // Plaats + icoon
  const top = w.addStack(); top.centerAlignContent();
  const left = top.addStack(); left.layoutVertically();
  txt(left, loc.name || "Mijn locatie", 13, { bold: true, min: 0.7 });
  txt(left, WMO[c.weather_code] || "", 11, { color: soft(0.85), min: 0.7 });
  top.addSpacer();
  const sym = SFSymbol.named(sig.length ? "exclamationmark.triangle.fill" : day ? SYMBOL(c.weather_code) : NIGHT_SYMBOL(c.weather_code));
  if (sym) { const img = top.addImage(sym.image); img.imageSize = new Size(24, 24); img.tintColor = Color.white(); }

  // Temperatuur, gevoel, gisteren
  w.addSpacer(2);
  const tr = w.addStack(); tr.bottomAlignContent();
  txt(tr, `${Math.round(c.temperature_2m)}°`, fam === "small" ? 34 : 40, { bold: true });
  tr.addSpacer(8);
  const fs = tr.addStack(); fs.layoutVertically();
  txt(fs, `Voelt ${Math.round(c.apparent_temperature)}°`, 12, { color: soft(0.9) });
  const yIdx = f.i0 - 24;
  if (yIdx >= 0) {
    const diff = Math.round(c.temperature_2m - d.hourly.temperature_2m[yIdx]);
    txt(fs, diff === 0 ? "Als gisteren" : `${Math.abs(diff)}° ${diff < 0 ? "kouder" : "warmer"} dan gisteren`, 10, { color: soft(0.75), min: 0.7 });
  } else if (d.daily) {
    txt(fs, `${Math.round(d.daily.temperature_2m_min[0])}° / ${Math.round(d.daily.temperature_2m_max[0])}°`, 11, { color: soft(0.75) });
  }

  // Waarschuwing of neerslag
  w.addSpacer(5);
  const pt = ptype(f);
  if (sig.length) {
    const s = w.addStack(); s.backgroundColor = new Color("#1a0a02", 0.8); s.cornerRadius = 8; s.setPadding(3, 8, 3, 8);
    txt(s, "⚠︎ " + sig.slice(0, fam === "small" ? 1 : 2).join(" · "), 11, { bold: true, min: 0.6 });
  } else if (pt) {
    txt(w, pt, 11, { bold: true, min: 0.7 });
  }
  if (fam !== "small") {
    w.addSpacer(3);
    txt(w, rainLine(d, f), 11, { bold: !sig.length && !pt, min: 0.7 });
    const nowS = bikeScore(c.apparent_temperature, c.precipitation, c.wind_gusts_10m);
    const sc = f.time.map((t, i) => ({ t, s: bikeScore(f.apparent_temperature[i], f.precipitation[i], f.wind_gusts_10m[i]) }));
    const best = sc.reduce((a, b) => b.s > a.s ? b : a, sc[0]);
    txt(w, `Fietsweer ${nowS}/10` + (best && best.s > nowS ? ` · beste ${hm(best.t)} (${best.s})` : "") +
      ` · wind ${DIRS[Math.round(c.wind_direction_10m/45) % 8]} ${Math.round(c.wind_speed_10m)}`, 11, { color: soft(0.88), min: 0.6 });
  } else if (!sig.length && !pt) {
    txt(w, rainLine(d, f), 11, { bold: true, min: 0.6, lines: 2 });
  }

  // Groot: kleding, zon en uurverwachting
  if (fam === "large") {
    w.addSpacer(6);
    const rainSoon = f.precipitation.slice(0, 4).some(v => v >= 0.2);
    txt(w, "Kleding: " + clothes(c.apparent_temperature, c.wind_gusts_10m, rainSoon), 11, { color: soft(0.9), min: 0.6 });
    if (d.daily && d.daily.sunrise) txt(w, `Zon op ${hm(d.daily.sunrise[0])} · onder ${hm(d.daily.sunset[0])}`, 11, { color: soft(0.8) });
    w.addSpacer(8);
    const row = w.addStack();
    for (let i = 0; i < Math.min(6, f.time.length); i++) {
      const col = row.addStack(); col.layoutVertically(); col.centerAlignContent();
      txt(col, hm(f.time[i]), 11, { color: soft(0.8) });
      const si = SFSymbol.named(SYMBOL(f.weather_code[i]));
      if (si) { const im = col.addImage(si.image); im.imageSize = new Size(20, 20); im.tintColor = Color.white(); }
      txt(col, `${Math.round(f.temperature_2m[i])}°`, 14, { bold: true });
      txt(col, `${f.precipitation_probability[i] ?? 0}%`, 10, { color: new Color("#bfe3ff") });
      if (i < 5) row.addSpacer();
    }
  }

  w.addSpacer();
  txt(w, (d._offline ? "Offline · " : "Bijgewerkt ") + new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }), 9, { color: soft(0.6) });
  w.refreshAfterDate = new Date(Date.now() + 15*60*1000);
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
