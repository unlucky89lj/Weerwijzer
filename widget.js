// Weer & Alarm – widget voor Scriptable (iPhone)
// Werkt als klein, middel of groot widget.
// Optioneel: zet bij "Parameter" van de widget een plaats als "52.37,4.89"
// (breedte,lengte). Leeg = je huidige locatie (of Amsterdam als dat niet lukt).

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
const GRAD = { clear:["#2b86d1","#79c1ee"], partly:["#3b88c4","#7fb5d9"], cloudy:["#4d6676","#7d93a0"],
  fog:["#5f6f78","#8e9ba1"], rain:["#2c4152","#526a7c"], storm:["#151c25","#33404e"], snow:["#5f7a8d","#93a9b8"],
  night:["#07122a","#1b3263"] };
const kindOf = c => c>=95?"storm":[71,73,75,77,85,86].includes(c)?"snow":(c>=51&&c<=67)||(c>=80&&c<=82)?"rain":
  (c===45||c===48)?"fog":c===3?"cloudy":c===2?"partly":"clear";
const nl = v => String(Math.round(v*10)/10).replace(".", ",");
const DIRS = ["N","NO","O","ZO","Z","ZW","W","NW"];

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

async function getWeather(loc) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day` +
    `&hourly=temperature_2m,precipitation,precipitation_probability,snowfall,weather_code,wind_gusts_10m&forecast_hours=12` +
    `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), "weer-alarm-widget.json");
  try {
    const d = await new Request(u).loadJSON();
    fm.writeString(cache, JSON.stringify(d));
    return d;
  } catch (e) {
    if (fm.fileExists(cache)) { const d = JSON.parse(fm.readString(cache)); d._offline = true; return d; }
    throw e;
  }
}

function signals(d) {
  const c = d.current, h = d.hourly, out = [];
  const gust = Math.max(...h.wind_gusts_10m), minT = Math.min(...h.temperature_2m);
  if (h.weather_code.some(x => [56,57,66,67].includes(x))) out.push("IJzel mogelijk");
  else if (h.snowfall.some(x => x > 0) || h.precipitation.some((p, i) => p > 0 && h.temperature_2m[i] <= 1)) out.push("Kans op gladheid");
  else if (minT <= 1 && c.relative_humidity_2m > 85) out.push("Kans op rijp");
  if (gust >= 75) out.push(`Zware windstoten ${Math.round(gust)} km/u`);
  else if (gust >= 60) out.push(`Harde windstoten ${Math.round(gust)} km/u`);
  if (h.weather_code.some(x => x >= 95)) out.push("Onweer verwacht");
  return out;
}

function txt(stack, s, size, opts = {}) {
  const t = stack.addText(s);
  t.font = opts.bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = opts.color || Color.white();
  t.lineLimit = opts.lines || 1;
  if (opts.min) t.minimumScaleFactor = opts.min;
  return t;
}

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
    txt(w, "Weer & Alarm", 14, { bold: true });
    w.addSpacer(6);
    txt(w, "Geen verbinding. Probeer het later opnieuw.", 12, { lines: 3 });
    return w;
  }
  const c = d.current, h = d.hourly, day = c.is_day !== 0;
  const sigs = signals(d);
  const g = sigs.length ? ["#ff6a2b", "#c2410c"] : GRAD[day ? kindOf(c.weather_code) : "night"];
  const grad = new LinearGradient();
  grad.colors = [new Color(g[0]), new Color(g[1])];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;

  // Bovenste rij: plaats + icoon
  const top = w.addStack(); top.centerAlignContent();
  const left = top.addStack(); left.layoutVertically();
  txt(left, loc.name || "Mijn locatie", 13, { bold: true, min: 0.7 });
  txt(left, WMO[c.weather_code] || "", 11, { color: new Color("#ffffff", 0.85), min: 0.7 });
  top.addSpacer();
  const sym = SFSymbol.named(day ? SYMBOL(c.weather_code) : NIGHT_SYMBOL(c.weather_code));
  if (sym) { const img = top.addImage(sym.image); img.imageSize = new Size(26, 26); img.tintColor = Color.white(); }

  w.addSpacer(4);
  const tr = w.addStack(); tr.bottomAlignContent();
  txt(tr, `${Math.round(c.temperature_2m)}°`, fam === "small" ? 34 : 40, { bold: true });
  tr.addSpacer(8);
  const fs = tr.addStack(); fs.layoutVertically();
  txt(fs, `Voelt ${Math.round(c.apparent_temperature)}°`, 12, { color: new Color("#ffffff", 0.9) });
  if (d.daily) txt(fs, `${Math.round(d.daily.temperature_2m_min[0])}° / ${Math.round(d.daily.temperature_2m_max[0])}°`, 11, { color: new Color("#ffffff", 0.75) });

  if (fam !== "small") {
    w.addSpacer(4);
    txt(w, `Wind ${DIRS[Math.round(c.wind_direction_10m / 45) % 8]} ${Math.round(c.wind_speed_10m)} km/u · stoten ${Math.round(c.wind_gusts_10m)} · ${c.relative_humidity_2m}% vocht`, 11, { color: new Color("#ffffff", 0.85), min: 0.7 });
  }

  // Signalen
  const sig = sigs;
  w.addSpacer(6);
  if (sig.length) {
    const s = w.addStack();
    s.backgroundColor = new Color("#1a0a02", 0.85); s.cornerRadius = 8; s.setPadding(3, 8, 3, 8);
    txt(s, "⚠︎ " + sig.slice(0, fam === "small" ? 1 : 2).join(" · "), 11, { bold: true, color: Color.white(), min: 0.6 });
  } else {
    const rainH = h.precipitation_probability.findIndex(p => p >= 50);
    txt(w, rainH < 0 ? "Komende 12 uur droog" : rainH === 0 ? "Nu kans op regen" : `Regen over ± ${rainH} uur`, 11, { bold: true, min: 0.7 });
  }

  // Groot widget: uurverwachting
  if (fam === "large") {
    w.addSpacer(10);
    const row = w.addStack();
    for (let i = 0; i < Math.min(6, h.time.length); i += 1) {
      const col = row.addStack(); col.layoutVertically(); col.centerAlignContent();
      txt(col, h.time[i].slice(11, 16), 11, { color: new Color("#ffffff", 0.8) });
      const si = SFSymbol.named(SYMBOL(h.weather_code[i]));
      if (si) { const im = col.addImage(si.image); im.imageSize = new Size(20, 20); im.tintColor = Color.white(); }
      txt(col, `${Math.round(h.temperature_2m[i])}°`, 14, { bold: true });
      txt(col, `${h.precipitation_probability[i] ?? 0}%`, 10, { color: new Color("#bfe3ff") });
      if (i < 5) row.addSpacer();
    }
  }

  w.addSpacer();
  const now = new Date();
  txt(w, (d._offline ? "Offline · " : "Bijgewerkt ") + now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }), 9, { color: new Color("#ffffff", 0.6) });
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
