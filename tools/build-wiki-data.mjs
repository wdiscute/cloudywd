/*
 * Builds the Starcatcher wiki's item / recipe data straight from the mod source.
 *
 * Run it whenever the mod changes (from the cloudywd folder):
 *   npm run wiki-data
 * or with custom paths:
 *   node tools/build-wiki-data.mjs --mod E:/starcatcher --jar path/to/minecraft-1.21.1-client.jar
 *
 * It writes to public/mods/starcatcher/wiki/data/:
 *   items.json    every Starcatcher item (+ vanilla items used in recipes): name, icon, tags,
 *                 desc (in-game tooltip text from the lang file),
 *                 caught (rarity if it can be fished up, see read-catches.mjs),
 *                 where (where / when a fish bites, see read-fish-where.mjs),
 *                 trophy (milestones needed to fish up a trophy, see read-catches.mjs),
 *                 obtain / bonemeal (other ways to get it, from the JEI info pages, see read-jei.mjs),
 *                 rareCatch / treasureFrom (where smithing templates come from, see read-catches.mjs),
 *                 modifiers (read from DGSCDataMapsProvider.java, see read-modifiers.mjs)
 *   recipes.json  every recipe from the mod (same JSON format as the mod's recipe files)
 *   tags.json     item tags -> list of items (used to show "any of these" ingredients)
 *   icons/        item textures
 *
 * Vanilla names and textures come from the Minecraft client jar in your Gradle cache.
 *
 * Blocks (tackle boxes, trophies, aquarium...) only get a flat block texture as icon.
 * For a nicer one, put a PNG in tools/wiki-icons/<namespace>/<item>.png
 * (e.g. tools/wiki-icons/starcatcher/tackle_box.png) and run this again.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readModifiers } from "./read-modifiers.mjs";
import { readCatches, readTrophies, readExtraCatches, readFishTreasures } from "./read-catches.mjs";
import { readJeiInfo, readBonemealDrops } from "./read-jei.mjs";
import { readFishWhere } from "./read-fish-where.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/mods/starcatcher/wiki/data");
const CACHE = path.join(ROOT, "tools/.cache");
const NS = "starcatcher";

// ---------- arguments ----------
const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const MOD = path.resolve(arg("--mod", "E:/starcatcher"));
const JAR = arg("--jar", findJar());

// Tags that come from Minecraft / NeoForge (not in the mod), shown with one example item
const TAG_EXAMPLES = {
  "c:dyes": ["minecraft:white_dye", "minecraft:red_dye", "minecraft:yellow_dye", "minecraft:green_dye", "minecraft:blue_dye", "minecraft:black_dye"],
  "c:glass_panes": ["minecraft:glass_pane"],
  "minecraft:leaves": ["minecraft:oak_leaves", "minecraft:birch_leaves", "minecraft:spruce_leaves"],
  "minecraft:planks": ["minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks", "minecraft:cherry_planks"],
  "minecraft:saplings": ["minecraft:oak_sapling", "minecraft:birch_sapling", "minecraft:spruce_sapling"],
  "minecraft:wooden_slabs": ["minecraft:oak_slab", "minecraft:spruce_slab", "minecraft:birch_slab"],
  "minecraft:wool": ["minecraft:white_wool", "minecraft:red_wool", "minecraft:blue_wool", "minecraft:black_wool"]
};

function findJar() {
  const home = os.homedir();
  const options = [
    path.join(home, ".gradle/caches/neoformruntime/artifacts/minecraft_1.21.1_client.jar"),
    path.join(home, ".gradle/caches/fabric-loom/1.21.1/minecraft-client.jar")
  ];
  return options.find(f => fs.existsSync(f));
}

// ---------- helpers ----------
const readJson = f => JSON.parse(fs.readFileSync(f, "utf8"));
const exists = f => fs.existsSync(f);
const split = id => { const [ns, p] = id.includes(":") ? id.split(":") : ["minecraft", id]; return { ns, p }; };
function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out); else out.push(f);
  }
  return out;
}

// Resource folders, searched in order
const modRes = [path.join(MOD, "src/generated/resources"), path.join(MOD, "src/main/resources")];
const vanillaRes = path.join(CACHE, "vanilla");
const allRes = [...modRes, vanillaRes];
function resFile(rel) {
  for (const r of allRes) { const f = path.join(r, rel); if (exists(f)) return f; }
  return null;
}

// ---------- vanilla assets (extracted once from the client jar) ----------
function extractVanilla() {
  if (exists(path.join(vanillaRes, "assets/minecraft/lang/en_us.json"))) return;
  if (!JAR) { console.warn("! Minecraft client jar not found: vanilla items will have no names/icons. Pass --jar <path>."); return; }
  fs.mkdirSync(vanillaRes, { recursive: true });
  // Windows' own tar can read .jar (zip) files; Git Bash's tar can't
  const winTar = "C:/Windows/System32/tar.exe";
  const tar = exists(winTar) ? winTar : "tar";
  console.log("Extracting vanilla assets from " + JAR);
  execFileSync(tar, ["-xf", JAR, "-C", vanillaRes,
    "assets/minecraft/lang/en_us.json",
    "assets/minecraft/models/item", "assets/minecraft/models/block",
    "assets/minecraft/textures/item", "assets/minecraft/textures/block"]);
}
// Minecraft's font texture (the wiki draws recipe counts with it). Extracted on its own so
// caches made before it was needed still get it.
function extractFont() {
  if (exists(path.join(vanillaRes, "assets/minecraft/textures/font/ascii.png")) || !JAR) return;
  const winTar = "C:/Windows/System32/tar.exe";
  execFileSync(exists(winTar) ? winTar : "tar", ["-xf", JAR, "-C", vanillaRes, "assets/minecraft/textures/font/ascii.png"]);
}

// ---------- names ----------
function loadLang() {
  const lang = {};
  for (const f of [path.join(vanillaRes, "assets/minecraft/lang/en_us.json"), ...modRes.map(r => path.join(r, "assets", NS, "lang/en_us.json"))])
    if (exists(f)) Object.assign(lang, readJson(f));
  return lang;
}
const prettify = p => p.split("/").pop().split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

// ---------- tags ----------
function loadTags() {
  const raw = {};
  for (const r of modRes) {
    const data = path.join(r, "data");
    for (const f of walk(data)) {
      const m = path.relative(data, f).replace(/\\/g, "/").match(/^([^/]+)\/tags\/item\/(.+)\.json$/);
      if (!m) continue;
      const id = m[1] + ":" + m[2];
      const vals = (readJson(f).values || []).map(v => typeof v === "string" ? v : v.id);
      raw[id] = (raw[id] || []).concat(vals);
    }
  }
  for (const [t, items] of Object.entries(TAG_EXAMPLES)) if (!raw[t]) raw[t] = items;
  // Resolve "#other:tag" references
  const done = {};
  const resolve = (t, seen = new Set()) => {
    if (done[t]) return done[t];
    if (seen.has(t)) return [];
    seen.add(t);
    const out = [];
    for (const v of raw[t] || []) {
      if (v.startsWith("#")) out.push(...resolve(v.slice(1), seen)); else out.push(v);
    }
    return (done[t] = [...new Set(out)]);
  };
  for (const t of Object.keys(raw)) resolve(t);
  return done;
}

// ---------- icons ----------
// Follows an item model's parents and returns the texture that best represents it
function modelTextures(modelId, depth = 0) {
  if (depth > 10) return {};
  const { ns, p } = split(modelId);
  const f = resFile(`assets/${ns}/models/${p}.json`);
  if (!f) return {};
  const m = readJson(f);
  const parent = m.parent ? modelTextures(m.parent, depth + 1) : {};
  return { ...parent, ...(m.textures || {}) };
}
// Full model (elements, textures, inventory "gui" view) for items drawn as 3D blocks.
// Returns null for flat items (item/generated) and items drawn by Java code.
function resolveModel(itemId) {
  let id = `${split(itemId).ns}:item/${split(itemId).p}`;
  const chain = [];
  for (let n = 0; id && n < 12; n++) {
    const { ns, p } = split(id);
    const f = resFile(`assets/${ns}/models/${p}.json`);
    if (!f) break;
    const m = readJson(f);
    chain.push(m);
    id = m.parent && !m.parent.startsWith("builtin/") ? m.parent : null;
  }
  const withElements = chain.find(m => m.elements);
  if (!withElements) return null;
  const textures = {};
  let shade = true;
  for (const m of chain.slice().reverse()) { // parent first, child overrides
    Object.assign(textures, m.textures || {});
    if (m.gui_light) shade = m.gui_light !== "front";
  }
  // Like Minecraft: the nearest model with a "gui" pose wins as a whole;
  // anything it leaves out is 0 rotation / 0 translation / scale 1
  const withGui = chain.find(m => m.display && m.display.gui);
  const g = withGui ? withGui.display.gui : {};
  const display = { rotation: g.rotation || [0, 0, 0], translation: g.translation || [0, 0, 0], scale: g.scale || [1, 1, 1] };
  return { elements: withElements.elements, textures, gui: display, shade };
}

function deref(tex, key, n = 0) {
  let v = tex[key];
  while (v && v.startsWith("#") && n++ < 10) v = tex[v.slice(1)];
  return v;
}
function iconTexture(itemId) {
  const { ns, p } = split(itemId);
  // Hand-made icons win: tools/wiki-icons/<namespace>/<item>.png (e.g. starcatcher/tackle_box.png)
  const override = path.join(ROOT, "tools/wiki-icons", ns, p + ".png");
  if (exists(override)) return override;
  const tex = modelTextures(`${ns}:item/${p}`);
  const tryTex = t => { if (!t) return null; const s = split(t); return resFile(`assets/${s.ns}/textures/${s.p}.png`); };
  return tryTex(deref(tex, "layer0"))
    || resFile(`assets/${ns}/textures/item/${p}.png`)
    || tryTex(deref(tex, "particle")) || tryTex(deref(tex, "all")) || tryTex(deref(tex, "side")) || tryTex(deref(tex, "texture"))
    || tryTex(Object.keys(tex).map(k => deref(tex, k)).find(v => v && !v.startsWith("#")))
    || resFile(`assets/${ns}/textures/block/${p}.png`);
}

// ---------- main ----------
extractVanilla();
extractFont();
const lang = loadLang();
const tags = loadTags();

// Recipes
const recipes = [];
for (const r of modRes) {
  const dir = path.join(r, "data", NS, "recipe");
  for (const f of walk(dir).filter(f => f.endsWith(".json"))) {
    const id = NS + ":" + path.relative(dir, f).replace(/\\/g, "/").replace(/\.json$/, "");
    if (recipes.some(x => x.id === id)) continue;
    recipes.push({ id, ...readJson(f) });
  }
}

// Every Starcatcher item and block that has a name
const ids = new Set();
for (const k of Object.keys(lang)) {
  const m = k.match(new RegExp(`^(?:item|block)\\.${NS}\\.([a-z0-9_]+)$`));
  if (m) ids.add(NS + ":" + m[1]);
}
// Plus every item recipes and tags mention (vanilla ones included)
const collect = v => {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) return v.forEach(collect);
  if (typeof v.item === "string") ids.add(v.item);
  if (typeof v.id === "string" && v.id.includes(":")) ids.add(v.id);
  if (typeof v.tag === "string") (tags[v.tag] || []).forEach(i => ids.add(i));
  Object.values(v).forEach(collect);
};
recipes.forEach(({ id, ...r }) => collect(r)); // skip the recipe's own id
// Plus vanilla items the wiki pages mention, e.g. {{item minecraft:emerald}}
const PAGES_DIR = path.join(ROOT, "public/mods/starcatcher/wiki/pages");
for (const f of fs.readdirSync(PAGES_DIR).filter(f => f.endsWith(".md")))
  for (const tag of fs.readFileSync(path.join(PAGES_DIR, f), "utf8").match(/\{\{[^}]*\}\}/g) || [])
    for (const id of tag.match(/minecraft:[a-z0-9_]+/g) || []) ids.add(id);
// Optional compat entries in tags (other mods' fish) aren't shown
for (const id of ids) if (!/^(minecraft|starcatcher):/.test(id)) ids.delete(id);
// Internal items that shouldn't appear on the wiki
const HIDDEN = [
  "missingno", "deep_dark_bobber", "scalding_treasure", "unknown_fish", "waterlogged_bottle",
  "waterlogged_satchel", "treasure", "secret_note", "settings", "tackle_box"
];
for (const p of HIDDEN) ids.delete(NS + ":" + p);
// ...and out of tags too, so recipes that take "any tackle box" don't cycle through them
for (const t of Object.keys(tags)) tags[t] = tags[t].filter(i => !(i.startsWith(NS + ":") && HIDDEN.includes(i.slice(NS.length + 1))));

// Which tags each item is in (only the mod's own tags, which describe categories/rarities)
const itemTags = {};
for (const [t, list] of Object.entries(tags)) if (t.startsWith(NS + ":")) list.forEach(i => (itemTags[i] = itemTags[i] || []).push(t));

// Icons are updated in place (not by wiping the folder): a running "npm run dev"
// stops serving files that disappear from under it, even if they come back.
const ICONS = path.join(OUT, "icons");
const keptIcons = new Set();
function copyIcon(src, rel) {
  const dest = path.join(ICONS, rel);
  keptIcons.add(path.normalize(dest));
  if (exists(dest) && fs.readFileSync(dest).equals(fs.readFileSync(src))) return; // unchanged
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
const items = {};
const models = {};
let missing = 0;
for (const id of [...ids].sort()) {
  const { ns, p } = split(id);
  const name = lang[`item.${ns}.${p}`] || lang[`block.${ns}.${p}`] || prettify(p);
  const entry = { name };
  const src = iconTexture(id);
  if (src) {
    const rel = `${ns}/${p}.png`;
    copyIcon(src, rel);
    entry.icon = rel;
    // Animated textures are tall strips; tell the page so it only shows the first frame
    if (exists(src + ".mcmeta")) entry.animated = true;
  } else missing++;
  if (itemTags[id]) entry.tags = itemTags[id];
  // Description: the item's in-game tooltip lines, "tooltip.starcatcher.<item>.0", ".1", ...
  // Kept with the mod's colour tags (<sclegendary>...</sclegendary>); the wiki colours them.
  const desc = [];
  for (let n = 0; lang[`tooltip.${ns}.${p}.${n}`] != null; n++) desc.push(lang[`tooltip.${ns}.${p}.${n}`].trim());
  if (desc.some(Boolean)) entry.desc = desc.filter(Boolean).join(" ");
  // 3D models (hats, tackle boxes, vanilla blocks...): the wiki draws these in the browser.
  // A hand-made icon in tools/wiki-icons always wins over the 3D render.
  const model = !exists(path.join(ROOT, "tools/wiki-icons", ns, p + ".png")) && resolveModel(id);
  if (model) {
    const tex = {};
    for (const key of Object.keys(model.textures)) {
      const t = deref(model.textures, key);
      if (!t || t.startsWith("#")) continue;
      const s = split(t);
      const file = resFile(`assets/${s.ns}/textures/${s.p}.png`);
      if (!file) continue;
      const rel = `tex/${s.ns}/${s.p}.png`;
      copyIcon(file, rel);
      tex[key] = rel;
    }
    models[id] = { elements: model.elements, textures: tex, gui: model.gui, shade: model.shade };
    entry.model = true;
  }
  items[id] = entry;
}

// Minecraft's font, for the numbers in recipe slots -> icons/font/ascii.png
const fontPng = path.join(vanillaRes, "assets/minecraft/textures/font/ascii.png");
if (exists(fontPng)) copyIcon(fontPng, "font/ascii.png");

// Remove icons of items that no longer exist
(function prune(dir) {
  if (!exists(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { prune(p); if (!fs.readdirSync(p).length) fs.rmdirSync(p); }
    else if (!keptIcons.has(path.normalize(p))) fs.rmSync(p);
  }
})(ICONS);

// Which items can be fished up and at what rarity (trash included), from DGStarcatcherFishes.java
for (const [id, rarity] of Object.entries(readCatches(MOD)))
  if (items[id]) items[id].caught = rarity;
// Where and when each fish bites (dimension, biome, time, weather, bait...), from DGStarcatcherFishes.java
for (const [id, where] of Object.entries(readFishWhere(MOD, lang)))
  if (items[id]) items[id].where = where;
// Trophies: fished up once you've reached some milestones, from DGTrophies.java
for (const [id, needs] of Object.entries(readTrophies(MOD)))
  if (items[id]) items[id].trophy = needs;

// Smithing templates: rare catches in specific places (DGTrophies.java, registered with .extra())
// and treasure from specific fish (the "treasures" section of DGSCDataMapsProvider.java)
const isTemplate = id => id.startsWith(NS + ":") && id.endsWith("_smithing_template");
for (const [id, c] of Object.entries(readExtraCatches(MOD)))
  if (items[id] && isTemplate(id)) items[id].rareCatch = c;
for (const [id, fish] of Object.entries(readFishTreasures(MOD)))
  if (items[id] && isTemplate(id)) items[id].treasureFrom = fish.filter(f => items[f]);

// Extra ways to get items, from the info pages in StarcatcherJeiPlugin.java.
// Only the pages that say where an item comes from are used (the worm and hook/bobber/bait
// pages describe what items do instead). For each page: true = every item it lists, or a
// list of the items it's really about.
const JEI_HOW_TO_GET = {
  "emi.info.starcatcher.bonemeal_farmland": true,
  "emi.info.starcatcher.pearls": ["starcatcher:pearl"], // also lists the clam, which makes them
  "emi.info.starcatcher.fish_bones": true,
  "emi.info.starcatcher.pearl_template": true,
  "emi.info.starcatcher.hat": true
};
const bonemeal = readBonemealDrops(MOD);
for (const page of readJeiInfo(MOD, lang)) {
  const use = JEI_HOW_TO_GET[page.key];
  if (!use || !page.text) continue;
  let ids = [...page.items, ...page.tags.flatMap(t => tags[t] || []), ...(page.bonemeal ? Object.keys(bonemeal) : [])];
  if (Array.isArray(use)) ids = ids.filter(id => use.includes(id));
  for (const id of new Set(ids)) {
    if (!items[id]) continue;
    (items[id].obtain = items[id].obtain || []).push(page.text);
    if (page.bonemeal && bonemeal[id]) items[id].bonemeal = bonemeal[id];
  }
}

// What each hook / bobber / bait / hat... does, from the mod's DGSCDataMapsProvider.java
const modifiers = readModifiers(MOD, lang);
let withModifiers = 0;
for (const [id, list] of Object.entries(modifiers))
  if (items[id]) { items[id].modifiers = list; withModifiers++; }

const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data));
write("items.json", items);
write("recipes.json", recipes);
write("tags.json", tags);
write("models.json", models);
console.log(`Done: ${Object.keys(items).length} items (${missing} without icon, ${Object.keys(models).length} 3D models, ${withModifiers} with modifiers), ${recipes.length} recipes, ${Object.keys(tags).length} tags -> ${path.relative(ROOT, OUT)}`);
