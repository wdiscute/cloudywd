/*
 * Starcatcher ocean floor
 *
 * Kelp and seagrass along the bottom of the screen, behind everything else.
 * Kelp grows one segment every 80-120 seconds while you're on a Starcatcher page.
 * Progress carries over between pages, and starts over if you've been away
 * for more than 10 minutes.
 *
 * Textures (Minecraft block textures, file names unchanged) go in
 * /mods/starcatcher/ocean/ :
 *   kelp.png, kelp_plant.png, seagrass.png,
 *   tall_seagrass_bottom.png, tall_seagrass_top.png
 * Animated strips (16 wide, 16 x frames tall) play automatically. If a
 * matching .png.mcmeta is in the folder too, its frametime sets the speed.
 * Until a texture exists, a plain coloured block is shown instead.
 *
 * Usage: add this right after the bubbles script on a page:
 *   <script src="/mods/starcatcher/ocean.js"></script>
 */
(function () {
  var DIR = "/mods/starcatcher/ocean/";
  var PX = 2;                       // screen pixels per texture pixel
  var S = 16 * PX;                  // size of one block on screen
  var GROW_MIN = 80, GROW_MAX = 120; // seconds per kelp segment
  var RESET_AFTER = 10 * 60 * 1000; // away longer than this = start over
  var KEY = "sc-ocean";

  // color = placeholder shown while the texture is missing
  var TEX = {
    kelp:       { file: "kelp.png",                 color: "#5aa83f" },
    kelpPlant:  { file: "kelp_plant.png",           color: "#2f6e2a" },
    seagrass:   { file: "seagrass.png",             color: "#4c9c3c" },
    tallBottom: { file: "tall_seagrass_bottom.png", color: "#3a8434" },
    tallTop:    { file: "tall_seagrass_top.png",    color: "#55aa45" }
  };

  // ---- Saved progress ----------------------------------------------------

  var state = load();
  var now = Date.now();
  if (!state || now - state.last > RESET_AFTER) state = fresh();
  state.last = now;
  save();

  function fresh() {
    return { seed: Math.floor(Math.random() * 1e9), elapsed: 0, last: Date.now() };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s.seed === "number" && typeof s.elapsed === "number" && typeof s.last === "number") return s;
    } catch (e) {}
    return null;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- Styles and layer --------------------------------------------------

  var style = document.createElement("style");
  style.textContent =
    "body{position:relative;z-index:0}" +
    ".sc-ocean{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}" +
    ".sc-plant{position:absolute;bottom:0;width:" + S + "px;display:flex;flex-direction:column}" +
    ".sc-block{width:" + S + "px;height:" + S + "px;flex:none;image-rendering:pixelated;background-repeat:no-repeat}" +
    // See-through link buttons blur the kelp and bubbles behind them.
    ".btn:not(.main){-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}";
  document.head.appendChild(style);

  var layer = document.createElement("div");
  layer.className = "sc-ocean";
  layer.setAttribute("aria-hidden", "true");
  // First child of body, so it sits under the bubbles too.
  document.body.insertBefore(layer, document.body.firstChild);

  // ---- Textures ----------------------------------------------------------

  var TEX_KEY = "sc-ocean-tex";
  var texCache = {};
  try { texCache = JSON.parse(localStorage.getItem(TEX_KEY)) || {}; } catch (e) {}

  Object.keys(TEX).forEach(function (name) {
    var t = TEX[name];
    t.cls = "sc-t-" + name;
    // Show the texture straight away (its first frame) instead of waiting for it to load.
    addCss("." + t.cls + "{background-image:url(" + DIR + t.file + ");background-size:" + S + "px auto}");
    // Frame count and speed remembered from an earlier page, so it animates right away too.
    var known = texCache[name];
    if (known) animate(name, t, known.frames, known.ticks);

    var img = new Image();
    img.onload = function () {
      var frames = Math.max(1, Math.round(img.naturalHeight / img.naturalWidth));
      readFrametime(t.file, function (ticks) {
        if (known && known.frames === frames && known.ticks === ticks) return;
        texCache[name] = { frames: frames, ticks: ticks };
        try { localStorage.setItem(TEX_KEY, JSON.stringify(texCache)); } catch (e) {}
        animate(name, t, frames, ticks);
      });
    };
    img.onerror = function () {
      addCss("." + t.cls + "{background-color:" + t.color + ";box-shadow:inset 0 -2px rgba(0,0,0,.25)}");
    };
    img.src = DIR + t.file;
  });

  function animate(name, t, frames, ticks) {
    if (frames < 2) return;
    t.dur = frames * ticks / 20; // Minecraft runs 20 ticks per second
    addCss("." + t.cls + "{animation:sc-a-" + name + " " + t.dur + "s steps(" + frames + ") infinite}" +
           "@keyframes sc-a-" + name + "{from{background-position:0 0}" +
           "to{background-position:0 -" + (frames * S) + "px}}");
    layer.querySelectorAll("." + t.cls).forEach(function (el) { syncAnim(el, t); });
  }

  function readFrametime(file, done) {
    fetch(DIR + file + ".mcmeta")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        var ft = m && m.animation && m.animation.frametime;
        done(ft > 0 ? ft : 1);
      })
      .catch(function () { done(1); });
  }

  function addCss(css) {
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  // Every copy of a texture shows the same frame at the same time, like in game.
  function syncAnim(el, t) {
    if (t.dur) el.style.animationDelay = -((performance.now() / 1000) % t.dur) + "s";
  }

  function block(t) {
    var el = document.createElement("div");
    el.className = "sc-block " + t.cls;
    syncAnim(el, t);
    return el;
  }

  // ---- Layout ------------------------------------------------------------

  var kelps = [];

  // Small seeded random generator, so the same plants show up on every page.
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build() {
    layer.innerHTML = "";
    kelps = [];
    var rand = seeded(state.seed);
    var spots = Math.max(4, Math.round(window.innerWidth / 48));

    for (var i = 0; i < spots; i++) {
      // always take the same number of random values per spot
      var a = rand(), b = rand(), c = rand(), d = rand(), e = rand(), f = rand(), g = rand(), h = rand();
      var plant = document.createElement("div");
      plant.className = "sc-plant";
      plant.style.left = "calc(" + ((i + 0.2 + a * 0.6) / spots * 100) + "% - " + (S / 2) + "px)";

      if (b < 0.45) {
        // distance: further kelp is smaller, more see-through, and sits behind the rest
        var scale = 0.6 + h * 0.4;
        plant.style.transform = "scale(" + scale + ")";
        plant.style.transformOrigin = "bottom center";
        plant.style.opacity = 0.45 + h * 0.55;
        plant.style.zIndex = Math.round((scale - 1) * 100);
        // max height: 65-95% of window height (counted in this kelp's smaller blocks)
        var max = Math.max(1, Math.round(window.innerHeight * (0.65 + g * 0.3) / (S * scale)));
        var start = Math.min(max, e < 0.5 ? 1 + Math.floor(f * 4) : 1); // about half start 1-4 tall
        var k = {
          el: plant,
          interval: GROW_MIN + c * (GROW_MAX - GROW_MIN),
          offset: d * GROW_MIN,
          start: start,
          max: max,
          stems: 0
        };
        plant.appendChild(block(TEX.kelp));
        kelps.push(k);
      } else if (b < 0.75) {
        plant.appendChild(block(TEX.seagrass));
      } else if (b < 0.9) {
        plant.appendChild(block(TEX.tallTop));
        plant.appendChild(block(TEX.tallBottom));
      } else {
        continue; // leave a gap
      }
      layer.appendChild(plant);
    }
    grow();
  }

  function grow() {
    kelps.forEach(function (k) {
      var segments = Math.min(k.max, k.start + Math.floor((state.elapsed + k.offset) / k.interval));
      var stems = segments - 1;
      while (k.stems < stems) { k.el.appendChild(block(TEX.kelpPlant)); k.stems++; }
      while (k.stems > stems) { k.el.lastChild.remove(); k.stems--; }
    });
  }

  // ---- Time tracking -----------------------------------------------------

  function tick() {
    if (document.hidden) return;
    var t = Date.now();
    if (t - state.last > RESET_AFTER) {
      state = fresh();
      build();
    } else {
      state.elapsed += Math.min(t - state.last, 5000) / 1000;
      state.last = t;
      grow();
    }
    save();
  }

  setInterval(tick, 1000);
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("pagehide", save);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  });

  build();
})();
