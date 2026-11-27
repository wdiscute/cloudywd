/*
 * Reads the item modifiers (what a hook, bobber, bait, hat... does) straight from
 * the mod's datagen class:
 *   src/main/java/com/wdiscute/starcatcher/datagen/DGSCDataMapsProvider.java
 *
 * Every `modifiers.add(ITEM, List.of(new SomeModifier(...), ...), false);` becomes
 * a list of lines of text for that item, worded like the mod's own tooltips
 * (the detailed "hold shift" version, which includes the numbers).
 *
 * Returns { "starcatcher:copper_hook": [{ text: "...", note: "..." }], ... }
 * "note" is optional: extra values the tooltip text doesn't mention.
 *
 * A new modifier type with values works without changes here (it shows its tooltip
 * text plus its raw values as a note). To word it better, add it to TEXT below.
 */
import fs from "node:fs";
import path from "node:path";

const JAVA = "src/main/java/com/wdiscute/starcatcher";

export function readModifiers(modDir, lang) {
  const file = path.join(modDir, JAVA, "datagen/DGSCDataMapsProvider.java");
  if (!fs.existsSync(file)) { console.warn("No modifiers: " + file + " not found"); return {}; }
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const ids = modifierIds(path.join(modDir, JAVA, "modifiers"));
  const names = registryNames(path.join(modDir, JAVA, "registry"));

  // Lang helper: "tooltip.modifier.starcatcher.x" with %s filled in (like Minecraft does)
  const tr = (key, ...vals) => {
    const s = lang[key];
    if (s == null) return null;
    let i = 0;
    return noMarkup(s.replace(/%(%|s)/g, (m, c) => c === "%" ? "%" : String(vals[i++] ?? "")));
  };
  const t = (key, ...vals) => tr("tooltip.modifier.starcatcher." + key, ...vals);

  const out = {};
  const re = /\bmodifiers\.add\(/g;
  let m;
  while ((m = re.exec(src))) {
    const inner = balanced(src, m.index + m[0].length - 1);
    const [itemExpr, listExpr] = splitTop(inner);
    const id = itemId(itemExpr, names);
    if (!id) { console.warn("Modifiers: can't tell which item this is: " + itemExpr); continue; }
    const lines = [];
    for (const mod of splitTop(listInner(listExpr))) {
      const mm = mod.match(/^new\s+([A-Za-z0-9_]+)\s*\(/);
      if (!mm) continue;
      const cls = mm[1];
      const a = splitTop(balanced(mod, mod.indexOf("("))).map(value);
      const hasOverride = typeof a[a.length - 1] === "string"; // last argument is the tooltip override
      const override = hasOverride ? a[a.length - 1] : "";
      if (override === "hide") continue; // the mod hides these from the tooltip too
      const vals = hasOverride ? a.slice(0, -1) : a;
      let line;
      if (override) line = { text: tr(override) || override };
      else if (TEXT[cls]) line = TEXT[cls](vals, t, lang);
      else {
        // Unknown type: its default tooltip + its raw values
        line = { text: t(ids[cls] || "") || pretty(ids[cls] || cls) };
        const nums = vals.filter(v => typeof v !== "object");
        if (nums.length) line.note = nums.join(", ");
      }
      if (Array.isArray(line)) lines.push(...line); else if (line && line.text) lines.push(line);
    }
    if (lines.length) out[id] = lines;
  }
  return out;
}

/* ---------- how each modifier is worded ----------
 * v = constructor values in order (without the last translation string)
 * Numbers are shown the way the mod does: multiplier 1.5 -> "150%"
 */
const fmt = n => String(Math.round(n * 100) / 100);
const pct = n => fmt(n * 100);
const chanceNote = c => (c < 1 ? pct(c) + "% chance" : undefined);
const ticks = n => n + " ticks (" + fmt(n / 20) + "s)";
const rarityList = (list, lang) => {
  const names = list.map(r => noMarkup(lang["gui.guide.rarity." + r] || pretty(r)));
  return names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
};

const TEXT = {
  AdjustBaseHandleSpeedModifier: (v, t) => ({ text: t("adjust_handle_speed.shift", pct(v[0])) }),
  AdjustDecayRateModifier:       (v, t) => ({ text: t("adjust_decay_rate.shift", pct(v[0])) }),
  AdjustHPModifier:              (v, t) => ({ text: t("adjust_hp.shift", pct(v[0])) }),
  AdjustMovingModifier:          (v, t) => ({ text: t("adjust_moving_sweetspots.shift", pct(v[0])) }),
  AdjustPenaltyModifier:         (v, t) => ({ text: t("adjust_penalty_rate.shift", pct(v[0])) }),
  AdjustVanishingRate:           (v, t) => ({ text: t("adjust_vanishing_rate.shift", pct(v[0])) }),
  AdjustLureTimeModifier: (v, t) => {
    const l = [];
    if (v[0] !== 1) l.push({ text: t("adjust_lure_time.shift.min_ticks", pct(v[0])) });
    if (v[1] !== 1) l.push({ text: t("adjust_lure_time.shift.max_ticks", pct(v[1])) });
    if (v[2] !== 1) l.push({ text: t("adjust_lure_time.shift.random", pct(v[2])) });
    return l;
  },
  ExtraGoldenChanceModifier: (v, t) => ({ text: t(v[1] ? "extra_golden_chance.perfect.shift" : "extra_golden_chance.base.shift", pct(v[0])) }),
  AwardTreasureOnPerfectCatch: (v, t) => ({ text: v[0] >= 1 ? t("award_treasure_on_perfect_catch.always") : t("award_treasure_on_perfect_catch.shift", pct(v[0])) }),
  IgnoreDaytimeRestrictionsModifier: (v, t) => ({ text: v[0] >= 1 ? t("ignore_daytime_restrictions") : t("ignore_daytime_restrictions.shift", pct(v[0])) }),
  IgnoreWeatherRestrictionsModifier: (v, t) => ({ text: v[0] >= 1 ? t("ignore_weather_restrictions") : t("ignore_weather_restrictions.shift", pct(v[0])) }),
  NewCatchIncreaseModifier: (v, t) => ({ text: t("new_catch_increase.shift", v[0]) }),
  QualityFoodRollModifier:  (v, t) => ({ text: t("quality_food_roll.shift", fmt(v[1])) }),
  RollPercentileModifier:   (v, t) => ({ text: t("roll_percentile.shift", v[0]) }),
  SpawnTreasureOnHitX:      (v, t) => ({ text: t("spawn_treasure_on_hit_x", v[0]) }),
  ExtraBaseCatchModifier: (v, t, lang) => ({
    text: t("extra_base_catch", lang["tooltip.modifier.number." + v[0]] || v[0]),
    note: v[1] ? "Perfect catches only" : undefined
  }),
  AllowedRaritiesModifier:    (v, t, lang) => ({ text: t("allowed_rarities", rarityList(v[0], lang)) }),
  RestrictedRaritiesModifier: (v, t, lang) => ({ text: t("restricted_rarities", rarityList(v[0], lang)) }),
  BoostThrowSpeedModifier:     (v, t) => ({ text: t("boost_throw_speed"), note: "Throw speed ×" + fmt(v[0]) }),
  AddLeavesSweetspotsModifier: (v, t) => ({ text: t("add_leaves_spots"), note: pct(v[0]) + "% chance every tick" }),
  HideCatchModifier:           (v, t) => ({ text: t("hide_catch"), note: chanceNote(v[0]) }),
  ForceFishEntityModifier:     (v, t) => ({ text: t("force_fish_entity"), note: chanceNote(v[0]) }),
  VanillaFishingLootModifier:  (v, t) => ({ text: t("vanilla_fishing_loot"), note: chanceNote(v[0]) }),
  SpawnTreasureModifier:       (v, t) => ({ text: t("spawn_treasure") || "Spawns a treasure", note: chanceNote(v[0]) }),
  BurnOnMissModifier:   (v, t) => ({ text: t("burn_on_miss"), note: "Burns for " + ticks(v[0]) + ", handle " + v[2] + "% faster" }),
  FreezeOnMissModifier: (v, t) => ({ text: t("freeze_on_miss"), note: "Freezes for " + ticks(v[0]) })
};

/* ---------- tiny Java reader ---------- */
export function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"])\/\/.*$/gm, "$1");
}
// Text between the bracket at `open` and its matching closing bracket
export function balanced(s, open) {
  let depth = 0, str = false;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (str) { if (c === "\\") i++; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return s.slice(open + 1, i);
  }
  return s.slice(open + 1);
}
// Split on commas that aren't inside brackets or strings
function splitTop(s) {
  const parts = []; let depth = 0, str = false, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (str) { cur += c; if (c === "\\") cur += s[++i]; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
function listInner(expr) {
  const i = expr.indexOf("List.of(");
  return i < 0 ? "" : balanced(expr, i + 7);
}
// A constructor argument: number, boolean, "string", List.of(Rarity.X, ...), Enum.CONSTANT, rl("x")
function value(s) {
  if (/^-?\d+(\.\d+)?[fFdD]?$/.test(s)) return parseFloat(s);
  if (s === "true" || s === "false") return s === "true";
  const str = s.match(/^"(.*)"$/);
  if (str) return str[1];
  if (s.startsWith("List.of(")) return splitTop(listInner(s)).map(x => x.split(".").pop().toLowerCase());
  const rl = s.match(/rl\("([^"]+)"\)/);
  if (rl) return { rl: rl[1] };
  return { java: s };
}
// The mod's colour markup in lang text, e.g. <scepic>Epic</scepic>
function noMarkup(s) { return s.replace(/<\/?sc[a-z_]*>/g, ""); }
// Item expression -> item id (SCItems.X / SCBlocks.X / CreateCompat.X use the name X was registered with)
export function itemId(expr, names) {
  let m = expr.match(/\b(?:SCItems|SCBlocks|CreateCompat)\.([A-Z0-9_]+)/);
  if (m) return "starcatcher:" + (names[m[1]] || m[1].toLowerCase());
  m = expr.match(/\bItems\.([A-Z0-9_]+)/);
  if (m) return "minecraft:" + m[1].toLowerCase();
  return null;
}
// SCItems / SCBlocks / CreateCompat constant -> registry name, from lines like
//   WOOD_HOOK = HOOKS_REGISTRY.register("wood_hook", ...)
//   COGGILL = SCItems.registerNonBucketFish("coggill")   (compat/CreateCompat.java)
export function registryNames(dir) {
  const names = {};
  for (const n of ["SCItems.java", "SCBlocks.java", "../compat/CreateCompat.java"]) {
    const f = path.join(dir, n);
    if (!fs.existsSync(f)) continue;
    const re = /\b([A-Z0-9_]+)\s*=\s*[\w.]*register\w*\(\s*"([a-z0-9_\/]+)"/g;
    const src = fs.readFileSync(f, "utf8");
    let m;
    while ((m = re.exec(src))) names[m[1]] = m[2];
  }
  return names;
}
// Modifier class name -> its id (from getIdentifier), used for its default tooltip key
function modifierIds(dir) {
  const ids = {};
  const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
  for (const f of walk(dir).filter(f => f.endsWith(".java"))) {
    const m = fs.readFileSync(f, "utf8").match(/getIdentifier\s*\(\s*\)\s*\{\s*return\s+Starcatcher\.rl\("([^"]+)"\)/);
    if (m) ids[path.basename(f, ".java")] = m[1];
  }
  return ids;
}
function pretty(id) {
  return String(id).split(/[_:]/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}
