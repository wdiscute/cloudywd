/*
 * Starcatcher wiki
 *
 * ARTICLES
 * Every article is a markdown file in /mods/starcatcher/wiki/pages/.
 * To add an article:
 *   1. Create pages/<slug>.md  (slug = lowercase-with-dashes, e.g. "star-rods")
 *   2. Add it to the PAGES list below, under the section it belongs to.
 * Article URLs look like /mods/starcatcher/wiki/#star-rods
 *
 * Inside a .md file you can write:
 *   [Star Rods](star-rods)          link to another article (just the slug)
 *   {{item clear_bobber}}           item icon + name, links to its item page
 *   {{recipe clear_bobber}}         every recipe that makes the item (own line)
 *   {{items #starcatcher:hooks}}    grid of every item in a tag (own line)
 *   {{items worm cherry_bait}}      grid of specific items (own line)
 *   {{items aquarium}} {{recipe aquarium}}   several on one line sit side by side
 * Item ids without "namespace:" are Starcatcher items; vanilla ones need "minecraft:".
 *
 * ITEMS & RECIPES
 * Item names, icons, tags and recipes live in data/ and are generated from the
 * mod's source with `npm run wiki-data` (see tools/build-wiki-data.mjs).
 * Every Starcatcher item gets its own page automatically: #item/clear_bobber
 * The All Items page is #items
 */
