/*
 * Reads the "info" pages the mod adds to JEI, from
 *   src/main/java/com/wdiscute/starcatcher/compat/jei/StarcatcherJeiPlugin.java
 * Each `registration.addItemStackInfo(ITEMS, Component.translatable("key"), ...)` becomes
 *   { key: "emi.info.starcatcher.pearls", text: "...", items: [...], tags: [...], bonemeal: bool }
 *
 * items    item ids named in the call (SCItems.X, SCBlocks.X)
 * tags     item tags it covers (SCBlocks.HATS.getEntries() -> starcatcher:hats)
 * bonemeal true when the list is the bonemeal-farmland drops (see readBonemealDrops)
 *
 * Also reads the bonemeal-farmland drops with their chances, from the mod's data:
 *   src/generated/resources/data/starcatcher/starcatcher/bonemeal_interaction_drops.json
 */
import fs from "node:fs";
import path from "node:path";
import { stripComments, balanced, itemId, registryNames } from "./read-modifiers.mjs";

const JAVA = "src/main/java/com/wdiscute/starcatcher";

export function readJeiInfo(modDir, lang) {
  const file = path.join(modDir, JAVA, "compat/jei/StarcatcherJeiPlugin.java");
  if (!fs.existsSync(file)) { console.warn("No JEI info: " + file + " not found"); return []; }
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const names = registryNames(path.join(modDir, JAVA, "registry"));

  // The statements of registerRecipes(), split at top-level semicolons
  const start = src.search(/void\s+registerRecipes\s*\(/);
  if (start < 0) return [];
  const body = balancedBraces(src, src.indexOf("{", start));
  const statements = splitStatements(body);

  const out = [];
  statements.forEach((st, i) => {
    if (!/addItemStackInfo\(/.test(st)) return;
    const keys = [...st.matchAll(/translatable\("([^"]+)"\)/g)].map(m => m[1]);
    if (!keys.length) return;
    // A list built in earlier statements (e.g. `list`, `attachments`): include those too
    const call = balanced(st, st.indexOf("(", st.indexOf("addItemStackInfo(")));
    const first = call.split(",")[0].trim();
    let context = st;
    if (/^[a-z]\w*$/.test(first))
      context += statements.slice(0, i).filter(s => new RegExp("\\b" + first + "\\b").test(s)).join(";");

    const items = [...context.matchAll(/\bSC(?:Items|Blocks)\.[A-Z0-9_]+/g)]
      .filter(m => !/HATS$/.test(m[0]))
      .map(m => itemId(m[0], names)).filter(Boolean);
    const tags = /SCBlocks\.HATS\.getEntries/.test(context) ? ["starcatcher:hats"] : [];
    out.push({
      key: keys[0].replace(/\.\d+$/, ""),
      text: keys.map(k => lang[k] || "").filter(Boolean).join(" "),
      items: [...new Set(items)],
      tags,
      bonemeal: /BONEMEAL_INTERACTION_ENTRY/.test(context)
    });
  });
  return out;
}

// { "starcatcher:worm": [{ block: "Farmland", chance: 74.25, golden: 0.75 }, ...], ... }
// chance / golden: % of bonemeal drops on that block that are this item (normal / golden)
export function readBonemealDrops(modDir) {
  const file = path.join(modDir, "src/generated/resources/data/starcatcher/starcatcher/bonemeal_interaction_drops.json");
  if (!fs.existsSync(file)) return {};
  const entries = (JSON.parse(fs.readFileSync(file, "utf8")).add || []).filter(e => e.weight > 0 && e.item && e.item.identifier);
  const total = {};
  for (const e of entries) total[e.block] = (total[e.block] || 0) + e.weight;
  const out = {};
  for (const e of entries) {
    const id = e.item.identifier;
    const golden = JSON.stringify(e.item.data_components_patch || {}).includes('"golden"');
    const list = out[id] = out[id] || [];
    let row = list.find(r => r.blockId === e.block);
    if (!row) list.push(row = { blockId: e.block, block: blockName(e.block), chance: 0, golden: 0 });
    row[golden ? "golden" : "chance"] += e.weight / total[e.block] * 100;
  }
  for (const list of Object.values(out)) for (const r of list) {
    r.chance = Math.round(r.chance * 100) / 100;
    r.golden = Math.round(r.golden * 100) / 100;
    delete r.blockId;
  }
  return out;
}

function blockName(id) {
  if (id === "#neoforge:villager_farmlands") return "Farmland";
  const [ns, p] = id.replace(/^#/, "").split(":");
  const name = p.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  return ns === "farmersdelight" ? name + " (Farmer's Delight)" : name;
}

function balancedBraces(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return s.slice(open + 1, i);
  }
  return s.slice(open + 1);
}
function splitStatements(s) {
  const out = []; let depth = 0, cur = "", str = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    cur += c;
    if (str) { if (c === "\\") cur += s[++i]; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === "(" || c === "{") depth++;
    else if (c === ")" || c === "}") depth--;
    else if (c === ";" && depth === 0) { out.push(cur.trim()); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
