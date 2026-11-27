/*
 * Reads which items can be caught by fishing, and at what rarity, straight from
 * the mod's fish datagen class:
 *   src/main/java/com/wdiscute/starcatcher/datagen/fish/DGStarcatcherFishes.java
 *
 * Every `FishRegistration.register(context, ... .withFish(ITEM) ... .withRarity(Rarity.X) ...)`
 * is one catch. Registrations without .withRarity are recorded as "common".
 *
 * Returns { "starcatcher:boot": "trash", "starcatcher:aquamarine_pike": "rare", ... }
 */
import fs from "node:fs";
import path from "node:path";
import { stripComments, balanced, itemId, registryNames } from "./read-modifiers.mjs";

const JAVA = "src/main/java/com/wdiscute/starcatcher";

/*
 * Trophies, from src/main/java/com/wdiscute/starcatcher/datagen/fish/compat/DGTrophies.java
 * A trophy is a catch (registered with .trophy()) that can only be fished up once you've
 * reached some fishing milestones, each written as
 *   new RarityCountRestriction.RarityCount(Rarity.LEGENDARY, 2, RarityCountRestriction.RarityCount.CountType.UNIQUE)
 *
 * Returns { "starcatcher:trophy_gold": [{ rarity: "legendary", count: 2, type: "unique" }, ...], ... }
 *   rarity "none" = any fish, "golden" = fish caught golden
 *   type "total" = every catch counts, "unique" = different fish, "all" = every fish in the guide
 */
