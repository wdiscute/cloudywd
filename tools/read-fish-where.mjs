/*
 * Where and when each fish bites, from
 *   src/main/java/com/wdiscute/starcatcher/datagen/fish/DGStarcatcherFishes.java
 * = the location preset (PresetRestrictions.lake(...) etc.) plus the fish's own
 *   .addRestriction / .withWeather / .withDaytimeRestriction.
 * Worded with the mod's own guide text (gui.guide.* in the lang file), which each
 * restriction constant in registry/fishrestrictions/*.java points to.
 * Like the mod (FishRegistration.applyLegendaryBait), Legendary fish always use Legendary Bait.
 *
 * Returns { "starcatcher:aurora": [{ kind: "Dimension", text: "Overworld" },
 *           { kind: "Bait", item: "starcatcher:legendary_bait", text: "Prefers" }, ...], ... }
 * kind is one of KINDS; "note" is optional extra text (e.g. what a biome group means).
 */
import fs from "node:fs";
import path from "node:path";
import { stripComments, balanced, itemId, registryNames } from "./read-modifiers.mjs";
import { readPresets, restrictionRefs, titled } from "./read-catches.mjs";

const JAVA = "src/main/java/com/wdiscute/starcatcher";
export const KINDS = ["Mod", "Dimension", "Biome", "Fluid", "Elevation", "Time", "Weather", "Light", "Season", "Structure", "Bait"];

// The mod's own fish, plus its Create add-on fish (which only exist with Create installed)
const FILES = ["datagen/fish/DGStarcatcherFishes.java", "datagen/fish/compat/DGCreateFishes.java"];

export function readFishWhere(modDir, lang) {
  const names = registryNames(path.join(modDir, JAVA, "registry"));
  const presets = readPresets(modDir);
  const consts = readRestrictionConstants(modDir, names);
  const out = {};
  for (const rel of FILES) {
    const file = path.join(modDir, JAVA, rel);
    if (!fs.existsSync(file)) { console.warn("No fish restrictions: " + file + " not found"); continue; }
    readFile(stripComments(fs.readFileSync(file, "utf8")), names, presets, consts, lang, out);
  }
  return out;
}

function readFile(src, names, presets, consts, lang, out) {
  const re = /\bFishRegistration\.register(Raw)?\(/g; // registerRaw skips the automatic Legendary Bait
  let m;
  while ((m = re.exec(src))) {
    const body = balanced(src, m.index + m[0].length - 1);
    const fish = body.match(/\.withFish\(/);
    const id = fish && itemId(balanced(body, fish.index + fish[0].length - 1), names);
    if (!id || !id.startsWith("starcatcher:")) continue;
    // register(context, fp, "create"): only caught when that mod is installed
    const mod = body.match(/,\s*"([a-z0-9_]+)"\s*$/);
    const preset = body.match(/PresetRestrictions\.(\w+)\(/);
    let refs = [...(preset && presets[preset[1]] || []), ...restrictionRefs(body)];
    if (!m[1] && /\.withRarity\(\s*Rarity\.LEGENDARY\s*\)/.test(body))
      refs = refs.filter(r => !r.startsWith("BaitRestriction.")).concat("BaitRestriction.LEGENDARY_BAIT");
    const requiresBait = /\.withBaseChance\(\s*0\s*\)/.test(body); // the guide says "Requires" instead of "Prefers"

    const rows = [];
    for (const ref of new Set(refs)) {
      const row = describe(ref, consts[ref] || {}, lang, requiresBait);
      if (row) rows.push(row);
    }
    // Structures written inline: new StructureRestriction(List.of(BuiltinStructures.ANCIENT_CITY.location()), "")
    for (const n of body.matchAll(/new\s+StructureRestriction\(/g)) {
      const inner = balanced(body, n.index + n[0].length - 1);
      const list = [...inner.matchAll(/BuiltinStructures\.([A-Z0-9_]+)/g)].map(x => titled(x[1]));
      if (list.length) rows.push({ kind: "Structure", text: list.join(", ") });
    }
    if (mod) rows.push({ kind: "Mod", text: titled(mod[1]) });
    rows.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
    out[id] = rows;
  }
}

// "BiomeRestriction.LAKES" -> { key, hover, min, max, item }, from registry/fishrestrictions/*Restriction.java
function readRestrictionConstants(modDir, names) {
  const dir = path.join(modDir, JAVA, "registry/fishrestrictions");
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith("Restriction.java"))) {
    const src = stripComments(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const c of src.matchAll(/public\s+static\s+final\s+(\w+Restriction)\s+([A-Z0-9_]+)\s*=\s*([\s\S]*?);/g)) {
      const init = c[3];
      const strings = [...init.matchAll(/"([^"]*)"/g)].map(x => x[1]);
      const translation = init.match(/\.translation\("([^"]+)"\)/);
      const hover = init.match(/\.hover\("([^"]+)"\)/);
      const nums = init.match(/\(\s*(Integer\.MIN_VALUE|-?\d+)\s*,\s*(Integer\.MAX_VALUE|-?\d+)\s*,/);
      const item = init.match(/\bSC(?:Items|Blocks)\.[A-Z0-9_]+/);
      const rl = init.match(/rl\("([a-z0-9_]+)"\)/);
      out[c[1] + "." + c[2]] = {
        key: translation ? translation[1] : strings.filter(x => x.includes(".")).pop(),
        hover: hover && hover[1],
        min: nums && !/MIN/.test(nums[1]) ? +nums[1] : null,
        max: nums && !/MAX/.test(nums[2]) ? +nums[2] : null,
        item: item ? itemId(item[0], names) : rl ? "minecraft:" + rl[1] : null
      };
    }
  }
  return out;
}

function describe(ref, c, lang, requiresBait) {
  const [cls, name] = ref.split(".");
  const tr = k => (k && lang[k] ? lang[k] : null);
  switch (cls) {
    case "DimensionRestriction":
      return { kind: "Dimension", text: tr(c.key) || titled((c.key || name).split(".").pop()) };
    case "BiomeRestriction":
      return { kind: "Biome", text: tr(c.key) || titled(name), note: tr(c.hover) || undefined };
    case "FluidRestriction":
      return { kind: "Fluid", text: tr(c.key) || titled(name) };
    case "ElevationRestriction": {
      const range = c.min != null && c.max != null ? "Y " + c.min + " to " + c.max
        : c.min != null ? "Y " + c.min + " and up" : c.max != null ? "Below Y " + c.max : "";
      const label = tr(c.key);
      return { kind: "Elevation", text: label ? label + (range ? " (" + range + ")" : "") : range || titled(name) };
    }
    case "DaytimeRestriction":
      return { kind: "Time", text: tr(c.key) || titled(name) };
    case "WeatherRestriction":
      return { kind: "Weather", text: tr("gui.guide.weather." + name.toLowerCase()) || titled(name) };
    case "LightLevelRestriction":
      return { kind: "Light", text: tr(c.key) || titled(name) };
    case "SeasonRestriction":
      return { kind: "Season", text: tr(c.key) || tr("gui.guide.seasons." + name.toLowerCase()) || titled(name) };
    case "StructureRestriction":
      return { kind: "Structure", text: titled(name) };
    case "BaitRestriction":
      return c.item ? { kind: "Bait", item: c.item, text: requiresBait ? "Requires" : "Prefers" }
        : { kind: "Bait", text: titled(name) };
    default:
      return null; // chance, catch limits, rarity counts... aren't about where or when
  }
}