(function () {
  var PAGES = [
    { pages: [
      { slug: "items",             title: "All Items" }
    ]},
    { section: "Fishing", pages: [
      { slug: "fishing-basics",    title: "Fishing Basics" },
      { slug: "tracking",          title: "Tracking" },
      { slug: "hunting-for-legendary", title: "Hunting For Legendary" },
      { slug: "golden-fish",       title: "Golden Fish" },
      { slug: "tips-and-tricks",   title: "Tips & Tricks" },
      { slug: "faq",               title: "FAQ" }
    ]},
    { section: "Features", pages: [
      { slug: "bobbers-and-hooks", title: "Bobbers & Hooks" },
      { slug: "baits",             title: "Baits" },
      { slug: "tackle-boxes",      title: "Tackle Boxes" },
      { slug: "hats",              title: "Hats" },
      { slug: "aquariums",         title: "Aquariums" },
      { slug: "trophies",          title: "Trophies" },
      { slug: "display-blocks",    title: "Display Blocks" },
      { slug: "fish-plaques",      title: "Fish Plaques" },
      { slug: "messages-in-a-bottle", title: "Messages In A Bottle" },
      { slug: "selling-bin",       title: "Selling Bin" },
      { slug: "tournaments",       title: "Tournaments" }
    ]}
  ];

  // Sections of the All Items page, in order. Each one is a mod item tag.
  // "id" is used in links: #items/rare jumps to the Rare Fish section.
  // Sections with "rarity" are fish: their item pages show a coloured rarity pill.
  var CATEGORIES = [
    { id: "common",       label: "Common Fish",    tag: "starcatcher:common_fishes",    rarity: "Common" },
    { id: "uncommon",     label: "Uncommon Fish",  tag: "starcatcher:uncommon_fishes",  rarity: "Uncommon" },
    { id: "rare",         label: "Rare Fish",      tag: "starcatcher:rare_fishes",      rarity: "Rare" },
    { id: "epic",         label: "Epic Fish",      tag: "starcatcher:epic_fishes",      rarity: "Epic" },
    { id: "legendary",    label: "Legendary Fish", tag: "starcatcher:legendary_fishes", rarity: "Legendary" },
    { id: "rods",         label: "Rods",           tag: "starcatcher:rods" },
    { id: "hooks",        label: "Hooks",          tag: "starcatcher:hooks" },
    { id: "bobbers",      label: "Bobbers",        tag: "starcatcher:bobbers" },
    { id: "baits",        label: "Baits",          tag: "starcatcher:baits" },
    { id: "hats",         label: "Hats",           tag: "starcatcher:hats" },
    { id: "tackle-boxes", label: "Tackle Boxes",   tag: "starcatcher:tackle_boxes", also: /_tackle_box_boat$/ },
    { id: "plaques",      label: "Plaques",        tag: "starcatcher:fish_plaques" },
    { id: "templates",    label: "Templates",      tag: "starcatcher:templates" }
  ];
  var OTHER = { id: "other", label: "Other" }; // items in none of the sections above
  // "also": item ids that belong in a section without having its tag (e.g. the tackle box boats)
  CATEGORIES.forEach(function (c) {
    c.test = function (t, id) { return t.indexOf(c.tag) >= 0 || !!(c.also && id && c.also.test(id)); };
  });

  // Tags on item pages: each one links to a wiki page and is titled like that page.
  // Separate from CATEGORIES (those only sort and filter the All Items page).
  // An item gets the tag if it has one of "tags", is listed in "items", or its id matches "match".
  var PAGE_TAGS = [
    { page: "fishing-basics",    tags: ["starcatcher:common_fishes", "starcatcher:uncommon_fishes", "starcatcher:rare_fishes",
                                        "starcatcher:epic_fishes", "starcatcher:legendary_fishes", "starcatcher:rods"] },
    { page: "bobbers-and-hooks", tags: ["starcatcher:hooks", "starcatcher:bobbers"] },
    { page: "baits",             tags: ["starcatcher:baits"] },
    { page: "hats",              tags: ["starcatcher:hats"] },
    { page: "tackle-boxes",      tags: ["starcatcher:tackle_boxes"], match: /_tackle_box_boat$/ },
    { page: "fish-plaques",      tags: ["starcatcher:fish_plaques"] },
    { page: "aquariums",         items: ["starcatcher:aquarium"] },
    { page: "trophies",          match: /^starcatcher:trophy_/ },
    { page: "messages-in-a-bottle", items: ["starcatcher:letter", "starcatcher:bottled_letter", "starcatcher:message",
                                            "starcatcher:message_in_a_bottle", "starcatcher:broken_bottle"] }
  ];

  // Extra "How to get" text written for the wiki, for items the mod's data doesn't explain.
  // {{item id}} inside the text becomes a clickable item, like in the pages.
  var OBTAIN = {
    "starcatcher:starcaught_bucket": "Using a bucket as a bait will give you this item, containing the fish caught.",
    "starcatcher:message_in_a_bottle": "Fished up when another player throws a {{item bottled_letter}} into the sea, or from one of the secret messages in a bottle built into Starcatcher.",
    "starcatcher:message": "Obtained by breaking open a {{item message_in_a_bottle}}.",
    "starcatcher:broken_bottle": "Obtained when you break open a {{item message_in_a_bottle}} by throwing it. It can be thrown at entities to damage them."
  };

  // Related items: each group's item pages show the others under "See also".
  var RELATED = [
    ["starcatcher:letter", "starcatcher:bottled_letter", "starcatcher:message", "starcatcher:message_in_a_bottle", "starcatcher:broken_bottle"],
    ["starcatcher:vanilla_bobber", "starcatcher:vanilla_hook"],
    ["starcatcher:worm", "starcatcher:almighty_worm", "starcatcher:seeking_worm"],
    ["starcatcher:copper_hook", "starcatcher:exposed_copper_hook", "starcatcher:weathered_copper_hook", "starcatcher:oxidised_copper_hook"],
    ["starcatcher:starcaught_fish", "starcatcher:cooked_starcaught_fish"],
    ["starcatcher:boot", "starcatcher:mossy_boot"],
    ["starcatcher:clam", "starcatcher:pearl"],
    ["starcatcher:starcatcher_guide", "starcatcher:display"]
  ].concat(
    // each rod with its skin smithing template
    ["naturalist", "iceborn", "magmaforged", "slimed", "sharktooth", "azure_crystal", "bamboo",
     "obsidian", "boner", "sky", "lush_glowberry", "humble"].map(function (n) {
      return ["starcatcher:" + n + "_rod", "starcatcher:" + n + "_skin_smithing_template"];
    })
  );

  var DEFAULT = "items"; // page shown at /mods/starcatcher/wiki/ with no #page
  var BASE = "/mods/starcatcher/wiki/";
  var NS = "starcatcher";

  var nav = document.querySelector(".wiki-nav");
  var links = document.querySelector(".wiki-links");
  var toggle = document.querySelector(".wiki-toggle");
  var page = document.querySelector(".wiki-page");
  var scroller = document.querySelector(".content");
  var search = document.querySelector(".wiki-search input");
  var results = document.querySelector(".wiki-results");

  var ITEMS = {}, RECIPES = [], TAGS = {}, MADE_BY = {}, USED_IN = {};

  /* ---------------- small helpers ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function fullId(id) { return id.indexOf(":") >= 0 ? id : NS + ":" + id; }
  function shortId(id) { return id.indexOf(NS + ":") === 0 ? id.slice(NS.length + 1) : id; }
  function itemName(id) { return ITEMS[id] ? ITEMS[id].name : pretty(id); }
  function pretty(id) {
    return id.split(":").pop().split("/").pop().split("_").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
  }
  function isModItem(id) { return id.indexOf(NS + ":") === 0 && ITEMS[id]; }
  function itemHref(id) { return "#item/" + shortId(id); }
  function findPage(slug) {
    for (var i = 0; i < PAGES.length; i++)
      for (var j = 0; j < PAGES[i].pages.length; j++)
        if (PAGES[i].pages[j].slug === slug) return PAGES[i].pages[j];
    return null;
  }
  // Position of the item's type in CATEGORIES (items with no type go last)
  function typeOrder(id) {
    var t = (ITEMS[id] && ITEMS[id].tags) || [];
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].test(t, id)) return i;
    return CATEGORIES.length;
  }
  // Every Starcatcher item, in All Items order (by section, then by name)
  var ITEM_LIST = null;
  function itemList() {
    if (!ITEM_LIST) ITEM_LIST = Object.keys(ITEMS).filter(function (id) { return id.indexOf(NS + ":") === 0; })
      .sort(function (a, b) { return typeOrder(a) - typeOrder(b) || itemName(a).localeCompare(itemName(b)); });
    return ITEM_LIST;
  }
  // The fish rarity section an item belongs to, or null if it isn't a catchable fish
  function rarityOf(id) {
    var t = (ITEMS[id] && ITEMS[id].tags) || [];
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].rarity && CATEGORIES[i].test(t)) return CATEGORIES[i];
    return null;
  }

  // Item icon (16x16 pixel art, or the first frame of an animated texture).
  // Items with a 3D model start with their flat texture and get swapped for
  // a rendered picture by hydrate() (see models.js).
  var RENDERED = {}; // id -> data URL of the 3D render
  function icon(id, cls) {
    var it = ITEMS[id];
    if (RENDERED[id])
      return '<span class="wk-icon r3d ' + (cls || "") + '" style="background-image:url(' + RENDERED[id] + ')"></span>';
    var model = it && it.model ? ' data-model="' + esc(id) + '"' : "";
    if (it && it.icon)
      return '<span class="wk-icon ' + (cls || "") + '"' + model + ' style="background-image:url(' + BASE + "data/icons/" + it.icon + ')"></span>';
    return '<span class="wk-icon none ' + (cls || "") + '"' + model + ">" + esc(itemName(id).charAt(0)) + "</span>";
  }
  function hydrate(root) {
    if (!window.WikiModels) return;
    root.querySelectorAll(".wk-icon[data-model]").forEach(function (el) {
      var id = el.getAttribute("data-model");
      el.removeAttribute("data-model");
      WikiModels.icon(id).then(function (url) {
        RENDERED[id] = url;
        el.style.backgroundImage = "url(" + url + ")";
        el.classList.add("r3d");
        el.classList.remove("none");
        el.textContent = "";
      }).catch(function () {});
    });
  }
  // Where clicking an item goes: Starcatcher items open their wiki page, vanilla items
  // open their page on the Minecraft Wiki in a new tab. Returns {href, external} or null.
  function itemLink(id) {
    if (isModItem(id)) return { href: itemHref(id), external: false };
    if (id.indexOf("minecraft:") === 0)
      return { href: "https://minecraft.wiki/w/" + encodeURIComponent(itemName(id).replace(/ /g, "_")), external: true };
    return null;
  }
  function linkAttrs(id) {
    var l = itemLink(id);
    if (!l) return "";
    return ' href="' + esc(l.href) + '"' + (l.external ? ' target="_blank" rel="noopener"' : "");
  }
  // Icon + name, linked (see itemLink)
  function chip(id) {
    var inner = icon(id) + "<span>" + esc(itemName(id)) + "</span>";
    var link = linkAttrs(id);
    return link
      ? '<a class="wk-chip"' + link + ">" + inner + "</a>"
      : '<span class="wk-chip">' + inner + "</span>";
  }
  // Grid of item cards
  function grid(ids) {
    if (!ids.length) return '<p class="wk-empty">No items.</p>';
    return '<div class="wk-grid">' + ids.map(function (id) {
      var inner = icon(id, "big") + '<span class="wk-card-name">' + esc(itemName(id)) + "</span>";
      var link = linkAttrs(id);
      return link
        ? '<a class="wk-card"' + link + ">" + inner + "</a>"
        : '<span class="wk-card">' + inner + "</span>";
    }).join("") + "</div>";
  }

  /* ---------------- recipes ---------------- */
  // An ingredient can be {item}, {tag} or a list of them: returns the item ids it accepts
  function options(ing) {
    if (!ing) return [];
    if (Array.isArray(ing)) return ing.reduce(function (a, x) { return a.concat(options(x)); }, []);
    if (typeof ing === "string") return [ing];
    if (ing.item) return [ing.item];
    if (ing.tag) return TAGS[ing.tag] || [];
    return [];
  }
  function tagOf(ing) {
    if (!ing) return null;
    if (Array.isArray(ing)) return ing.length === 1 ? tagOf(ing[0]) : null;
    return ing.tag || null;
  }
  // One recipe slot. Ingredients that accept several items cycle through them.
  // A number drawn with Minecraft's own font (data/icons/font/ascii.png, 8px glyph cells):
  // each digit is one <i>, showing its glyph from the texture (see .wk-count in wiki.css)
  function pixelNumber(n) {
    return '<span class="wk-count" aria-label="' + n + '">' + String(n).split("").map(function (d) {
      return '<i style="--g:' + d + '"></i>';
    }).join("") + "</span>";
  }
  // One recipe slot. Hovering shows a Minecraft-style tooltip (see the tooltip code below);
  // data-item is the item it shows, data-tag the tag it accepts (if any).
  function slot(ing, count) {
    var opts = options(ing);
    if (!opts.length) return '<span class="wk-slot"></span>';
    var tag = tagOf(ing);
    var cycle = opts.length > 1 ? ' data-cycle="' + esc(JSON.stringify(opts)) + '" data-i="0"' : "";
    var n = count > 1 ? pixelNumber(count) : "";
    var tagMark = tag ? '<span class="wk-tag">#</span>' : "";
    var tagAttr = tag ? ' data-tag="' + esc(tag) + '"' : "";
    var inner = icon(opts[0]) + n + tagMark;
    var href = linkAttrs(opts[0]);
    return "<a class=\"wk-slot\"" + href + ' data-item="' + esc(opts[0]) + '"' + tagAttr + cycle + ">" + inner + "</a>";
  }
  var LABELS = {
    "minecraft:crafting_shaped": "Crafting Table",
    "minecraft:crafting_shapeless": "Crafting Table (shapeless)",
    "minecraft:smelting": "Furnace",
    "minecraft:blasting": "Blast Furnace",
    "minecraft:smoking": "Smoker",
    "minecraft:campfire_cooking": "Campfire",
    "minecraft:stonecutting": "Stonecutter",
    "starcatcher:starcatcher_rod_smithing_recipe": "Smithing Table",
    "starcatcher:bottled_letter": "Crafting Table (shapeless)",
    "starcatcher:tackle_box_boat": "Crafting Table (shapeless)",
    "starcatcher:targeted_bait": "Crafting Table (shapeless)"
  };
  function recipeHtml(r) {
    var type = r.type, cells = [], kind = "grid";
    if (type === "minecraft:crafting_shaped") {
      var pat = r.pattern || [];
      for (var y = 0; y < 3; y++) for (var x = 0; x < 3; x++) {
        var ch = (pat[y] || "").charAt(x);
        cells.push(ch && ch !== " " ? r.key[ch] : null);
      }
    } else if (r.ingredients) {
      cells = r.ingredients.slice(0, 9);
      while (cells.length < 9) cells.push(null);
    } else if (r.ingredient) {
      kind = "cook"; cells = [r.ingredient];
    } else if (r.template || r.base || r.rod) {
      kind = "smith"; cells = [r.template, r.rod || r.base, r.material || r.addition];
    } else {
      kind = "smith"; cells = [];
      for (var k in r) if (k !== "result" && r[k] && typeof r[k] === "object" && (r[k].item || r[k].tag)) cells.push(r[k]);
    }
    var res = r.result || {};
    var resId = res.id || res.item;
    return '<div class="wk-recipe ' + kind + '">' +
      '<div class="wk-recipe-body">' +
        '<div class="wk-in">' + cells.map(function (c) { return slot(c); }).join("") + "</div>" +
        '<span class="wk-arrow" aria-hidden="true">' + (kind === "cook" ? "&#128293;" : "&#10140;") + "</span>" +
        '<div class="wk-out">' + slot(resId ? { item: resId } : null, res.count) + "</div>" +
      "</div></div>";
  }
  function recipesFor(id) {
    var list = MADE_BY[id] || [];
    if (!list.length) return '<p class="wk-empty">No recipe for ' + esc(itemName(id)) + ".</p>";
    return '<div class="wk-recipes">' + list.map(recipeHtml).join("") + "</div>";
  }

  // Ingredient slots that accept several items show each one in turn
  setInterval(function () {
    page.querySelectorAll(".wk-slot[data-cycle]").forEach(function (el) {
      var opts = JSON.parse(el.getAttribute("data-cycle"));
      var i = (+el.getAttribute("data-i") + 1) % opts.length;
      el.setAttribute("data-i", i);
      var old = el.querySelector(".wk-icon");
      var tmp = document.createElement("span");
      tmp.innerHTML = icon(opts[i]);
      old.replaceWith(tmp.firstChild);
      hydrate(el);
      el.setAttribute("data-item", opts[i]);
      if (el === tipFor) showTip(el); // keep an open tooltip in step with the item shown
      var l = itemLink(opts[i]);
      if (l) el.setAttribute("href", l.href); else el.removeAttribute("href");
      if (l && l.external) { el.target = "_blank"; el.rel = "noopener"; } else { el.removeAttribute("target"); el.removeAttribute("rel"); }
    });
  }, 1200);

  /* ---------------- recipe slot tooltips ----------------
   * Minecraft-style tooltip that follows the cursor: item name (in its rarity colour for
   * fish) and what the slot accepts if it's a tag. */
  var tip = document.createElement("div");
  tip.className = "wk-tooltip";
  tip.hidden = true;
  document.body.appendChild(tip);
  var tipFor = null;
  function showTip(el) {
    var id = el.getAttribute("data-item"), tag = el.getAttribute("data-tag");
    var r = rarityOf(id);
    tip.innerHTML = '<div class="wk-tip-name' + (r ? " wk-desc-" + r.id : "") + '">' + esc(itemName(id)) + "</div>" +
      (tag ? '<div class="wk-tip-line">Accepts any ' + esc(pretty(tag)) + "</div>" : "");
    tip.hidden = false;
    tipFor = el;
  }
  function moveTip(e) {
    var pad = 22, w = tip.offsetWidth, h = tip.offsetHeight; // pad: gap to the right of the cursor
    var x = e.clientX + pad, y = e.clientY - h / 2;         // vertically centred on the cursor
    if (x + w > innerWidth - 4) x = e.clientX - pad - w; // flip to the left near the edge
    tip.style.left = Math.max(4, x) + "px";
    tip.style.top = Math.max(4, Math.min(y, innerHeight - h - 4)) + "px";
  }
  page.addEventListener("mouseover", function (e) {
    var el = e.target.closest(".wk-slot[data-item]");
    if (el && el !== tipFor) showTip(el);
    if (el) moveTip(e);
  });
  page.addEventListener("mousemove", function (e) { if (tipFor) moveTip(e); });
  page.addEventListener("mouseout", function (e) {
    if (tipFor && !(e.relatedTarget && tipFor.contains(e.relatedTarget))) { tip.hidden = true; tipFor = null; }
  });
  window.addEventListener("hashchange", function () { tip.hidden = true; tipFor = null; });

  /* ---------------- {{ }} tags in markdown ---------------- */
  // {{recipe}} and {{items}} make blocks. Several of them on one line sit side by side.
  function expandTags(md) {
    var TAG = /\{\{\s*(item|recipe|items)\s+([^}]+?)\s*\}\}/g;
    var block = function (kind, arg) {
      if (kind === "recipe") return '<div class="wk-block">' + recipesFor(fullId(arg)) + "</div>";
      var ids = arg.charAt(0) === "#"
        ? (TAGS[arg.slice(1)] || []).filter(function (i) { return ITEMS[i]; })
        : arg.split(/\s+/).map(fullId);
      return '<div class="wk-block">' + grid(ids) + "</div>";
    };
    return md.split("\n").map(function (line) {
      var blocks = line.match(/\{\{\s*(recipe|items)\s/g);
      if (blocks && blocks.length > 1 && !line.replace(TAG, "").trim()) {
        var row = [];
        line.replace(TAG, function (all, kind, arg) { row.push(block(kind, arg)); });
        return '\n<div class="wk-row">' + row.join("") + "</div>\n";
      }
      return line.replace(TAG, function (all, kind, arg) {
        return kind === "item" ? chip(fullId(arg)) : "\n" + block(kind, arg) + "\n";
      });
    }).join("\n");
  }

  /* ---------------- pages ---------------- */
  function setPage(html, title) {
    page.innerHTML = html;
    document.title = title + " – Starcatcher Wiki";
    page.classList.remove("loading");
    scroller.scrollTop = 0;
    hydrate(page);
  }

  // Links like [text](some-slug) become wiki links (#some-slug)
  function fixLinks() {
    page.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (/^[a-z0-9-]+$/i.test(href)) a.setAttribute("href", "#" + href);
      else if (/^https?:/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    });
  }

  function showArticle(info) {
    page.classList.add("loading");
    fetch(BASE + "pages/" + info.slug + ".md")
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (md) {
        setPage(marked.parse(expandTags(md)), info.title);
        fixLinks();
      })
      .catch(notFound);
  }

  // One trophy milestone in words, e.g. {rarity:"legendary", count:2, type:"unique"}
  // -> "Catch 2 different Legendary fish". Works like the mod's RarityCountRestriction:
  // rarity "none" = any fish, "golden" = fish caught golden (each species counts once);
  // type "total" = every catch counts, "unique" = different fish, "all" = every fish in the guide.
  function trophyGoal(g) {
    var word = function (r) { return '<span class="wk-desc-' + r + '">' + pretty(r) + "</span>"; };
    var n = '<strong>' + g.count.toLocaleString("en") + "</strong>";
    if (g.rarity === "golden")
      return g.type === "all" ? "Catch a " + word("golden") + " version of every fish in the guide"
        : "Catch a " + word("golden") + " version of " + n + " different fish";
    var kind = g.rarity === "none" ? "fish" : word(g.rarity) + " fish";
    if (g.type === "all") return "Catch every " + kind;
    return "Catch " + n + (g.type === "unique" ? " different " : " ") + kind;
  }

  // Where and when a fish bites (it.where, from the mod's fish datagen), as a table:
  // one row per kind (Dimension, Biome, Fluid, Elevation, Time, Weather, Light, Season, Structure, Bait)
  var WHERE_LABELS = { Fluid: "Fished in", Time: "Time of day", Mod: "Needs mod" };
  function whereTable(rows) {
    var kinds = [], byKind = {};
    rows.forEach(function (r) {
      if (!byKind[r.kind]) { byKind[r.kind] = []; kinds.push(r.kind); }
      var v = r.item ? '<span class="wk-where-pre">' + esc(r.text) + "</span> " + chip(r.item) : esc(r.text);
      if (r.kind === "Mod") v += ' <span class="wk-where-note">(only with it installed)</span>';
      if (r.note) v += ' <span class="wk-where-note">' + esc(r.note) + "</span>";
      byKind[r.kind].push(v);
    });
    return '<table class="wk-where"><tbody>' + kinds.map(function (k) {
      return "<tr><th>" + esc(WHERE_LABELS[k] || k) + "</th><td>" + byKind[k].join("<br>") + "</td></tr>";
    }).join("") + "</tbody></table>";
  }

  function pageTitle(slug) {
    for (var i = 0; i < PAGES.length; i++)
      for (var j = 0; j < PAGES[i].pages.length; j++)
        if (PAGES[i].pages[j].slug === slug) return PAGES[i].pages[j].title;
    return slug;
  }

  function showItem(id) {
    var it = ITEMS[id];
    if (!it) return notFound();
    var badges = [];
    var rarity = rarityOf(id);
    // Rarity pill: links to that rarity's section on the All Items page
    if (rarity) badges.push('<a class="wk-rarity ' + rarity.id + '" href="#items/' + rarity.id + '" title="See all ' + esc(rarity.label) + '">' + rarity.rarity + "</a>");
    // Page tags (see PAGE_TAGS)
    PAGE_TAGS.forEach(function (p) {
      var has = (p.tags || []).some(function (t) { return (it.tags || []).indexOf(t) >= 0; }) ||
        (p.items || []).indexOf(id) >= 0 || !!(p.match && p.match.test(id));
      if (!has) return;
      var title = pageTitle(p.page);
      badges.push('<a class="wk-badge" href="#' + p.page + '" title="Go to ' + esc(title) + '">' + esc(title) + "</a>");
    });
    var made = MADE_BY[id] || [];
    var used = USED_IN[id] || [];
    // Big icon: the frame stays still and the icon floats on hover. Flat items get
    // 1 texture pixel of thickness like Minecraft's held items: 7 darker copies stacked
    // behind the icon, then a normal one as its back (seen when it flips round on hover).
    // 3D-model items are already rendered in 3D, so they skip this.
    var front = icon(id, "huge"), layers = "";
    if (!it.model) for (var z = 1; z <= 8; z++)
      layers += front.replace('class="wk-icon ', 'class="wk-icon wk-layer' + (z === 8 ? " wk-back " : " ")).replace(' style="', ' style="--z:' + z + ";");
    var big = '<span class="wk-big"><span class="wk-big-3d">' + layers + front + "</span></span>";
    // Top bar: back to All Items, then small previous / next arrows (All Items order).
    // Hovering an arrow shows which item it goes to.
    // Loops around: previous from the first item goes to the last, next from the last to the first
    var list = itemList(), at = list.indexOf(id), n = list.length;
    var prev = at >= 0 && n > 1 ? list[(at - 1 + n) % n] : null;
    var next = at >= 0 && n > 1 ? list[(at + 1) % n] : null;
    var chevron = function (points) {
      return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><polyline points="' + points +
        '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    };
    // Hovering an arrow slides out the item it goes to (icon + name) to its right,
    // so the arrow itself stays under the mouse
    var step = function (to, cls, arrow, label) {
      if (!to) return '<span class="wk-step ' + cls + ' off" aria-hidden="true">' + arrow + "</span>";
      var reveal = '<span class="wk-step-reveal">' + icon(to) + "<span>" + esc(itemName(to)) + "</span></span>";
      return '<a class="wk-step ' + cls + '" href="' + itemHref(to) + '" aria-label="' + label + ": " + esc(itemName(to)) + '">' +
        arrow + reveal + "</a>";
    };
    var html = '<div class="wk-topbar"><a class="wk-back" href="#' + backTo.slug + '">&larr; ' + esc(backTo.title) + '</a>' +
      step(prev, "wk-prev", chevron("15 6 9 12 15 18"), "Previous") + step(next, "wk-next", chevron("9 6 15 12 9 18"), "Next") + "</div>" +
      '<div class="wk-item-head">' + big + "<div><h1>" + esc(it.name) + "</h1>" +
      '<p class="wk-id"><code>' + esc(id) + "</code></p>" +
      (badges.length ? '<p class="wk-badges">' + badges.join("") + "</p>" : "") + "</div></div>";
    // Description (the in-game tooltip), with the mod's <scrarity>...</scrarity> words coloured.
    // Fish get their rarity colour; other items use the accent colour.
    if (it.desc) {
      var desc = esc(it.desc).replace(/&lt;sc([a-z]+)&gt;([\s\S]*?)&lt;\/sc\1&gt;/g, '<span class="wk-desc-$1">$2</span>');
      html += '<blockquote class="wk-desc' + (rarity ? " " + rarity.id : "") + '">' + desc + "</blockquote>";
    }
    // What the item does when equipped (from the mod's modifier data maps)
    if (it.modifiers && it.modifiers.length) {
      html += "<h2>Modifiers</h2><ul class=\"wk-mods\">" + it.modifiers.map(function (m) {
        return "<li>" + esc(m.text) + (m.note ? '<span class="wk-mod-note">' + esc(m.note) + "</span>" : "") + "</li>";
      }).join("") + "</ul>";
    }
    html += "<h2>How to get</h2>";
    // it.caught: the rarity it's fished up at (from the mod's fish datagen), e.g. "trash"
    // it.trophy: milestones needed before the trophy can be fished up (from DGTrophies.java)
    if (it.trophy) html += "<p>Fished up, only once, after you've reached these milestones:</p>" +
      '<ul class="wk-goals">' + it.trophy.map(function (g) { return "<li>" + trophyGoal(g) + "</li>"; }).join("") + "</ul>";
    else if (it.caught === "trash") html += "<p>Caught by fishing, as trash.</p>";
    else if (rarity && it.where && it.where.length) html += "<p>Caught by fishing:</p>" + whereTable(it.where);
    else if (it.caught || rarity) html += "<p>Caught by fishing.</p>";
    // it.obtain: other ways to get it (the mod's JEI info pages); it.bonemeal: drop chances
    (it.obtain || []).forEach(function (t) { html += "<p>" + esc(t) + "</p>"; });
    if (OBTAIN[id]) html += "<p>" + esc(OBTAIN[id]).replace(/\{\{\s*item\s+([^}]+?)\s*\}\}/g, function (all, arg) { return chip(fullId(arg)); }) + "</p>";
    if (it.bonemeal) html += '<table class="wk-chances"><thead><tr><th>Bonemealing</th><th>Chance</th><th>Golden</th></tr></thead><tbody>' +
      it.bonemeal.map(function (r) {
        return "<tr><td>" + esc(r.block) + "</td><td>" + r.chance + '%</td><td class="wk-golden">' + (r.golden ? r.golden + "%" : "–") + "</td></tr>";
      }).join("") + "</tbody></table>";
    // it.rareCatch: a rare catch in a specific place; it.treasureFrom: treasure from these fish
    // (smithing templates, from DGTrophies.java and DGSCDataMapsProvider.java)
    if (it.rareCatch) html += "<p>A rare catch" + (it.rareCatch.chance ? " (" + it.rareCatch.chance + "% chance)" : "") +
      " when fishing with all of these:</p>" +
      '<ul class="wk-goals">' + it.rareCatch.where.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>";
    if (it.treasureFrom && it.treasureFrom.length) html += "<p>Found as treasure while reeling in " +
      it.treasureFrom.map(chip).join(" or ") + ".</p>";
    var other = it.trophy || it.caught || rarity || it.obtain || OBTAIN[id] || it.rareCatch || (it.treasureFrom && it.treasureFrom.length);
    if (made.length) html += (other ? "<p>It can also be crafted:</p>" : "") + recipesFor(id);
    else if (!other) html += '<p class="wk-empty">This item has no recipe.</p>';
    if (used.length) {
      html += "<h2>Used to make</h2>";
      var outs = [];
      used.forEach(function (rc) { var o = rc.result && (rc.result.id || rc.result.item); if (o && outs.indexOf(o) < 0 && o !== id) outs.push(o); });
      html += used.length <= 4 ? '<div class="wk-recipes">' + used.map(recipeHtml).join("") + "</div>" : grid(outs);
    }
    var related = [];
    RELATED.forEach(function (g) {
      if (g.indexOf(id) >= 0) g.forEach(function (o) { if (o !== id && ITEMS[o] && related.indexOf(o) < 0) related.push(o); });
    });
    // 1 in 100 page loads it says "Sea also" instead
    if (related.length) html += "<h2>" + (Math.random() < 0.01 ? "Sea also" : "See also") + "</h2>" + grid(related);
    setPage(html, it.name);
  }

  // While an item icon is hovered (the big one on item pages, grid cards, recipe slots),
  // every 3-10 seconds (at random) it does a quick 360. One listener for the whole page.
  var SPIN_TARGETS = ".wk-big,.wk-card,.wk-slot";
  function spinTarget(frame) { return frame.querySelector(frame.classList.contains("wk-big") ? ".wk-big-3d" : ".wk-icon"); }
  function startSpins(frame) {
    if (frame._spinning || !frame.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    frame._spinning = true;
    var next = function () { clearTimeout(frame._spinTimer); frame._spinTimer = setTimeout(spin, 3000 + Math.random() * 7000); };
    var spin = function () {
      var el = spinTarget(frame); // looked up each time: recipe slots that cycle swap their icon
      if (!frame._spinning || !el) return;
      el.animate([{ "--wk-flip": "0deg" }, { "--wk-flip": "360deg" }],
        { duration: 800, easing: "cubic-bezier(.4,0,.2,1)" }).onfinish = function () { if (frame._spinning) next(); };
    };
    next();
  }
  function stopSpins(frame) { frame._spinning = false; clearTimeout(frame._spinTimer); }
  document.addEventListener("mouseover", function (e) {
    var f = e.target.closest && e.target.closest(SPIN_TARGETS);
    if (f && !f.contains(e.relatedTarget)) startSpins(f);
  });
  document.addEventListener("mouseout", function (e) {
    var f = e.target.closest && e.target.closest(SPIN_TARGETS);
    if (f && !f.contains(e.relatedTarget)) stopSpins(f);
  });

  // All Items: one collapsible section per category. The pills at the top jump
  // to a section; the search box filters. "jump" is a section id to scroll to.
  // Where you were on All Items (scroll, search, collapsed sections), so coming back
  // from an item page puts you back in the same spot
  var ALL = { open: false, scroll: 0, q: "", collapsed: {} };
  function leaveAllItems() {
    if (!ALL.open) return;
    ALL.open = false;
    ALL.scroll = scroller.scrollTop;
    var text = page.querySelector(".wk-filter-text");
    if (text) ALL.q = text.value;
  }

  function showAllItems(jump) {
    var all = itemList();
    var sections = CATEGORIES.concat([OTHER]);
    var pills = sections.map(function (c) { return '<button type="button" data-jump="' + c.id + '">' + c.label + "</button>"; });
    setPage("<h1>All Items</h1>" +
      '<input class="wk-filter-text" type="search" placeholder="Search ' + all.length + ' items…" aria-label="Search items">' +
      '<div class="wk-filters">' + pills.join("") + "</div>" +
      '<div class="wk-all"></div>', "All Items");

    var box = page.querySelector(".wk-all"), text = page.querySelector(".wk-filter-text");
    var collapsed = ALL.collapsed; // section id -> true while collapsed
    text.value = ALL.q;
    ALL.open = true;
    function update() {
      var q = text.value.trim().toLowerCase();
      var groups = [];
      all.forEach(function (id) {
        if (q && itemName(id).toLowerCase().indexOf(q) < 0) return;
        var n = typeOrder(id);
        (groups[n] = groups[n] || []).push(id);
      });
      if (!groups.length) { box.innerHTML = grid([]); return; }
      box.innerHTML = groups.map(function (ids, n) {
        if (!ids) return "";
        var c = sections[n], shut = !!collapsed[c.id];
        return '<section class="wk-group' + (shut ? " shut" : "") + '" id="items-' + c.id + '">' +
          '<h2 class="wk-group-head"><button type="button" class="wk-collapse" data-id="' + c.id + '" aria-expanded="' + !shut + '">' +
          '<span class="wk-chevron" aria-hidden="true"></span>' + c.label +
          ' <span class="wk-group-count">' + ids.length + "</span></button></h2>" +
          '<div class="wk-group-body">' + grid(ids) + "</div></section>";
      }).join("");
      hydrate(box);
    }
    function jumpTo(sid) {
      if (!box.querySelector("#items-" + sid) && text.value) { text.value = ""; update(); } // hidden by the search
      var el = box.querySelector("#items-" + sid);
      if (!el) return;
      if (collapsed[sid]) { delete collapsed[sid]; update(); el = box.querySelector("#items-" + sid); }
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    text.addEventListener("input", update);
    page.querySelector(".wk-filters").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) jumpTo(b.getAttribute("data-jump"));
    });
    box.addEventListener("click", function (e) {
      var b = e.target.closest(".wk-collapse");
      if (!b) return;
      var sid = b.getAttribute("data-id");
      if (collapsed[sid]) delete collapsed[sid]; else collapsed[sid] = true;
      var sec = b.closest(".wk-group");
      sec.classList.toggle("shut", !!collapsed[sid]);
      b.setAttribute("aria-expanded", !collapsed[sid]);
    });
    update();
    if (jump) jumpTo(jump);
    else scroller.scrollTop = ALL.scroll;
  }

  function notFound() {
    setPage("<h1>Page not found</h1><p>This page doesn't exist (yet). " +
      "<a href=\"#" + DEFAULT + "\">Back to the wiki home</a>.</p>", "Page not found");
  }

  // Where an item page's back button goes: the last page that wasn't an item page
  // (an article or All Items), so stepping between items keeps the same way back.
  var backTo = { slug: "items", title: "All Items" };

  function route() {
    leaveAllItems();
    var slug = decodeURIComponent(location.hash.slice(1)) || DEFAULT;
    if (slug.indexOf("item/") !== 0) {
      var from = findPage(slug);
      backTo = from && slug !== "items" ? { slug: slug, title: from.title } : { slug: "items", title: "All Items" };
    }
    var current = slug.indexOf("item/") === 0 ? null : slug.indexOf("items/") === 0 ? "items" : slug;
    links.querySelectorAll("a").forEach(function (a) {
      var on = a.dataset.slug === current;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");

    if (slug.indexOf("item/") === 0) return showItem(fullId(slug.slice(5)));
    if (slug === "items") return showAllItems();
    if (slug.indexOf("items/") === 0) return showAllItems(slug.slice(6)); // #items/rare jumps to a section
    var info = findPage(slug);
    if (!info) return notFound();
    showArticle(info);
  }

  /* ---------------- search ---------------- */
  var hits = [], sel = 0;
  function runSearch() {
    var q = search.value.trim().toLowerCase();
    hits = [];
    if (q) {
      var score = function (name) { var i = name.toLowerCase().indexOf(q); return i < 0 ? -1 : i === 0 ? 0 : 1; };
      PAGES.forEach(function (g) { g.pages.forEach(function (p) {
        var s = score(p.title); if (s >= 0) hits.push({ s: s, href: "#" + p.slug, html: '<span class="wk-icon none">&#128196;</span><span>' + esc(p.title) + "</span>" });
      }); });
      Object.keys(ITEMS).forEach(function (id) {
        if (id.indexOf(NS + ":") !== 0) return;
        var s = score(ITEMS[id].name);
        if (s >= 0) hits.push({ s: s + 0.5, href: itemHref(id), html: icon(id) + "<span>" + esc(ITEMS[id].name) + "</span>" });
      });
      hits.sort(function (a, b) { return a.s - b.s; });
      hits = hits.slice(0, 10);
    }
    sel = 0;
    drawResults(q);
  }
  function drawResults(q) {
    if (!q) { results.hidden = true; return; }
    results.hidden = false;
    results.innerHTML = hits.length
      ? hits.map(function (h, i) { return '<a href="' + h.href + '"' + (i === sel ? ' class="sel"' : "") + ">" + h.html + "</a>"; }).join("")
      : '<p class="wk-empty">Nothing found</p>';
    hydrate(results);
  }
  function closeSearch() { search.value = ""; results.hidden = true; }
  search.addEventListener("input", runSearch);
  search.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hits.length) return;
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length;
      drawResults(search.value);
    } else if (e.key === "Enter" && hits[sel]) {
      location.hash = hits[sel].href;
      closeSearch(); search.blur();
    } else if (e.key === "Escape") closeSearch();
  });
  results.addEventListener("click", function (e) { if (e.target.closest("a")) closeSearch(); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".wiki-search")) results.hidden = true; });
  search.addEventListener("focus", function () { if (search.value) runSearch(); });

  /* ---------------- start ---------------- */
  // Sidebar
  PAGES.forEach(function (group) {
    if (group.section) { // groups without a section name have no heading
      var h = document.createElement("p");
      h.className = "wiki-section";
      h.textContent = group.section;
      links.appendChild(h);
    }
    group.pages.forEach(function (p) {
      var a = document.createElement("a");
      a.href = "#" + p.slug;
      a.textContent = p.title;
      a.dataset.slug = p.slug;
      links.appendChild(a);
    });
  });

  // Mobile: the "Pages" button opens/closes the list
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  page.classList.add("loading");
  var get = function (f) { return fetch(BASE + "data/" + f).then(function (r) { return r.ok ? r.json() : (f === "recipes.json" ? [] : {}); }).catch(function () { return f === "recipes.json" ? [] : {}; }); };
  Promise.all([get("items.json"), get("recipes.json"), get("tags.json")]).then(function (d) {
    ITEMS = d[0]; RECIPES = d[1]; TAGS = d[2];
    // Index recipes by what they make and what they use
    RECIPES.forEach(function (r) {
      var out = r.result && (r.result.id || r.result.item);
      if (out) (MADE_BY[out] = MADE_BY[out] || []).push(r);
      var used = [];
      (function walk(v, key) {
        if (!v || typeof v !== "object" || key === "result") return;
        if (Array.isArray(v)) return v.forEach(function (x) { walk(x); });
        if (v.item || v.tag) options(v).forEach(function (i) { if (used.indexOf(i) < 0) used.push(i); });
        for (var k in v) if (k !== "item" && k !== "tag") walk(v[k], k);
      })(r);
      // tackle smithing recipes have missingno as their result, so leave them out of "Used to make"
      if (out !== "starcatcher:missingno") used.forEach(function (i) { (USED_IN[i] = USED_IN[i] || []).push(r); });
    });
    window.addEventListener("hashchange", route);
    route();
  });
})();
