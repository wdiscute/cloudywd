/*
 * Starcatcher datapack generator (Minecraft 1.21.1, Starcatcher 4.0).
 *
 * Everything runs in the browser. The pack is kept as plain JS objects that
 * are exactly the JSON files the mod reads, so the form edits those objects
 * directly and the download just writes them out.
 *
 * Fish files go to: data/<namespace>/starcatcher/fish/<name>.json
 * The formats below come from the mod's codecs (FishProperties, CatchInfo,
 * Difficulty, SizeAndWeight, Textures, the fish restrictions and the
 * minigame modifiers).
 */
(function () {
  "use strict";

  // Difficulty presets, copied from the mod's Difficulty class (generic ones only).
  var PRESETS = [{"label":"Trash","difficulty":{"decay":0,"hp":100,"missPenalty":0,"modifiers":[],"speed":10,"sweetspots":[{"color_as_int":-15732736,"hitbox_size_in_pixels":22,"is_flip":false,"moving_rate":0,"reward":30,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/normal.png","vanishing_rate":0},{"color_as_int":-15732736,"hitbox_size_in_pixels":22,"is_flip":false,"moving_rate":0,"reward":30,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/normal.png","vanishing_rate":0}]}},{"label":"Easy","difficulty":{"decay":1,"hp":75,"missPenalty":5,"modifiers":[],"speed":7,"sweetspots":[{"color_as_int":-15732736,"hitbox_size_in_pixels":22,"is_flip":false,"moving_rate":0,"reward":15,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/normal.png","vanishing_rate":0},{"color_as_int":-15732736,"hitbox_size_in_pixels":22,"is_flip":false,"moving_rate":0,"reward":15,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/normal.png","vanishing_rate":0}]}},{"label":"Medium","difficulty":{"decay":1,"hp":100,"missPenalty":20,"modifiers":[],"speed":10,"sweetspots":[{"color_as_int":-15732736,"hitbox_size_in_pixels":22,"is_flip":false,"moving_rate":0,"reward":15,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/normal.png","vanishing_rate":0},{"color_as_int":-15732736,"hitbox_size_in_pixels":15,"is_flip":false,"moving_rate":0,"reward":20,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/thin.png","vanishing_rate":0}]}},{"label":"Hard","difficulty":{"decay":1,"hp":100,"missPenalty":20,"modifiers":[],"speed":11,"sweetspots":[{"color_as_int":-15732736,"hitbox_size_in_pixels":15,"is_flip":false,"moving_rate":0,"reward":20,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/thin.png","vanishing_rate":0},{"color_as_int":-15732736,"hitbox_size_in_pixels":15,"is_flip":false,"moving_rate":0,"reward":20,"sweetspot_type":"starcatcher:normal","texture_path":"starcatcher:textures/gui/minigame/spots/thin.png","vanishing_rate":0}]}}];

  // Data pack format for each supported Minecraft version (minecraft.wiki "Pack format").
  // The fish JSON is the same on all of them; only pack.mcmeta changes. From 1.21.9 on,
  // formats have a minor part and pack.mcmeta uses min_format / max_format.
  var VERSIONS = [
    { id: "1.20.1", format: 15 },
    { id: "1.21.1", format: 48 },
    { id: "26.1.2", format: [101, 1] },
    { id: "26.2", format: [107, 1] },
    { id: "26.3", format: [121, 0] }
  ];
  var DEFAULT_VERSION = "1.21.1";

  function versionById(id) {
    return VERSIONS.filter(function (v) { return v.id === id; })[0] || versionById(DEFAULT_VERSION);
  }

  function packMeta(versionId, description) {
    var f = versionById(versionId).format;
    var pack = Array.isArray(f) ? { min_format: f, max_format: f[0] } : { pack_format: f };
    pack.description = description;
    return { pack: pack };
  }

  // The version an imported pack.mcmeta was made for, if it matches one of ours.
  function versionFromMeta(pack) {
    if (!pack) return null;
    var major = typeof pack.pack_format === "number" ? pack.pack_format
      : Array.isArray(pack.min_format) ? pack.min_format[0] : pack.min_format;
    var match = VERSIONS.filter(function (v) { return (Array.isArray(v.format) ? v.format[0] : v.format) === major; })[0];
    return match ? match.id : null;
  }
  var STORAGE_KEY = "starcatcher-datapack-generator-v1";

  // ---------------------------------------------------------------------
  // Option lists
  // ---------------------------------------------------------------------

  var RARITIES = ["trash", "common", "uncommon", "rare", "epic", "legendary"];
  var ENTRY_TYPES = [
    ["fish", "Fish"],
    ["trophy", "Trophy"],
    ["message", "Message"],
    ["extra", "Extra"]
  ];
  // [value saved in the JSON, label shown in the dropdown]
  var WEATHER = [["clear", "Clear"], ["rain", "Rain"], ["thunder", "Thunder"], ["clear_or_rain", "Clear or rain"],
    ["clear_or_thunder", "Clear or thunder"], ["rain_or_thunder", "Rain or thunder"]];
  // snake_case values -> [value, "Readable label"] pairs, e.g. "full_moon" -> ["full_moon", "Full moon"].
  function readable(values) {
    return values.map(function (v) { var s = v.replace(/_/g, " "); return [v, s.charAt(0).toUpperCase() + s.slice(1)]; });
  }
  // The value of a dropdown option, whether it is a plain value or a [value, label] pair.
  function optValue(o) { return Array.isArray(o) ? o[0] : o; }
  var MOON_PHASES = readable(["full_moon", "waning_gibbous", "third_quarter", "waning_crescent", "new_moon", "waxing_crescent", "first_quarter", "waxing_gibbous"]);
  var SEASONS = readable(["all", "early_spring", "mid_spring", "late_spring", "early_summer", "mid_summer", "late_summer",
    "early_autumn", "mid_autumn", "late_autumn", "early_winter", "mid_winter", "late_winter"]);
  var COUNT_TYPES = readable(["total", "unique", "all"]);
  var SWEETSPOT_TYPES = ["normal", "mushroom", "freeze", "treasure", "tnt", "deepslate", "leaf", "dripstone",
    "cloud", "glowing", "sculk", "mirage"].map(function (s) { return "starcatcher:" + s; });
  var SPOT_TEXTURES = ["starcatcher:textures/gui/minigame/spots/normal.png"];
  var TANKS = ["surface", "sky", "cave", "icy", "deep_dark", "lava_overworld", "nether", "end", "end_void"]
    .map(function (s) { return "starcatcher:textures/gui/minigame/tanks/" + s + ".png"; });

  var DEFAULT_TEXTURES = {
    buttons: "starcatcher:textures/gui/minigame/buttons.png",
    handle: "starcatcher:textures/gui/minigame/handle.png",
    rod: "starcatcher:textures/gui/minigame/rod.png",
    tank: "starcatcher:textures/gui/minigame/tanks/surface.png",
    treasure: "starcatcher:textures/gui/minigame/treasure.png",
    wheels: "starcatcher:textures/gui/minigame/wheels.png"
  };

  var DEFAULT_SWEETSPOT = {
    color_as_int: -15732736,
    hitbox_size_in_pixels: 22,
    is_flip: false,
    moving_rate: 0,
    reward: 15,
    sweetspot_type: "starcatcher:normal",
    texture_path: "starcatcher:textures/gui/minigame/spots/normal.png",
    vanishing_rate: 0
  };

  // Suggestions shown under text fields (players can still type anything).
  var SUGGEST = {
    dimension: ["overworld", "the_nether", "the_end"],
    fluid: ["minecraft:water", "minecraft:lava"],
    bait: ["starcatcher:cherry_bait", "starcatcher:dripstone_bait", "starcatcher:gunpowder_bait",
      "starcatcher:legendary_bait", "starcatcher:lush_bait", "starcatcher:meteorological_bait",
      "starcatcher:murkwater_bait", "starcatcher:sculk_bait", "starcatcher:targeted_bait"],
    structure: ["minecraft:ocean_ruin_cold", "minecraft:ocean_ruin_warm", "minecraft:shipwreck",
      "minecraft:monument", "minecraft:end_city", "minecraft:fortress", "minecraft:bastion_remnant",
      "minecraft:ancient_city", "minecraft:trail_ruins", "minecraft:village_plains"]
  };

  // ---------------------------------------------------------------------
  // Schemas. Each field: { k, label, type, ...options }.
  //   int / float / text / id / bool / select / color
  //   idlist   - list of ids (tags allowed with tags:true)
  //   enumlist - list of values picked from options
  //   map      - object of key -> int, keys typed (id) or picked (options)
  //   objlist  - list of small objects with their own fields
  //   sweetspot - one sweetspot object
  //   sweetspots / modifiers - lists of sweetspots / minigame modifiers
  // opt:true means "leave out of the JSON when empty".
  // ---------------------------------------------------------------------

  var TRANSLATION = { k: "translation_override", label: "Guide text override", type: "text", opt: true, size: "full",
    hint: "Optional translation key shown in the fishing guide instead of the default text." };

  var RESTRICTIONS = [
    { id: "dimension", label: "Dimension", fields: [
      { k: "dimension_entry", label: "Dimension entry", type: "text", def: "overworld", suggest: "dimension",
        hint: "overworld, the_nether or the_end. Modded dimensions that act like one of these count too." }] },
    { id: "biome", label: "Biomes", fields: [
      { k: "biomes", label: "Biomes", type: "idlist", tags: true, addLabel: "Add biome",
        hint: "Biome ids or #tags. The fish bites in any of these." },
      { k: "blacklist", label: "Blacklist", type: "idlist", tags: true, addLabel: "Add biome",
        hint: "Biomes to exclude even if they match above." },
      { k: "hover_translation", label: "Hover text", type: "text", opt: true, size: "full" }] },
    { id: "fluid", label: "Fluid", fields: [
      { k: "fluids", label: "Fluids", type: "idlist", suggest: "fluid", addLabel: "Add fluid" }] },
    { id: "elevation_restriction", label: "Height range", fields: [
      // One "yrange" control edits both min_y and max_y: Above / Below use the Java int limits,
      // like the mod's own ABOVE_FIFTY (50, Integer.MAX_VALUE) and BELOW_ZERO (Integer.MIN_VALUE, 0).
      { k: "range", label: "Range", type: "yrange", min: 50, max: 320 }],
      // check(item): a problem with the values as a whole, or null. Shown on the card and blocks Generate.
      check: function (r) {
        return typeof r.min_y === "number" && typeof r.max_y === "number" && r.min_y >= r.max_y ? "Min Y must be lower than Max Y." : null;
      },
      checkFields: ["min_y", "max_y"] }, // boxes that turn red while check() fails
    { id: "elevation_bias", label: "Height bias", fields: [
      { k: "best_y", label: "Best Y", type: "int", def: 0 },
      { k: "range", label: "Range", type: "int", def: 10 }] },
    { id: "weather_restriction", label: "Weather", fields: [
      { k: "weather", label: "Weather", type: "select", options: WEATHER, def: "rain" }] },
    { id: "daytime_restriction", label: "Time of day", fields: [
      { k: "ranges", label: "Time ranges", type: "objlist", addLabel: "Add range",
        hint: "In ticks: 0 = sunrise, 6000 = noon, 12000 = sunset, 18000 = midnight, 24000 = next sunrise.",
        fields: [{ k: "min", label: "From", type: "int", def: 0 }, { k: "max", label: "To", type: "int", def: 12000 }] }] },
    { id: "daytime_bias", label: "Time of day bias", fields: [
      { k: "best_daytime", label: "Best time (ticks)", type: "int", def: 6000 },
      { k: "range", label: "Range (ticks)", type: "int", def: 2000 },
      { k: "extra_chance_at_best", label: "Extra chance at best", type: "int", def: 5 }] },
    { id: "moon_phase", label: "Moon phase", fields: [
      { k: "allowed_phases", label: "Allowed phases", type: "enumlist", options: MOON_PHASES, addLabel: "Add phase" }] },
    { id: "light_level_restriction", label: "Light level", fields: [
      { k: "min_light", label: "Min light", type: "int", def: 0 },
      { k: "max_light", label: "Max light", type: "int", def: 15 }] },
    { id: "bait", label: "Bait", fields: [
      { k: "baits", label: "Baits", type: "map", keyType: "id", suggest: "bait", def0: 100, addLabel: "Add bait",
        hint: "Bait item id and how much it adds to the chance." },
      { k: "force_add_to_fish_in_area", label: "Show in 'fish in area' even without the bait", type: "bool", def: false }] },
    { id: "luck_restriction", label: "Luck", fields: [
      { k: "requirement", label: "Luck required", type: "int", def: 1 }] },
    { id: "season", label: "Seasons", fields: [
      { k: "season_extra_chance", label: "Seasons", type: "map", options: SEASONS, def0: 5, addLabel: "Add season",
        hint: "Extra chance during each season.\n\nIf the current season doesn't match any of the selected seasons, the fish won't be catchable." }] },
    { id: "structure_restriction", label: "Structure", fields: [
      { k: "structure", label: "Structures", type: "idlist", suggest: "structure", addLabel: "Add structure" }] },
    { id: "percentage_chance", label: "Percentage chance", fields: [
      { k: "chance", label: "Chance (0 to 1)", type: "float", def: 0.1 }] },
    { id: "caught_limit", label: "Catch limit", fields: [
      { k: "limit", label: "Max times a player can catch it", type: "int", def: 1 }] },
    { id: "rarity_count", label: "Fish caught requirement", fields: [
      { k: "rarities", label: "Requirements", type: "objlist", addLabel: "Add requirement", fields: [
        { k: "rarity", label: "Rarity", type: "select", opt: true, options: [["", "Any rarity"]].concat(readable(RARITIES.concat(["golden"]))) },
        { k: "count", label: "Count", type: "int", def: 10 },
        { k: "count_type", label: "Count type", type: "select", options: COUNT_TYPES, def: "total" }] }] }
  ];

  // Restriction help text shows in (?) bubbles instead of under the fields.
  TRANSLATION.tip = true;
  (function tipAll(fields) {
    fields.forEach(function (f) { f.tip = true; if (f.fields) tipAll(f.fields); });
  })(RESTRICTIONS.reduce(function (all, r) { return all.concat(r.fields); }, []));

  var MODIFIERS = [
    { id: "spawn_sweetspots", label: "Spawn extra sweetspots", fields: [
      { k: "chance", label: "Chance", type: "float", def: 0.3 },
      { k: "cooldown", label: "Cooldown (ticks)", type: "int", def: 100 },
      { k: "sudoku_vanish", label: "Vanishes when hit", type: "bool", def: false },
      { k: "sweetspot", label: "Sweetspot", type: "sweetspot" }] },
    { id: "add_basic_sweetspot", label: "Add sweetspot", fields: [
      { k: "sweetspot_to_add", label: "Sweetspot", type: "sweetspot" }] },
    { id: "freeze_on_miss", label: "Freeze on miss", fields: [
      { k: "length", label: "Length (ticks)", type: "int", def: 40 },
      { k: "rampTime", label: "Ramp time (ticks)", type: "int", def: 10 }] },
    { id: "burn_on_miss", label: "Burn on miss", fields: [
      { k: "length", label: "Length (ticks)", type: "int", def: 40 },
      { k: "ramp_time", label: "Ramp time (ticks)", type: "int", def: 10 },
      { k: "extra_speed", label: "Extra speed", type: "int", def: 20 }] },
    { id: "flip_sweetspots_on_miss", label: "Flip sweetspots on miss", fields: [
      { k: "chance", label: "Chance", type: "float", def: 0.05 }] },
    { id: "multi_layer", label: "Multiple layers", fields: [
      { k: "max_layers", label: "Max layers", type: "int", def: 2 }] },
    { id: "spawn_treasure", label: "Spawn treasure", fields: [
      { k: "chance", label: "Chance", type: "float", def: 0.1 }] },
    { id: "spawn_treasure_on_hit_x", label: "Treasure after X hits", fields: [
      { k: "hits_to_spawn_treasure", label: "Hits", type: "int", def: 5 }] },
    { id: "adjust_hp", label: "Adjust HP", fields: [{ k: "multiplier", label: "Multiplier", type: "float", def: 1 }] },
    { id: "adjust_decay_rate", label: "Adjust decay rate", fields: [{ k: "multiplier", label: "Multiplier", type: "float", def: 1 }] },
    { id: "adjust_penalty_rate", label: "Adjust miss penalty", fields: [{ k: "multiplier", label: "Multiplier", type: "float", def: 1 }] },
    { id: "adjust_handle_speed", label: "Adjust handle speed", fields: [{ k: "multiplier", label: "Multiplier", type: "float", def: 1 }] },
    { id: "adjust_moving_sweetspots", label: "Adjust sweetspot movement", fields: [{ k: "multiplier", label: "Multiplier", type: "float", def: 1 }] },
    { id: "adjust_vanishing_rate", label: "Adjust vanishing rate", fields: [{ k: "multiplier", label: "Multiplier", type: "float", def: 1 }] },
    { id: "teleport", label: "Teleporting sweetspots", fields: [] },
    { id: "pull_down", label: "Pull down", fields: [] },
    { id: "deep_dark", label: "Deep dark", fields: [] },
    { id: "add_leaves_spots", label: "Leaf sweetspots", fields: [] },
    { id: "bounce_back", label: "Bounce back", fields: [] },
    { id: "flip_every_hit", label: "Flip every hit", fields: [] },
    { id: "stop_decay_on_hit", label: "Stop decay on hit", fields: [] },
    { id: "bigger_green_sweetspots", label: "Bigger sweetspots", fields: [] },
    { id: "prevent_frozen", label: "Prevent freezing", fields: [] },
    { id: "never_lose", label: "Never lose", fields: [] },
    { id: "disable_hit_sounds", label: "Disable hit sounds", fields: [] },
    { id: "disable_miss_sounds", label: "Disable miss sounds", fields: [] }
  ];

  function byType(list) {
    var map = {};
    list.forEach(function (t) { map["starcatcher:" + t.id] = t; });
    return map;
  }
  var RESTRICTION_BY_TYPE = byType(RESTRICTIONS);
  var MODIFIER_BY_TYPE = byType(MODIFIERS);

  var SWEETSPOT_FIELDS = [
    // Laid out on a 4-column grid: Texture on its own line, then Behaviour (2 columns) +
    // Particle colour + Flipped, then the four numbers.
    { k: "texture_path", label: "Texture", tip: true, hint: "The texture drawn for this sweetspot in the minigame.\n\nPoints to a .png in a resource pack, e.g. `starcatcher:textures/gui/minigame/spots/normal.png`.", type: "text", suggest: "spotTexture", size: "full" },
    { k: "sweetspot_type", label: "Behaviour", tip: true, hint: "How the sweetspot reacts during the minigame.\n\nExample:\n• Normal: adds the reward value to the score.\n• Dripstone: removes the sweetspot when missed.\n\nPick Custom to use a sweetspot type added by another mod.", type: "selectCustom", options: SWEETSPOT_TYPES, customPlaceholder: "mymod:my_sweetspot", size: "wide" },
    { k: "color_as_int", label: "Particle colour", tip: true, hint: "Colour of the particles that appear when this sweetspot is hit.", type: "color", size: "one" },
    { k: "is_flip", label: "Flipped", tip: true, hint: "Flips the pointer's move direction when hitting this sweetspot.", type: "bool", size: "one" },
    { k: "hitbox_size_in_pixels", label: "Size (px)", tip: true, hint: "Width of the sweetspot's hit area, in pixels. Bigger is easier to hit.\n\nIt should match the visible pixels of the texture, so the hit area lines up with what the player sees.", type: "int", size: "one" },
    { k: "reward", label: "Reward", tip: true, hint: "How much score hitting this sweetspot gives. Compare it to the fish's HP.", type: "int", size: "one" },
    { k: "moving_rate", label: "Moving rate", tip: true, hint: "How fast the sweetspot moves along the wheel.\n\n0 means it stays still.", type: "float", size: "one" },
    { k: "vanishing_rate", label: "Vanishing rate", tip: true, hint: "How fast the sweetspot fades away.\n\n0 means it never vanishes.", type: "float", size: "one" },
    { k: "add_modifiers_on_hit", label: "Modifiers added on hit", tip: true, hint: "Minigame modifiers that get added when this sweetspot is hit.", type: "modifiers", opt: true }
  ];
  SUGGEST.spotTexture = SPOT_TEXTURES;
  SUGGEST.tank = TANKS;

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var v = attrs[key];
        if (v === undefined || v === null || v === false) return;
        if (key === "text") node.textContent = v;
        else if (key === "class") node.className = v;
        else if (key.slice(0, 2) === "on") node.addEventListener(key.slice(2), v);
        else node.setAttribute(key, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  var ID_RE = /^[a-z0-9_.\-]+:[a-z0-9_.\-\/]+$/;
  var TAG_OR_ID_RE = /^#?[a-z0-9_.\-]+:[a-z0-9_.\-\/]+$/;
  var NAMESPACE_RE = /^[a-z0-9_.\-]+$/;
  var PATH_RE = /^[a-z0-9_.\-]+(\/[a-z0-9_.\-]+)*$/;

  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9_.\-]+/g, "_").replace(/^_+|_+$/g, "") || "my_fish_pack";
  }

  function intToHex(n) {
    return "#" + ((Number(n) >>> 0) & 0xffffff).toString(16).padStart(6, "0");
  }
  function hexToInt(hex) {
    return (0xff000000 | parseInt(hex.slice(1), 16)) | 0;
  }

  var datalistCount = 0;
  var datalists = {};
  function datalistFor(name) {
    if (!SUGGEST[name]) return null;
    if (datalists[name]) return datalists[name];
    var id = "dl-" + (++datalistCount);
    var dl = el("datalist", { id: id });
    SUGGEST[name].forEach(function (v) { dl.appendChild(el("option", { value: v })); });
    document.body.appendChild(dl);
    datalists[name] = id;
    return id;
  }

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  var state = loadState() || {
    pack: { name: "My Fish Pack", namespace: "my_fish_pack", description: "Custom Starcatcher fish", version: DEFAULT_VERSION, nsAuto: true },
    fish: [],
    selected: -1
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.pack || !Array.isArray(s.fish)) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
    }, 250);
  }

  function newFishData() {
    return {
      catch_info: { item: { identifier: "" } },
      base_chance: 5,
      size_and_weight: {
        average_size_cm: 30,
        deviation_size_cm: 10,
        average_weight_grams: 1000,
        deviation_weight_grams: 300,
        golden_chance: 0.02
      },
      rarity: "common",
      restrictions: [],
      difficulty: { hp: 75, speed: 7, missPenalty: 5, decay: 1, modifiers: [], sweetspots: [] },
      skips_minigame: false,
      has_guide_entry: true,
      textures: clone(DEFAULT_TEXTURES)
    };
  }

  // A file name no other fish in the same namespace uses (`except` = the fish being renamed).
  function uniquePath(base, except) {
    var ns = except ? fishNs(except) : state.pack.namespace;
    var used = {};
    state.fish.forEach(function (f) { if (f !== except && fishNs(f) === ns) used[f.path] = true; });
    var p = base, i = 2;
    while (used[p]) { p = base + "_" + i; i++; }
    return p;
  }

  // The file name follows the item id ("minecraft:salmon" -> "salmon") until
  // the player types their own file name.
  function followsItem(fish) {
    if (fish.pathAuto !== undefined) return fish.pathAuto;
    return /^new_fish(_\d+)?$/.test(fish.path);
  }
  function pathFromItem(item) {
    var p = String(item || "").split(":").pop().toLowerCase().replace(/[^a-z0-9_.\-\/]+/g, "_").replace(/^[\/_]+|[\/_]+$/g, "");
    return PATH_RE.test(p) ? p : "";
  }

  function fishNs(f) { return f.ns || state.pack.namespace; }

  // ---------------------------------------------------------------------
  // Generic field editors. Each edits obj[key] in place and calls changed().
  // `changed` updates the preview and saves; `rerender` rebuilds the form
  // (only needed when the shape changes, e.g. a list item was added).
  // ---------------------------------------------------------------------

  function changed() {
    save();
    updateFullPath();
    renderList();
    renderPreview();
  }

  function rerender() {
    save();
    renderList();
    renderEditor();
  }

  // Help text where `backticks` mark code, e.g. "use `minecraft:cod`" -> text + <code>.
  function withCode(text) {
    return String(text).split("`").map(function (part, i) {
      return i % 2 ? el("code", { text: part }) : part;
    });
  }

  // Keep a (?) bubble inside the window (and inside the sidebar, which clips because it
  // scrolls on its own): slide it left if it would poke out on the right.
  function fitTip(tip) {
    var text = tip.querySelector(".tip-text");
    text.style.left = "";
    var r = text.getBoundingClientRect();
    var right = window.innerWidth - 12;
    var side = tip.closest(".sidebar");
    if (side && getComputedStyle(side).overflowY !== "visible") right = Math.min(right, side.getBoundingClientRect().right - 8);
    var over = r.right - right;
    if (over > 0) text.style.left = (parseFloat(getComputedStyle(text).left) - over) + "px";
  }

  // f.tip: show the help text in a (?) bubble on hover/focus instead of under the field.
  function makeTip(hint) {
    return el("span", { class: "tip", tabindex: "0", "aria-label": "Help",
      onmouseenter: function () { fitTip(this); }, onfocus: function () { fitTip(this); },
      onclick: function (e) { e.preventDefault(); } }, [ // inside a checkbox label, don't toggle it
      "?", el("span", { class: "tip-text", role: "tooltip" }, withCode(hint))
    ]);
  }

  // A red (error) or yellow (warning) "!" bubble showing `msg` on hover/focus.
  function alertBubble(msg, isError) {
    return el("span", { class: "tip alert " + (isError ? "error" : "warn"), tabindex: "0", "aria-label": isError ? "Error" : "Warning",
      onmouseenter: function () { fitTip(this); }, onfocus: function () { fitTip(this); } }, [
      "!", el("span", { class: "tip-text", role: "tooltip" }, [msg])
    ]);
  }

  function labelled(f, control, extraClass) {
    var tip = f.hint && f.tip ? makeTip(f.hint) : null;
    // A plain div, not a <label>: clicking the title or (?) should not focus the box.
    if (control && !control.hasAttribute("aria-label")) control.setAttribute("aria-label", f.label);
    if (control && f.k) control.setAttribute("data-key", f.k); // lets card checks find this box
    // Number boxes get their own red "!" next to the label while empty or invalid.
    var numAlert = null;
    if (control && control.type === "number") {
      numAlert = el("span", { class: "alert-slot" });
      var msg = control.step === "1" ? "Enter a whole number." : "Enter a number.";
      var refresh = function () {
        numAlert.textContent = "";
        if (control.classList.contains("invalid")) numAlert.appendChild(alertBubble(msg, true));
      };
      control.addEventListener("input", refresh); // runs after numberInput's own check
      refresh();
    }
    return el("div", { class: "field" + (extraClass ? " " + extraClass : "") }, [
      el("span", null, [f.label, tip].concat([].concat(f.alert || []).map(alertSlot), [numAlert])),
      control,
      f.hint && !f.tip ? el("span", { class: "hint", id: f.hintId || null, text: f.hint }) : null
    ]);
  }

  function numberInput(obj, key, isFloat, onSet) {
    var input = el("input", { type: "number", step: isFloat ? "any" : "1", value: obj[key] === null || obj[key] === undefined ? "" : obj[key] });
    function check() {
      var raw = input.value.trim();
      var n = Number(raw);
      var ok = raw !== "" && isFinite(n) && (isFloat || Math.floor(n) === n);
      input.classList.toggle("invalid", !ok);
      obj[key] = ok ? n : null;
    }
    if (obj[key] === null || obj[key] === undefined) input.classList.add("invalid");
    input.addEventListener("input", function () { check(); if (onSet) onSet(obj[key]); changed(); });
    return input;
  }

  function textInput(obj, key, f) {
    var input = el("input", { type: "text", spellcheck: "false", autocomplete: "off", value: obj[key] || "",
      list: f.suggest ? datalistFor(f.suggest) : null, placeholder: f.placeholder || null });
    function check() {
      var v = input.value.trim();
      var bad = false;
      if (f.type === "id") bad = (v !== "" || !f.opt) && !(f.tags ? TAG_OR_ID_RE : ID_RE).test(v);
      input.classList.toggle("invalid", bad);
      if (f.opt && v === "") delete obj[key];
      else obj[key] = v;
    }
    check();
    input.addEventListener("input", function () { check(); if (f.onSet) f.onSet(obj[key]); changed(); });
    return input;
  }

  function selectInput(obj, key, options, f) {
    var sel = el("select");
    var opts = options.map(function (o) { return Array.isArray(o) ? o : [o, o]; });
    var current = obj[key];
    if (current !== undefined && !opts.some(function (o) { return o[0] === current; })) opts.push([current, current]);
    opts.forEach(function (o) { sel.appendChild(el("option", { value: o[0], text: o[1] })); });
    var optional = f && f.opt;
    if (current === undefined && !optional) obj[key] = opts[0][0];
    sel.value = obj[key] === undefined ? "" : obj[key];
    sel.addEventListener("change", function () {
      if (optional && sel.value === "") delete obj[key];
      else obj[key] = sel.value;
      if (f && f.onChange) f.onChange(sel.value);
      changed();
    });
    return sel;
  }

  // A dropdown of known ids plus "Custom…", which shows a box to type any id.
  // A value that isn't in the list (e.g. imported from another mod) opens in custom mode.
  function selectOrCustom(obj, key, options, f) {
    if (obj[key] === undefined) obj[key] = options[0];
    var isCustom = options.indexOf(obj[key]) === -1;
    var sel = el("select", { "aria-label": f.label });
    options.forEach(function (o) { sel.appendChild(el("option", { value: o, text: o })); });
    sel.appendChild(el("option", { value: "__custom", text: "Custom…" }));
    sel.value = isCustom ? "__custom" : obj[key];
    var holder = { v: isCustom ? obj[key] : "" };
    var input = textInput(holder, "v", { type: "id", placeholder: f.customPlaceholder || "mymod:my_id",
      onSet: function (v) { obj[key] = v; } });
    input.setAttribute("aria-label", "Custom " + f.label.toLowerCase() + " id");
    input.hidden = !isCustom;
    sel.addEventListener("change", function () {
      var custom = sel.value === "__custom";
      input.hidden = !custom;
      obj[key] = custom ? holder.v : sel.value;
      if (custom) input.focus();
      changed();
    });
    return el("div", { class: "row" }, [sel, input]);
  }

  function boolInput(obj, key, f) {
    var box = el("input", { type: "checkbox" });
    box.checked = !!obj[key];
    box.addEventListener("change", function () {
      if (f.opt && !box.checked) delete obj[key];
      else obj[key] = box.checked;
      changed();
    });
    return el("label", { class: "check" }, [box, el("span", { text: f.label }), f.tip && f.hint ? makeTip(f.hint) : null]);
  }

  function colorInput(obj, key) {
    if (typeof obj[key] !== "number") obj[key] = -15732736;
    var input = el("input", { type: "color", value: intToHex(obj[key]) });
    input.addEventListener("input", function () { obj[key] = hexToInt(input.value); changed(); });
    return input;
  }

  function removeButton(onRemove, what) {
    var b = el("button", { type: "button", class: "ghost danger icon", "aria-label": "Remove " + what, title: "Remove", onclick: onRemove });
    b.innerHTML = ICONS.trash;
    return b;
  }

  // A list that starts empty and has an "add" control, as the mod author asked
  // for every list. `renderItem(item, index, removeFn)` returns the row node.
  function listEditor(f, arr, renderItem, addControl) {
    var wrap = el("div", { class: "list-editor" });
    var tipText = f.tipText || (f.tip && f.hint);
    wrap.appendChild(el("span", { class: "field-label" }, [f.label, tipText ? makeTip(tipText) : null, f.alert ? alertSlot(f.alert) : null]));
    var items = el("div", { class: "items" });
    arr.forEach(function (item, i) {
      items.appendChild(renderItem(item, i, function () { arr.splice(i, 1); rerender(); }));
    });
    if (arr.length) wrap.appendChild(items);
    wrap.appendChild(addControl);
    if (f.hint && !f.tip) wrap.appendChild(el("span", { class: "hint", text: f.hint }));
    return wrap;
  }

  function idListEditor(obj, f) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    var arr = obj[f.k];
    return listEditor(f, arr, function (item, i, remove) {
      var holder = { v: item };
      var input = textInput(holder, "v", { type: "id", tags: f.tags, suggest: f.suggest, onSet: function (v) { arr[i] = v; } });
      return el("div", { class: "row" }, [input, removeButton(remove, "entry")]);
    }, el("div", { class: "add-row" }, [
      el("button", { type: "button", class: "ghost small", text: "+ " + (f.addLabel || "Add"), onclick: function () { arr.push(""); rerender(); } })
    ]));
  }

  function enumListEditor(obj, f) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    var arr = obj[f.k];
    return listEditor(f, arr, function (item, i, remove) {
      var holder = { v: item };
      var sel = selectInput(holder, "v", f.options, { onChange: function (v) { arr[i] = v; } });
      return el("div", { class: "row" }, [sel, removeButton(remove, "entry")]);
    }, el("div", { class: "add-row" }, [
      el("button", { type: "button", class: "ghost small", text: "+ " + (f.addLabel || "Add"), onclick: function () { arr.push(optValue(f.options[0])); rerender(); } })
    ]));
  }

  // Objects like {"starcatcher:lush_bait": 100}. Shown as rows; any edit
  // rebuilds the object from the rows so renaming a key works.
  function mapEditor(obj, f) {
    if (!obj[f.k] || typeof obj[f.k] !== "object" || Array.isArray(obj[f.k])) obj[f.k] = {};
    var rows = Object.keys(obj[f.k]).map(function (k) { return { key: k, value: obj[f.k][k] }; });
    function sync() {
      var out = {};
      rows.forEach(function (r) { if (r.key !== "") out[r.key] = r.value; });
      obj[f.k] = out;
    }
    return listEditor(f, rows, function (row, i, remove) {
      var keyCtl = f.options
        ? selectInput(row, "key", f.options, { onChange: sync })
        : textInput(row, "key", { type: "id", suggest: f.suggest, onSet: sync });
      var valCtl = numberInput(row, "value", false, sync);
      return el("div", { class: "row" }, [keyCtl, valCtl, removeButton(function () { rows.splice(i, 1); sync(); rerender(); }, "entry")]);
    }, el("div", { class: "add-row" }, [
      el("button", { type: "button", class: "ghost small", text: "+ " + (f.addLabel || "Add"), onclick: function () {
        var key = f.options ? f.options.map(optValue).filter(function (o) { return !(o in obj[f.k]); })[0] : "";
        if (key === undefined) return;
        if (!f.options && "" in obj[f.k]) return;
        obj[f.k][key] = f.def0 !== undefined ? f.def0 : 0;
        rerender();
      } })
    ]));
  }

  function objListEditor(obj, f) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    var arr = obj[f.k];
    return listEditor(f, arr, function (item, i, remove) {
      var card = el("div", { class: "card" }, [
        el("div", { class: "card-head" }, [el("span", { class: "title", text: "#" + (i + 1) }), removeButton(remove, "entry")])
      ]);
      card.appendChild(fieldsGrid(item, f.fields));
      return card;
    }, el("div", { class: "add-row" }, [
      el("button", { type: "button", class: "ghost small", text: "+ " + (f.addLabel || "Add"), onclick: function () { arr.push(defaults(f.fields)); rerender(); } })
    ]));
  }

  // Custom entries whose raw JSON box currently holds invalid JSON (blocks generating).
  var badRaw = new WeakMap();

  // Editor for a type the generator has no form for: type id + the rest of the object as raw JSON.
  function customEditor(item, what) {
    var typeInput = textInput(item, "type", { type: "id", placeholder: "mymod:my_" + what });
    var rest = {};
    Object.keys(item).forEach(function (k) { if (k !== "type") rest[k] = item[k]; });
    var box = el("textarea", { class: "raw-json", spellcheck: "false", rows: "6", placeholder: '{\n  "some_field": 1\n}' });
    box.value = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : "";
    box.addEventListener("input", function () {
      var v;
      try { v = JSON.parse(box.value.trim() || "{}"); } catch (e) { v = null; }
      var ok = !!v && typeof v === "object" && !Array.isArray(v);
      box.classList.toggle("invalid", !ok);
      if (ok) {
        Object.keys(item).forEach(function (k) { if (k !== "type") delete item[k]; });
        Object.keys(v).forEach(function (k) { if (k !== "type") item[k] = v[k]; });
        badRaw.delete(item);
      } else badRaw.set(item, true);
      changed();
    });
    return el("div", null, [
      labelled({ label: "Type", tip: true, hint: "The " + what + "'s registered id, e.g. `mymod:my_" + what + "`." }, typeInput),
      labelled({ label: "Fields (JSON)", tip: true, hint: "Every other field of the " + what + " as a JSON object, written exactly as its codec expects.\n\n" +
        "Leave it empty if the " + what + " has no fields." }, box)
    ]);
  }

  // Lists whose items carry a "type" (restrictions, minigame modifiers).
  // allowCustom adds a "Custom" choice and makes unknown types editable as raw JSON.
  function typedListEditor(f, arr, schemaList, byTypeMap, what, allowCustom) {
    var picker = el("select", { "aria-label": "Type of " + what + " to add" });
    picker.appendChild(el("option", { value: "", text: "Choose a " + what + "…" }));
    schemaList.forEach(function (t) { picker.appendChild(el("option", { value: "starcatcher:" + t.id, text: t.label })); });
    if (allowCustom) picker.appendChild(el("option", { value: "custom", text: "Custom (raw JSON)" }));
    var addBtn = el("button", { type: "button", class: "ghost small", text: "+ Add", onclick: function () {
      if (!picker.value) { picker.focus(); return; }
      if (picker.value === "custom") { arr.push({ type: "" }); rerender(); return; }
      var schema = byTypeMap[picker.value];
      var item = { type: picker.value };
      Object.assign(item, defaults(schema.fields));
      arr.push(item);
      rerender();
    } });

    return listEditor(f, arr, function (item, i, remove) {
      var schema = byTypeMap[item.type];
      // The type id sits next to the name (not for custom: it has its own Type box).
      var title = el("span", { class: "title" }, schema || !allowCustom
        ? [schema ? schema.label : "Unknown type", " ", el("small", { class: "type-id", text: item.type || "" })]
        : ["Custom"]);
      var card = el("div", { class: "card" }, [el("div", { class: "card-head divided" }, [title, removeButton(remove, what)])]);
      var refresh = null;
      if (schema && schema.check) {
        // Red "!" by the title while the values don't fit together (e.g. min above max).
        var slot = el("span", { class: "alert-slot" });
        title.appendChild(slot);
        refresh = function () {
          var problem = schema.check(item);
          slot.textContent = "";
          if (problem) slot.appendChild(alertBubble(problem, true));
          (schema.checkFields || []).forEach(function (k) {
            var box = card.querySelector('[data-key="' + k + '"]');
            if (box) box.classList.toggle("check-invalid", !!problem);
          });
        };
        card.addEventListener("input", refresh);
      }
      if (schema) {
        if (schema.fields.length) card.appendChild(fieldsGrid(item, schema.fields));
        card.appendChild(fieldsGrid(item, [TRANSLATION]));
      } else if (allowCustom) {
        card.appendChild(customEditor(item, what));
      } else {
        card.appendChild(el("p", { class: "hint", text: "This generator does not know this type, so it is kept exactly as imported." }));
      }
      if (refresh) refresh(); // after the boxes exist, so checkFields can turn them red
      return card;
    }, el("div", { class: "add-row" }, [picker, addBtn]));
  }

  // Height range as Above / Below / Between. Above and Below fill the other end with the
  // Java int limit, exactly like the mod's built-in ranges (e.g. 50 to Integer.MAX_VALUE).
  var INT_MAX = 2147483647, INT_MIN = -2147483648;
  function yRangeEditor(obj, f) {
    var mode = obj.max_y === INT_MAX ? "above" : obj.min_y === INT_MIN ? "below" : "between";
    var modeSel = selectInput({ v: mode }, "v", [["above", "Above"], ["below", "Below"], ["between", "Between"]], { onChange: function (v) {
      if (v === "above") {
        if (obj.min_y === INT_MIN || obj.min_y === null) obj.min_y = f.min;
        obj.max_y = INT_MAX;
      } else if (v === "below") {
        if (obj.max_y === INT_MAX || obj.max_y === null) obj.max_y = f.min;
        obj.min_y = INT_MIN;
      } else {
        if (obj.min_y === INT_MIN) obj.min_y = Math.min(f.min, obj.max_y === null ? f.min : obj.max_y - 1);
        if (obj.max_y === INT_MAX) obj.max_y = Math.max(f.max, obj.min_y === null ? f.max : obj.min_y + 1);
      }
      rerender(); // swap which Y boxes show
    } });
    var fields = [labelled({ label: "Range", tip: true, hint: "Above: the fish bites from this Y upward.\n\n" +
      "Below: the fish bites from this Y downward.\n\nBetween: the fish bites from Min Y to Max Y." }, modeSel)];
    if (mode !== "below") fields.push(labelled({ k: "min_y", label: mode === "above" ? "Y" : "Min Y" }, numberInput(obj, "min_y", false)));
    if (mode !== "above") fields.push(labelled({ k: "max_y", label: mode === "below" ? "Y" : "Max Y" }, numberInput(obj, "max_y", false)));
    return el("div", { class: "grid" }, fields);
  }

  function sweetspotEditor(obj, f) {
    if (!obj[f.k] || typeof obj[f.k] !== "object") obj[f.k] = clone(DEFAULT_SWEETSPOT);
    var card = el("div", { class: "card" }, [el("div", { class: "card-head" }, [el("span", { class: "title", text: f.label })])]);
    card.appendChild(fieldsGrid(obj[f.k], SWEETSPOT_FIELDS));
    return el("div", { class: "list-editor" }, [card]);
  }

  function sweetspotListEditor(obj, f) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    var arr = obj[f.k];
    return listEditor(f, arr, function (item, i, remove) {
      // Editable name, kept as `_name`: saved in the browser and in copied difficulties,
      // but stripped from the exported JSON (see exportData).
      var name = el("input", { type: "text", class: "name-input", value: item._name || "", placeholder: "Sweetspot " + (i + 1),
        "aria-label": "Sweetspot name", spellcheck: "false", autocomplete: "off" });
      name.addEventListener("input", function () {
        if (name.value.trim()) item._name = name.value;
        else delete item._name;
        save();
      });
      var card = el("div", { class: "card" }, [
        el("div", { class: "card-head divided" }, [name, removeButton(remove, "sweetspot")])
      ]);
      card.appendChild(fieldsGrid(item, SWEETSPOT_FIELDS));
      return card;
    }, el("div", { class: "add-row" }, [
      el("button", { type: "button", class: "ghost small", text: "+ Add sweetspot", onclick: function () { arr.push(clone(DEFAULT_SWEETSPOT)); rerender(); } })
    ]));
  }

  function modifierListEditor(obj, f) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    return typedListEditor(f, obj[f.k], MODIFIERS, MODIFIER_BY_TYPE, "modifier");
  }

  // The JSON that goes into the zip: same as the edited object, minus empty
  // optional lists (add_modifiers_on_hit is optional in the mod's codec).
  function exportData(data) {
    var out = clone(data);
    (function strip(v) {
      if (Array.isArray(v)) v.forEach(strip);
      else if (v && typeof v === "object") Object.keys(v).forEach(function (k) {
        if (k === "_name") delete v[k]; // sweetspot names are only for the editor
        else if (k === "add_modifiers_on_hit" && Array.isArray(v[k]) && !v[k].length) delete v[k];
        else strip(v[k]);
      });
    })(out);
    return out;
  }

  function defaults(fields) {
    var o = {};
    fields.forEach(function (f) {
      if (f.opt) return;
      switch (f.type) {
        case "idlist": case "enumlist": case "objlist": case "sweetspots": case "modifiers": o[f.k] = []; break;
        case "map": o[f.k] = {}; break;
        case "bool": o[f.k] = f.def === undefined ? false : f.def; break;
        case "sweetspot": o[f.k] = clone(DEFAULT_SWEETSPOT); break;
        case "yrange": o.min_y = f.min; o.max_y = f.max; break;
        case "select": o[f.k] = f.def !== undefined ? f.def : optValue(f.options[0]); break;
        default: o[f.k] = f.def !== undefined ? f.def : (f.type === "int" || f.type === "float" ? 0 : "");
      }
    });
    return o;
  }

  function fieldControl(obj, f) {
    switch (f.type) {
      case "int": return labelled(f, numberInput(obj, f.k, false), f.size && "f-" + f.size);
      case "float": return labelled(f, numberInput(obj, f.k, true), f.size && "f-" + f.size);
      case "text": case "id": return labelled(f, textInput(obj, f.k, f), f.size && "f-" + f.size);
      case "select": return labelled(f, selectInput(obj, f.k, f.options, f), f.size && "f-" + f.size);
      case "selectCustom": return labelled(f, selectOrCustom(obj, f.k, f.options, f), f.size && "f-" + f.size);
      case "bool": return boolInput(obj, f.k, f);
      case "color": return labelled(f, colorInput(obj, f.k), f.size && "f-" + f.size);
      default: return null;
    }
  }

  // Simple fields go in a responsive grid; list/object editors take the full width.
  function fieldsGrid(obj, fields) {
    var frag = el("div");
    var grid = null;
    fields.forEach(function (f) {
      var simple = ["int", "float", "text", "id", "select", "selectCustom", "bool", "color"].indexOf(f.type) !== -1;
      if (simple) {
        if (!grid) { grid = el("div", { class: fields.some(function (x) { return x.size; }) ? "grid sized" : "grid" }); frag.appendChild(grid); }
        grid.appendChild(fieldControl(obj, f));
        return;
      }
      grid = null;
      if (f.type === "idlist") frag.appendChild(idListEditor(obj, f));
      else if (f.type === "enumlist") frag.appendChild(enumListEditor(obj, f));
      else if (f.type === "map") frag.appendChild(mapEditor(obj, f));
      else if (f.type === "objlist") frag.appendChild(objListEditor(obj, f));
      else if (f.type === "sweetspot") frag.appendChild(sweetspotEditor(obj, f));
      else if (f.type === "sweetspots") frag.appendChild(sweetspotListEditor(obj, f));
      else if (f.type === "modifiers") frag.appendChild(modifierListEditor(obj, f));
      else if (f.type === "yrange") frag.appendChild(yRangeEditor(obj, f));
    });
    return frag;
  }

  // ---------------------------------------------------------------------
  // Fish editor
  // ---------------------------------------------------------------------

  var editorEl = document.getElementById("editor");
  var previewEl = null;
  // Which editor sections are open; remembered across reloads in this browser.
  var SECTIONS_KEY = "starcatcher-datapack-generator-sections";
  var openSections = { info: true, size: true, restrictions: true, difficulty: true, textures: false, json: true };
  try { Object.assign(openSections, JSON.parse(localStorage.getItem(SECTIONS_KEY)) || {}); } catch (e) { /* storage unavailable */ }

  function section(id, title, children, tip) {
    var d = el("details", { class: "section" }, [el("summary", null, [title, tip ? makeTip(tip) : null]), el("div", { class: "body" }, children)]);
    d.open = !!openSections[id];
    d.addEventListener("toggle", function () {
      openSections[id] = d.open;
      try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(openSections)); } catch (e) { /* storage unavailable */ }
    });
    return d;
  }

  // Optional extras (bucket, entity, minigame item): a row of "+" buttons; adding
  // one shows its id field with a × to remove it again. Removing deletes the value
  // (and any alsoRemove keys) from the JSON. fish.open remembers added-but-empty ones.
  var EXTRAS = [
    { key: "entity", label: "Entity", hint: "Entity which will be fished when using an Almighty Worm.", placeholder: "minecraft:cod",
      alsoRemove: ["always_spawn_entity"],
      extras: function (ci) { return [boolInput(ci, "always_spawn_entity", { label: "Always spawn the entity instead of the item", opt: true })]; } },
    { key: "fish_bucket", label: "Bucketed Item", hint: "Item you get when catching this fish with a bucket.", placeholder: "minecraft:cod_bucket" },
    { key: "override_minigame_item", label: "Minigame Item Override", hint: "Item shown in the minigame instead of the caught item.", placeholder: "starcatcher:unknown_fish" }
  ];

  function extrasEditor(fish, ci) {
    fish.open = fish.open || {};
    var wrap = el("div", { class: "extras" });

    function isAdded(x) { return x.key in ci || !!fish.open[x.key]; }

    function draw(focusKey) {
      wrap.textContent = "";
      EXTRAS.filter(isAdded).forEach(function (x) {
        // fish_bucket / override_minigame_item are {"identifier": "..."} objects; entity is a plain id.
        var wrapped = x.key !== "entity";
        var holder = { v: wrapped ? (ci[x.key] && ci[x.key].identifier) || "" : ci[x.key] || "" };
        // Not optional once added, so an empty box shows red like any missing id.
        var input = textInput(holder, "v", { type: "id", placeholder: x.placeholder, onSet: function (v) {
          if (!v) delete ci[x.key];
          else if (wrapped) { ci[x.key] = ci[x.key] && typeof ci[x.key] === "object" ? ci[x.key] : {}; ci[x.key].identifier = v; }
          else ci[x.key] = v;
        } });
        input.setAttribute("aria-label", x.label);
        var remove = removeButton(function () {
          delete ci[x.key];
          (x.alsoRemove || []).forEach(function (k) { delete ci[k]; });
          fish.open[x.key] = false;
          draw();
          changed();
        }, x.label.toLowerCase());
        wrap.appendChild(el("div", { class: "extra" }, [
          el("span", { class: "field-label" }, [x.label, makeTip(x.hint)]),
          el("div", { class: "input-wrap" }, [input, remove])
        ].concat(x.extras ? x.extras(ci) : [])));
        if (focusKey === x.key) setTimeout(function () { input.focus(); }, 0);
      });

      var missing = EXTRAS.filter(function (x) { return !isAdded(x); });
      if (missing.length) {
        wrap.appendChild(el("div", { class: "add-row" }, missing.map(function (x) {
          return el("button", { type: "button", class: "ghost small", text: "+ " + x.label, onclick: function () {
            fish.open[x.key] = true;
            draw(x.key);
            save();
          } });
        })));
      }
    }
    draw();
    return wrap;
  }

  // Six coloured dots, one per rarity; click one to pick it. Colours follow the
  // mod's rarity text colours (legendary is a rainbow in game).
  function rarityPicker(d) {
    var name = el("span", { class: "rarity-name" });
    var dots = el("div", { class: "rarity-dots", role: "radiogroup", "aria-label": "Rarity" });
    function refresh() {
      Array.prototype.forEach.call(dots.children, function (b) {
        var on = b.dataset.rarity === d.rarity;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on || (RARITIES.indexOf(d.rarity) === -1 && b.dataset.rarity === RARITIES[0]) ? 0 : -1;
      });
      name.textContent = d.rarity ? d.rarity.charAt(0).toUpperCase() + d.rarity.slice(1) : "";
      name.className = "rarity-name r-" + d.rarity;
    }
    function pick(r) { d.rarity = r; refresh(); changed(); }
    RARITIES.forEach(function (r, i) {
      dots.appendChild(el("button", { type: "button", role: "radio", class: "rarity-dot r-" + r, "data-rarity": r,
        title: r.charAt(0).toUpperCase() + r.slice(1), "aria-label": r,
        onclick: function () { pick(r); },
        onkeydown: function (e) {
          // Arrow keys move between dots, like a normal radio group.
          var step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          var next = RARITIES[(i + step + RARITIES.length) % RARITIES.length];
          pick(next);
          dots.querySelector('[data-rarity="' + next + '"]').focus();
        } }));
    });
    refresh();
    return el("div", { class: "rarity-pick" }, [
      el("span", { class: "field-label" }, ["Rarity", makeTip("Rarity does not change the chance of catching this fish on its own.\n\n" +
        "Some modifiers can use rarity to make this fish more or less likely to be caught.")]),
      dots,
      name
    ]);
  }

  // Shows where the fish's JSON will go, e.g. data/my_pack/starcatcher/fish/salmon.json
  function updateFullPath() {
    var out = document.getElementById("full-path");
    var fish = state.fish[state.selected];
    if (out && fish) out.textContent = "data/" + fishNs(fish) + "/starcatcher/fish/" + fish.path + ".json";
  }

  function renderEditor() {
    editorEl.textContent = "";
    previewEl = null;
    var fish = state.fish[state.selected];
    if (!fish) {
      editorEl.appendChild(el("div", { class: "editor-empty" }, [
        el("p", { text: state.fish.length ? "Pick a fish on the left to edit it." : "Your pack has no fish yet." }),
        el("button", { type: "button", text: "+ Add your first fish", onclick: addFish })
      ]));
      return;
    }
    var d = fish.data;
    d.catch_info = d.catch_info || {};
    d.catch_info.item = d.catch_info.item || { identifier: "" };
    d.size_and_weight = d.size_and_weight || {};
    d.difficulty = d.difficulty || {};
    d.textures = d.textures || clone(DEFAULT_TEXTURES);
    if (!Array.isArray(d.restrictions)) d.restrictions = [];

    var ci = d.catch_info;

    // Header: file name + remove
    var pathInput = el("input", { type: "text", spellcheck: "false", autocomplete: "off", value: fish.path, "aria-label": "File name" });
    pathInput.addEventListener("input", function () {
      var v = pathInput.value.trim();
      pathInput.classList.toggle("invalid", !PATH_RE.test(v));
      fish.path = v;
      fish.pathAuto = v === ""; // typing a name stops it following the item; clearing it resumes
      changed();
    });

    function syncPathToItem(item) {
      if (!followsItem(fish)) return;
      var p = pathFromItem(item);
      if (!p) return;
      fish.path = uniquePath(p, fish);
      fish.pathAuto = true;
      pathInput.value = fish.path;
      pathInput.classList.remove("invalid");
    }

    // File name sits at the top, with the full path it will be saved to. Its label also
    // carries the "general" alert (problems that don't belong to one field).
    editorEl.appendChild(el("div", { class: "file-row" }, [
      labelled({ label: "File name", tip: true, alert: ["path", "general"], hint: "The file name on which the json will save to.\n\n" +
        "If another datapack contains the same file name, under the same Datapack Namespace, it will be overridden.\n\n" +
        "Making your datapack's namespace `starcatcher`, and your fish `aurora` will override starcatcher's built-in json." }, pathInput),
      el("code", { class: "full-path", id: "full-path" })
    ]));

    var itemHolder = ci.item;
    var infoLeft = [
      el("div", { class: "grid" }, [
        labelled({ label: "Item id", tip: true, alert: "item", hint: "The base item to be caught.\n\n• starcatcher:aurora\n• minecraft:cod\n• mymod:fish" },
          textInput(itemHolder, "identifier", { type: "id", onSet: syncPathToItem })),
        labelled({ label: "Base chance", tip: true, hint: "Base chance is this fish's weight: how likely it is to be caught compared to other fish.\n\n" +
          "Every fish whose restrictions allow it adds its base chance to a pool. A random number from 0 up to the pool's total then picks which fish is caught, so a fish with 10 is twice as likely as one with 5.\n\n" +
          "Modifiers can change these weights." }, numberInput(d, "base_chance", false)),
      ]),
      // Entry type with the two checkboxes on the same line beside it.
      el("div", { class: "type-row" }, [
        labelled({ label: "Entry type", tip: true, hint:
          "• Fish: the normal entry type.\n" +
          "• Trophy: shows up on the trophies page in the guide.\n" +
          "• Message: shows up on the messages page in the guide.\n" +
          "• Extra: does not show up anywhere.\n\n" +
          "Only Fish entries count as “fish” for logic that checks caught entries." }, selectInput(ci, "type", ENTRY_TYPES, { onChange: function (v) { if (v === "fish") delete ci.type; } })),
        el("div", { class: "grid-checks" }, [
          boolInput(d, "has_guide_entry", { label: "Show in Guide" }),
          boolInput(d, "skips_minigame", { label: "Skip Minigame" })
        ])
      ]),
      extrasEditor(fish, ci)
    ];
    // Rarity picker on the right, the rest of Fish Info on the left (stacks on narrow screens).
    var basics = [el("div", { class: "info-layout" }, [
      el("div", { class: "info-main" }, infoLeft),
      rarityPicker(d)
    ])];
    if (ci.type === "fish") delete ci.type; // "fish" is the default; keep the JSON clean

    var size = [fieldsGrid(d.size_and_weight, [
      { k: "average_size_cm", label: "Average size (cm)", type: "float" },
      { k: "deviation_size_cm", label: "Size deviation (cm)", type: "float" },
      { k: "average_weight_grams", label: "Average weight (g)", type: "float" },
      { k: "deviation_weight_grams", label: "Weight deviation (g)", type: "float" }
      // golden_chance is required by the mod but not shown: new fish keep 0.02, imported ones keep theirs.
    ])];

    var restrictions = [
      typedListEditor({ label: "Restrictions", tipText: "Restrictions control and modify the chance of catching this entry.\n\n" +
        "They can adjust the base chance, or stop the entry from being caught at all.\n\n" +
        "With no restrictions, it can be caught anywhere." }, d.restrictions, RESTRICTIONS, RESTRICTION_BY_TYPE, "restriction", true)
    ];

    // Difficulty: presets + the raw values.
    var presetSel = el("select", { "aria-label": "Difficulty preset" });
    presetSel.appendChild(el("option", { value: "", text: "Load a preset…" }));
    PRESETS.forEach(function (p, i) { presetSel.appendChild(el("option", { value: String(i), text: p.label })); });
    var presetBtn = el("button", { type: "button", class: "ghost small", text: "Apply preset", onclick: function () {
      if (presetSel.value === "") { presetSel.focus(); return; }
      var hasContent = (d.difficulty.sweetspots || []).length || (d.difficulty.modifiers || []).length;
      if (hasContent && !confirm("Replace this fish's difficulty, sweetspots and modifiers with the preset?")) return;
      d.difficulty = clone(PRESETS[Number(presetSel.value)].difficulty);
      rerender();
    } });

    // Copy / paste the whole difficulty block through the clipboard, to reuse it on another fish.
    function flash(btn, text) {
      var old = btn.textContent;
      btn.style.width = btn.offsetWidth + "px"; // keep the button's size while the text is shorter
      btn.textContent = text;
      setTimeout(function () { btn.textContent = old; btn.style.width = ""; }, 1200);
    }
    var copyDiffBtn = el("button", { type: "button", class: "ghost small clip-btn", text: "Copy", title: "Copy difficulty", onclick: function () {
      var text = JSON.stringify(d.difficulty, null, 2);
      if (!navigator.clipboard) { window.prompt("Copy this difficulty:", text); return; }
      navigator.clipboard.writeText(text).then(function () { flash(copyDiffBtn, "Copied"); },
        function () { window.prompt("Copy this difficulty:", text); });
    } });
    var pasteDiffBtn = el("button", { type: "button", class: "ghost small clip-btn", text: "Paste", title: "Paste difficulty", onclick: function () {
      function apply(text) {
        if (text === null || text === undefined) return;
        var v;
        try { v = JSON.parse(text); } catch (e) { v = null; }
        // Accept a copied difficulty block or a whole fish JSON that contains one.
        if (v && typeof v === "object" && v.difficulty && typeof v.difficulty === "object") v = v.difficulty;
        var keys = ["hp", "speed", "missPenalty", "decay", "sweetspots", "modifiers"];
        if (!v || typeof v !== "object" || Array.isArray(v) || !keys.some(function (k) { return k in v; })) {
          alert("The clipboard does not hold a copied difficulty.");
          return;
        }
        var hasContent = (d.difficulty.sweetspots || []).length || (d.difficulty.modifiers || []).length;
        if (hasContent && !confirm("Replace this fish's difficulty, sweetspots and modifiers with the pasted one?")) return;
        d.difficulty = v;
        rerender();
      }
      if (!navigator.clipboard || !navigator.clipboard.readText) { apply(window.prompt("Paste a copied difficulty:")); return; }
      navigator.clipboard.readText().then(apply, function () { apply(window.prompt("Paste a copied difficulty:")); });
    } });

    var difficulty = [
      el("div", { class: "preset-row" }, [presetSel, presetBtn, copyDiffBtn, pasteDiffBtn]),
      fieldsGrid(d.difficulty, [
        { k: "hp", label: "HP", type: "int", tip: true, hint: "The amount of score needed to complete the minigame." },
        { k: "speed", label: "Speed", type: "int", tip: true, hint: "How fast the pointer moves." },
        { k: "missPenalty", label: "Miss penalty", type: "int", tip: true, hint: "The amount of score lost when missing." },
        { k: "decay", label: "Decay", type: "float", tip: true, hint: "The amount of score lost per tick." },
        { k: "sweetspots", label: "Sweetspots", type: "sweetspots", alert: "sweetspots", tip: true,
          hint: "The targets on the minigame wheel. Hitting one adds to the score; the fish is caught once the score reaches its HP." },
        { k: "modifiers", label: "Minigame Modifiers", type: "modifiers" }
      ])
    ];

    var textures = [
      fieldsGrid(d.textures, [
        { k: "tank", label: "Background", type: "text", suggest: "tank", size: "full" },
        { k: "rod", label: "Rod", type: "text", size: "full" },
        { k: "handle", label: "Handle", type: "text", size: "full" },
        { k: "buttons", label: "Buttons", type: "text", size: "full" },
        { k: "treasure", label: "Treasure", type: "text", size: "full" },
        { k: "wheels", label: "Wheels", type: "text", size: "full" }
      ])
    ];

    previewEl = el("pre", { class: "json" });
    var copyBtn = el("button", { type: "button", class: "ghost small", text: "Copy JSON", onclick: function () {
      var text = previewEl.textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { flash(copyBtn, "Copied"); });
    } });

    editorEl.appendChild(section("info", "Fish Info", basics));
    editorEl.appendChild(section("size", "Size and weight", size));
    editorEl.appendChild(section("restrictions", "Restrictions", restrictions));
    editorEl.appendChild(section("difficulty", "Minigame difficulty", difficulty));
    editorEl.appendChild(section("textures", "Minigame textures", textures, "Minigame art. Change these only if you ship a resource pack with your own textures."));
    editorEl.appendChild(section("json", "JSON preview", [el("div", { class: "row", style: "margin-bottom:8px" }, [copyBtn]), previewEl]));

    updateFullPath();

    renderPreview();
  }

  function renderPreview() {
    var fish = state.fish[state.selected];
    if (!fish || !previewEl) return;
    previewEl.textContent = JSON.stringify(exportData(fish.data), null, 2);
    // Fill each field's "!" slot with its problems (red for errors, yellow for warnings).
    var byField = {};
    fishIssues(fish, state.selected).forEach(function (p) { (byField[p.field] = byField[p.field] || []).push(p); });
    Array.prototype.forEach.call(editorEl.querySelectorAll("[data-alert]"), function (slot) {
      var list = byField[slot.dataset.alert];
      slot.textContent = "";
      if (!list) return;
      var isError = list.some(function (p) { return !p.warn; });
      slot.appendChild(alertBubble(list.map(function (p) { return p.msg; }).join("\n\n"), isError));
    });
  }

  // Empty spot next to a field label where renderPreview puts that field's "!" bubble.
  function alertSlot(field) {
    return el("span", { class: "alert-slot", "data-alert": field });
  }

  // ---------------------------------------------------------------------
  // Fish list
  // ---------------------------------------------------------------------

  var listEl = document.getElementById("fish-list");
  var emptyEl = document.getElementById("fish-empty");

  function renderList() {
    listEl.textContent = "";
    emptyEl.hidden = state.fish.length > 0;
    state.fish.forEach(function (f, i) {
      var item = (f.data.catch_info && f.data.catch_info.item && f.data.catch_info.item.identifier) || "no item yet";
      var hasError = fishErrors(f, i).length > 0;
      var btn = el("button", { type: "button", class: "fish-item" + (hasError ? " has-error" : ""), "aria-current": i === state.selected ? "true" : "false",
        onclick: function () { state.selected = i; rerender(); } }, [
        el("span", { class: "name", text: f.path || "(no file name)" }),
        el("span", { class: "sub", text: item })
      ]);
      var label = f.path || "fish " + (i + 1);
      listEl.appendChild(el("li", { class: "fish-row r-" + (f.data.rarity || "none") + (i === state.selected ? " current" : "") }, [
        btn,
        iconButton("clone", "icon-btn", "Duplicate " + label, function () { duplicateFish(i); }),
        iconButton("trash", "icon-btn trash", "Remove " + label, function () { removeFish(i); })
      ]));
    });
  }

  // Small inline SVG icons (drawn with the button's text colour).
  var ICONS = {
    clone: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
      '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>'
  };
  function iconButton(icon, cls, label, onclick) {
    var b = el("button", { type: "button", class: cls, "aria-label": label, title: label.split(" ")[0], onclick: onclick });
    b.innerHTML = ICONS[icon];
    return b;
  }

  function addFish() {
    state.fish.push({ path: uniquePath("new_fish"), pathAuto: true, data: newFishData() });
    state.selected = state.fish.length - 1;
    rerender();
  }

  function duplicateFish(i) {
    var src = state.fish[i];
    var copy = clone(src);
    copy.path = uniquePath((src.path || "fish") + "_copy");
    copy.pathAuto = false;
    state.fish.splice(i + 1, 0, copy);
    state.selected = i + 1;
    rerender();
  }

  function removeFish(i) {
    var f = state.fish[i];
    if (!confirm("Remove " + (f.path || "this fish") + " from the pack?")) return;
    state.fish.splice(i, 1);
    state.selected = Math.min(i, state.fish.length - 1);
    rerender();
  }

  document.getElementById("add-fish").addEventListener("click", addFish);

  // ---------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------

  function hasNull(v) {
    if (v === null) return true;
    if (Array.isArray(v)) return v.some(hasNull);
    if (v && typeof v === "object") return Object.keys(v).some(function (k) { return hasNull(v[k]); });
    return false;
  }

  function collectIds(v, out, path) {
    // Find id-like strings that are malformed (empty entries in id lists, bad item ids).
    if (Array.isArray(v)) v.forEach(function (x) { collectIds(x, out, path); });
    else if (v && typeof v === "object") Object.keys(v).forEach(function (k) { collectIds(v[k], out, k); });
    else if (typeof v === "string" && ["biomes", "blacklist", "fluids", "structure", "identifier", "entity", "sweetspot_type"].indexOf(path) !== -1) {
      if (!TAG_OR_ID_RE.test(v)) out.push(v);
    }
  }

  // Every problem with a fish: { field, msg, warn }. `field` names the alert slot
  // (the "!" next to a field's label) the message shows in; "general" sits by the title.
  // warn = true means it does not block generating the pack.
  function fishIssues(f, index) {
    var out = [];
    function add(field, msg, warn) { out.push({ field: field, msg: msg, warn: !!warn }); }
    var d = f.data;
    if (!PATH_RE.test(f.path || "")) add("path", "File name must be lowercase letters, numbers, _ - . or /.");
    var dup = state.fish.some(function (o, j) { return j !== index && o.path === f.path && fishNs(o) === fishNs(f); });
    if (dup) add("path", "Another fish already uses the file name “" + f.path + "”.");
    var item = d.catch_info && d.catch_info.item && d.catch_info.item.identifier;
    if (!item || !ID_RE.test(item)) add("item", "Item id is missing or not in the form namespace:item.");
    if (hasNull(d)) add("general", "Some number fields are empty or not valid numbers.");
    var bad = [];
    collectIds(d, bad);
    bad = bad.filter(function (b) { return b !== item; }); // the item id already has its own message
    if (bad.length) add("general", "Some ids are empty or malformed: " + bad.map(function (b) { return "“" + b + "”"; }).join(", "));
    (d.restrictions || []).forEach(function (r) {
      var schema = RESTRICTION_BY_TYPE[r.type];
      if (schema) {
        var problem = schema.check && schema.check(r);
        if (problem) add("general", schema.label + ": " + problem);
        return;
      }
      if (!ID_RE.test(r.type || "")) add("general", "A custom restriction needs a type id like mymod:my_restriction.");
      if (badRaw.has(r)) add("general", "A custom restriction's fields are not valid JSON.");
    });
    var baits = (d.restrictions || []).filter(function (r) { return r.type === "starcatcher:bait"; });
    baits.forEach(function (r) {
      Object.keys(r.baits || {}).forEach(function (k) { if (!ID_RE.test(k)) add("general", "Bait id “" + k + "” is not valid."); });
    });
    if (!d.skips_minigame && !(d.difficulty && d.difficulty.sweetspots && d.difficulty.sweetspots.length))
      add("sweetspots", "No sweetspots: the minigame cannot be won. Load a preset or add a sweetspot.", true);
    return out;
  }

  function fishErrors(f, index) {
    return fishIssues(f, index).filter(function (p) { return !p.warn; }).map(function (p) { return p.msg; });
  }

  // ---------------------------------------------------------------------
  // Pack settings
  // ---------------------------------------------------------------------

  var nameInput = document.getElementById("pack-name");
  var nsInput = document.getElementById("pack-namespace");
  var descInput = document.getElementById("pack-description");
  var versionSel = document.getElementById("pack-version");
  VERSIONS.forEach(function (v) { versionSel.appendChild(el("option", { value: v.id, text: v.id })); });
  versionSel.addEventListener("change", function () { state.pack.version = versionSel.value; save(); });

  function renderPack() {
    nameInput.value = state.pack.name || "";
    nsInput.value = state.pack.namespace || "";
    descInput.value = state.pack.description || "";
    state.pack.version = versionById(state.pack.version).id; // older saves have no version yet
    versionSel.value = state.pack.version;
    nsInput.classList.toggle("invalid", !NAMESPACE_RE.test(state.pack.namespace || ""));
  }

  nameInput.addEventListener("input", function () {
    state.pack.name = nameInput.value;
    if (state.pack.nsAuto) {
      state.pack.namespace = slugify(nameInput.value);
      nsInput.value = state.pack.namespace;
      nsInput.classList.remove("invalid");
    }
    save();
    renderList();
    updateFullPath();
  });
  nsInput.addEventListener("input", function () {
    state.pack.namespace = nsInput.value.trim();
    state.pack.nsAuto = false;
    nsInput.classList.toggle("invalid", !NAMESPACE_RE.test(state.pack.namespace));
    save();
    renderList();
    updateFullPath();
  });
  descInput.addEventListener("input", function () { state.pack.description = descInput.value; save(); });

  // ---------------------------------------------------------------------
  // Status line
  // ---------------------------------------------------------------------

  var statusEl = document.getElementById("status");
  function setStatus(msg, kind, list) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (kind ? " " + kind : "");
    if (list && list.length) statusEl.appendChild(el("ul", null, list.map(function (t) { return el("li", { text: t }); })));
  }

  function jszipReady() {
    if (typeof JSZip === "undefined") {
      setStatus("JSZip failed to load. Check your connection and reload the page.", "error");
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------
  // Download
  // ---------------------------------------------------------------------

  document.getElementById("download").addEventListener("click", function () {
    if (!jszipReady()) return;
    var errors = [];
    if (!NAMESPACE_RE.test(state.pack.namespace || "")) errors.push("Pack: the namespace must be lowercase letters, numbers, _ - or .");
    if (!state.fish.length) errors.push("Pack: add at least one fish.");
    state.fish.forEach(function (f, i) {
      fishErrors(f, i).forEach(function (e) { errors.push((f.path || "fish " + (i + 1)) + ": " + e); });
    });
    if (errors.length) {
      setStatus("Fix these first:", "error", errors);
      return;
    }

    var btn = this;
    btn.disabled = true;
    setStatus("Generating…");

    var zip = new JSZip();
    zip.file("pack.mcmeta", JSON.stringify(
      packMeta(state.pack.version, state.pack.description || state.pack.name || "Starcatcher datapack"), null, 2));
    state.fish.forEach(function (f) {
      zip.file("data/" + fishNs(f) + "/starcatcher/fish/" + f.path + ".json", JSON.stringify(exportData(f.data), null, 2));
    });

    var fileName = (state.pack.namespace || "starcatcher_datapack") + ".zip";
    zip.generateAsync({ type: "blob", compression: "DEFLATE" })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        setStatus("Downloaded " + fileName + " with " + state.fish.length + " fish.", "ok");
      })
      .catch(function (err) { setStatus("Could not generate the datapack: " + err.message, "error"); })
      .then(function () { btn.disabled = false; });
  });

  // ---------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------

  var fileInput = document.getElementById("import-file");
  document.getElementById("import-zip").addEventListener("click", function () { fileInput.click(); });

  fileInput.addEventListener("change", function () {
    var files = Array.prototype.slice.call(fileInput.files || []);
    fileInput.value = "";
    importFiles(files);
  });

  // Files from the import button or dropped on the page: a .zip replaces the pack,
  // .json fish files are added to it.
  function importFiles(files) {
    if (!files.length) return;
    var zips = files.filter(function (f) { return /\.zip$/i.test(f.name); });
    var jsons = files.filter(function (f) { return /\.json$/i.test(f.name); });
    if (zips.length) importZip(zips[0]);
    else if (jsons.length) importJsonFiles(jsons);
    else setStatus("Only .zip datapacks and .json fish files can be imported.", "error");
  }

  // A fish file needs at least catch_info.item.identifier; anything else is filled in by the editor.
  function looksLikeFish(d) {
    return !!d && typeof d === "object" && !Array.isArray(d) && !!d.catch_info && typeof d.catch_info === "object" &&
      !!d.catch_info.item && typeof d.catch_info.item.identifier === "string";
  }

  function importJsonFiles(files) {
    Promise.all(files.map(function (file) {
      return file.text().then(function (text) {
        try { return { name: file.name, data: JSON.parse(text) }; }
        catch (e) { return { name: file.name, error: "not valid JSON" }; }
      });
    })).then(function (results) {
      var added = 0;
      var bad = [];
      results.forEach(function (r) {
        if (r.error) { bad.push(r.name + ": " + r.error); return; }
        if (!looksLikeFish(r.data)) { bad.push(r.name + ": not a Starcatcher fish file (no catch_info.item)"); return; }
        // File name becomes the fish's file name; fall back to the item id.
        var base = r.name.replace(/\.json$/i, "").toLowerCase().replace(/[^a-z0-9_.\-]+/g, "_").replace(/^_+|_+$/g, "") ||
          pathFromItem(r.data.catch_info.item.identifier) || "fish";
        state.fish.push({ path: uniquePath(base), pathAuto: false, data: r.data });
        added++;
      });
      if (added) {
        state.selected = state.fish.length - 1;
        rerender();
      }
      var msg = added ? "Added " + added + " fish." : "No fish added.";
      if (bad.length) setStatus(msg + " Skipped:", "error", bad);
      else setStatus(msg, "ok");
    });
  }

  // Drag and drop anywhere on the page. The counter keeps the overlay up while
  // the cursor moves between child elements.
  var dragDepth = 0;
  function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") !== -1; }
  document.addEventListener("dragenter", function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    document.body.classList.add("dropping");
  });
  document.addEventListener("dragover", function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  document.addEventListener("dragleave", function (e) {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove("dropping");
  });
  document.addEventListener("drop", function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove("dropping");
    importFiles(Array.prototype.slice.call(e.dataTransfer.files || []));
  });

  function importZip(file) {
    if (!jszipReady()) return;
    setStatus("Reading " + file.name + "…");

    JSZip.loadAsync(file).then(function (zip) {
      var fishFiles = [];
      var mcmeta = null;
      var FISH_RE = /^(?:.*\/)?data\/([^\/]+)\/starcatcher\/fish\/(.+)\.json$/;
      zip.forEach(function (relPath, entry) {
        if (entry.dir) return;
        var m = relPath.match(FISH_RE);
        if (m) fishFiles.push({ ns: m[1], path: m[2], entry: entry });
        else if (/(^|\/)pack\.mcmeta$/.test(relPath) && !mcmeta) mcmeta = entry;
      });
      if (!fishFiles.length) throw new Error("no data/<namespace>/starcatcher/fish/*.json files found in this zip.");

      return Promise.all(fishFiles.map(function (f) {
        return f.entry.async("string").then(function (text) {
          try { return { ns: f.ns, path: f.path, data: JSON.parse(text) }; }
          catch (e) { return { ns: f.ns, path: f.path, error: e.message }; }
        });
      })).then(function (loaded) {
        return (mcmeta ? mcmeta.async("string") : Promise.resolve(null)).then(function (metaText) {
          return { loaded: loaded, metaText: metaText };
        });
      });
    }).then(function (res) {
      var good = res.loaded.filter(function (f) { return f.data && typeof f.data === "object"; });
      var bad = res.loaded.filter(function (f) { return !f.data || typeof f.data !== "object"; });
      if (!good.length) throw new Error("none of the fish files could be read as JSON.");
      if (state.fish.length && !confirm("Replace the " + state.fish.length + " fish currently in the generator with the " + good.length + " from this zip?")) {
        setStatus("Import cancelled.");
        return;
      }

      // Pack namespace = the one most fish use; others keep their own.
      var counts = {};
      good.forEach(function (f) { counts[f.ns] = (counts[f.ns] || 0) + 1; });
      var ns = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];

      var description = "";
      var version = null;
      try {
        var meta = res.metaText ? JSON.parse(res.metaText) : null;
        var desc = meta && meta.pack && meta.pack.description;
        description = typeof desc === "string" ? desc : (desc ? JSON.stringify(desc) : "");
        version = versionFromMeta(meta && meta.pack);
      } catch (e) { /* ignore a broken pack.mcmeta */ }
      if (version) state.pack.version = version;

      state.pack.namespace = ns;
      state.pack.nsAuto = false;
      if (description) state.pack.description = description;
      state.fish = good.map(function (f) {
        var entry = { path: f.path, data: f.data };
        if (f.ns !== ns) entry.ns = f.ns;
        return entry;
      });
      state.selected = 0;
      renderPack();
      rerender();
      var msg = "Imported " + good.length + " fish.";
      if (bad.length) setStatus(msg + " Skipped files that are not valid JSON:", "error", bad.map(function (b) { return b.ns + "/" + b.path + ": " + b.error; }));
      else setStatus(msg, "ok");
    }).catch(function (err) {
      setStatus("Could not import: " + err.message, "error");
    });
  }

  // ---------------------------------------------------------------------
  // Start over
  // ---------------------------------------------------------------------

  document.getElementById("clear-all").addEventListener("click", function () {
    if (!confirm("Remove every fish and reset the pack settings? This cannot be undone.")) return;
    state = {
      pack: { name: "My Fish Pack", namespace: "my_fish_pack", description: "Custom Starcatcher fish", version: DEFAULT_VERSION, nsAuto: true },
      fish: [],
      selected: -1
    };
    renderPack();
    rerender();
    setStatus("");
  });

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------

  if (state.selected >= state.fish.length) state.selected = state.fish.length - 1;
  if (state.selected < 0 && state.fish.length) state.selected = 0;
  // (?) bubbles written straight into the HTML (Pack section) also need keeping on screen.
  Array.prototype.forEach.call(document.querySelectorAll(".sidebar .tip"), function (t) {
    t.addEventListener("mouseenter", function () { fitTip(t); });
    t.addEventListener("focus", function () { fitTip(t); });
  });

  // The page scrolls inside .content (below the site header), not the window. Its visible
  // height caps the sticky sidebar so the Download panel can always be scrolled to.
  function updateViewHeight() {
    var scroller = document.querySelector(".content");
    document.documentElement.style.setProperty("--view-h", (scroller ? scroller.clientHeight : window.innerHeight) + "px");
  }
  window.addEventListener("resize", updateViewHeight);
  updateViewHeight();

  renderPack();
  renderList();
  renderEditor();
})();