export function readTrophies(modDir) {
  const file = path.join(modDir, JAVA, "datagen/fish/compat/DGTrophies.java");
  if (!fs.existsSync(file)) { console.warn("No trophies: " + file + " not found"); return {}; }
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const names = registryNames(path.join(modDir, JAVA, "registry"));

  const out = {};
  const re = /\bFishRegistration\.register(?:Raw)?\(/g;
  let m;
  while ((m = re.exec(src))) {
    const body = balanced(src, m.index + m[0].length - 1);
    if (!/\.trophy\(\s*\)/.test(body)) continue;
    const fish = body.match(/\.withFish\(/);
    const id = fish && itemId(balanced(body, fish.index + fish[0].length - 1), names);
    if (!id) continue;
    const needs = [];
    const rc = /RarityCount\(\s*Rarity\.([A-Z_]+)\s*,\s*(\d+)\s*,\s*[\w.]*CountType\.([A-Z_]+)\s*\)/g;
    let r;
    while ((r = rc.exec(body))) needs.push({ rarity: r[1].toLowerCase(), count: +r[2], type: r[3].toLowerCase() });
    out[id] = needs;
  }
  return out;
}

export function readCatches(modDir) {
  const file = path.join(modDir, JAVA, "datagen/fish/DGStarcatcherFishes.java");
  if (!fs.existsSync(file)) { console.warn("No catches: " + file + " not found"); return {}; }
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const names = registryNames(path.join(modDir, JAVA, "registry"));

  const out = {};
  const re = /\bFishRegistration\.register(?:Raw)?\(/g;
  let m;
  while ((m = re.exec(src))) {
    const body = balanced(src, m.index + m[0].length - 1);
    const fish = body.match(/\.withFish\(/);
    if (!fish) continue;
    const id = itemId(balanced(body, fish.index + fish[0].length - 1), names);
    if (!id) continue;
    const rarity = body.match(/\.withRarity\(\s*Rarity\.([A-Z_]+)\s*\)/);
    out[id] = rarity ? rarity[1].toLowerCase() : "common";
  }
  return out;
}

/*
 * Rare extra catches (smithing templates...), registered with .extra() in DGTrophies.java.
 * Returns { "starcatcher:frog_smithing_template": { chance: 1, where: ["In the Overworld", ...] }, ... }
 * chance: % (from .withPercentageChance), where: every condition, from the location preset
 * (PresetRestrictions.swamp(...) etc.) plus the entry's own .addRestriction / .withWeather.
 */
export function readExtraCatches(modDir) {
  const file = path.join(modDir, JAVA, "datagen/fish/compat/DGTrophies.java");
  if (!fs.existsSync(file)) return {};
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const names = registryNames(path.join(modDir, JAVA, "registry"));
  const presets = readPresets(modDir);

  const out = {};
  const re = /\bFishRegistration\.register(?:Raw)?\(/g;
  let m;
  while ((m = re.exec(src))) {
    const body = balanced(src, m.index + m[0].length - 1);
    if (!/\.extra\(\s*\)/.test(body)) continue;
    const fish = body.match(/\.withFish\(/);
    const id = fish && itemId(balanced(body, fish.index + fish[0].length - 1), names);
    if (!id) continue;
    const preset = body.match(/PresetRestrictions\.(\w+)\(/);
    const conds = [...(preset && presets[preset[1]] || []), ...restrictionRefs(body)];
    const chance = body.match(/withPercentageChance\(\s*([\d.]+)[fFdD]?\s*\)/);
    out[id] = {
      chance: chance ? Math.round(parseFloat(chance[1]) * 10000) / 100 : null,
      where: [...new Set(conds)].map(describeRestriction)
    };
  }
  return out;
}

/*
 * Templates that come as treasure when reeling in a specific fish, from the "treasures"
 * section of DGSCDataMapsProvider.java:  treasures.add(Starcatcher.rl("willish"), Treasure.KIMBE_SMITHING_TEMPLATE, false)
 * (Treasure.KIMBE_SMITHING_TEMPLATE -> the item, from fish/Treasure.java)
 * Returns { "starcatcher:kimbe_smithing_template": ["starcatcher:willish"], ... }
 */
export function readFishTreasures(modDir) {
  const maps = path.join(modDir, JAVA, "datagen/DGSCDataMapsProvider.java");
  const treasureFile = path.join(modDir, JAVA, "fish/Treasure.java");
  if (!fs.existsSync(maps) || !fs.existsSync(treasureFile)) return {};
  const names = registryNames(path.join(modDir, JAVA, "registry"));
  const treasureItem = {};
  for (const t of fs.readFileSync(treasureFile, "utf8").matchAll(/\b([A-Z0-9_]+)\s*=\s*Treasure\.specificItem\(\s*(SC(?:Items|Blocks)\.[A-Z0-9_]+)/g))
    treasureItem[t[1]] = itemId(t[2], names);
  const out = {};
  const src = stripComments(fs.readFileSync(maps, "utf8"));
  for (const t of src.matchAll(/treasures\.add\(\s*Starcatcher\.rl\("([a-z0-9_\/]+)"\)\s*,\s*Treasure\.([A-Z0-9_]+)/g)) {
    const item = treasureItem[t[2]];
    if (item) (out[item] = out[item] || []).push("starcatcher:" + t[1]);
  }
  return out;
}

// Location presets: { swamp: ["DimensionRestriction.OVERWORLD", "BiomeRestriction.SWAMPS", ...], ... }
export function readPresets(modDir) {
  const file = path.join(modDir, JAVA, "datagen/fish/PresetRestrictions.java");
  if (!fs.existsSync(file)) return {};
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const out = {};
  for (const m of src.matchAll(/static\s+FishProperties\s+(\w+)\s*\([^)]*\)\s*\{/g)) {
    let depth = 0, i = m.index + m[0].length - 1, end = i;
    for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}" && --depth === 0) { end = i; break; } }
    out[m[1]] = restrictionRefs(src.slice(m.index, end));
  }
  return out;
}
// Restriction constants used in a piece of code: .addRestriction(X.Y), .withWeather(X.Y), .withDaytimeRestriction(X.Y)...
export function restrictionRefs(s) {
  return [...s.matchAll(/\.(?:add|with)\w*\(\s*([A-Za-z]+Restriction\.[A-Z0-9_]+)\s*\)/g)].map(r => r[1]);
}
export const titled =c => c.toLowerCase().split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
function describeRestriction(ref) {
  const [cls, c] = ref.split(".");
  const special = {
    "FluidRestriction.WATER": "Fishing in water",
    "FluidRestriction.LAVA": "Fishing in lava",
    "ElevationRestriction.ABOVE_FIFTY": "Above Y 50",
    "StructureRestriction.VILLAGES": "Near a village",
    "WeatherRestriction.RAIN": "While it's raining"
  };
  if (special[ref]) return special[ref];
  if (cls === "DimensionRestriction") return "In the " + titled(c);
  if (cls === "BiomeRestriction") return "Biome: " + titled(c);
  if (cls === "BaitRestriction") return "Using " + titled(c);
  return titled(cls.replace(/Restriction$/, "")) + ": " + titled(c);
}
