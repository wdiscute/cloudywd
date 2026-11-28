/*
 * Starcatcher bubbles
 *
 * Clicking an empty spot of the page background spawns a little pixel
 * bubble that wiggles its way up to the top of the screen and pops.
 * Bubbles always sit behind everything else on the page.
 *
 * Usage: add this right after the header script on a page:
 *   <script src="/mods/starcatcher/bubbles.js"></script>
 */
(function () {
  // 7x7 pixel bubble: X = outline, H = shine, . = see-through inside, space = empty
  var ART = [
    "  XXX  ",
    " X...X ",
    "X.H...X",
    "X.....X",
    "X.....X",
    " X...X ",
    "  XXX  "
  ];
  var COLORS = { "X": "#3f7fb8", "H": "#a9d2f0", ".": "rgba(45,105,170,0.35)" };

  var rects = "";
  ART.forEach(function (row, y) {
    row.split("").forEach(function (ch, x) {
      if (COLORS[ch]) rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + COLORS[ch] + '"/>';
    });
  });
  var SRC = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7" shape-rendering="crispEdges">' + rects + "</svg>"
  );
  var SIZE = 21; // 3 screen pixels per bubble pixel
  var MIN_LIFE = 4;   // seconds a bubble always floats before it can pop
  var POP_RATE = 0.5; // after that, average pops per second (0.5 = about 2s more on average)

  // body becomes its own layer, so the bubble layer (z-index -1) paints
  // right above the page background but below every other element.
  var style = document.createElement("style");
  style.textContent =
    "body{position:relative;z-index:0}" +
    ".sc-bubbles{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}" +
    ".sc-bubbles img{position:absolute;left:0;top:0;width:" + SIZE + "px;height:" + SIZE + "px;" +
    "image-rendering:pixelated;will-change:transform,opacity;user-select:none}";
  document.head.appendChild(style);

  var layer = document.createElement("div");
  layer.className = "sc-bubbles";
  layer.setAttribute("aria-hidden", "true");
  document.body.insertBefore(layer, document.body.firstChild);

  // Things that count as "not background" when clicked.
  var SKIP = "a, button, input, select, textarea, label, summary, img, svg, video, canvas, " +
             "[contenteditable], [role=button], [tabindex]:not(.content), .site";

  function isEmptySpot(el) {
    if (!(el instanceof Element)) return false;
    if (el === document.body || el === document.documentElement) return true;
    if (el.closest(SKIP)) return false;
    // Element with its own text right there? Then it's content, not background.
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return false;
    }
    // Anything with a visible box (panels, cards...) isn't background either.
    var cs = getComputedStyle(el);
    var bg = cs.backgroundColor;
    var clearBg = bg === "transparent" || /rgba\(.*,\s*0\)$/.test(bg);
    return clearBg && cs.backgroundImage === "none";
  }

  var bubbles = [];
  var running = false;

  document.addEventListener("click", function (e) {
    if (e.button !== 0) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed) return; // was selecting text, not clicking
    if (!isEmptySpot(e.target)) return;
    if (popBubbleAt(e.clientX, e.clientY)) return; // tapped a bubble: pop it, no new one
    spawn(e.clientX, e.clientY);
  });

  // Double/triple clicking the background shouldn't start selecting nearby text.
  // (Single click-and-drag selection still works as normal.)
  document.addEventListener("mousedown", function (e) {
    if (e.detail > 1 && isEmptySpot(e.target)) e.preventDefault();
  });

  // Pops the top-most bubble under the point (a few px extra so it's easy to hit on touch).
  function popBubbleAt(x, y) {
    var PAD = 6;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      if (b.popAt !== undefined) continue;
      var r = b.el.getBoundingClientRect();
      if (x >= r.left - PAD && x <= r.right + PAD && y >= r.top - PAD && y <= r.bottom + PAD) {
        b.popAt = b.age;
        return true;
      }
    }
    return false;
  }

  function spawn(x, y, offscreen) {
    var img = document.createElement("img");
    img.src = SRC;
    img.alt = "";
    layer.appendChild(img);
    bubbles.push({
      el: img,
      x: x - SIZE / 2,
      y: y - SIZE / 2,
      speed: 70 + Math.random() * 40,       // px per second upwards
      amp: 5 + Math.random() * 6,           // wiggle width
      freq: 2.5 + Math.random() * 2,        // wiggle speed
      phase: Math.random() * Math.PI * 2,
      age: offscreen ? 0.15 : 0 // offscreen ones skip the pop-in, they just rise into view
    });
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }

  var last = 0;
  function tick(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.age += dt;
      b.y -= b.speed * dt;
      var wx = Math.sin(b.age * b.freq + b.phase) * b.amp;
      // rising snaps to whole bubble pixels like a Minecraft particle; side to side is smooth
      var px = b.x + wx; // smooth side to side
      var py = Math.round(b.y / 3) * 3;
      var pop = b.y < 12 ? Math.max(0, (b.y + SIZE) / (12 + SIZE)) : 1; // fade out at the top
      var grow = b.age < 0.15 ? b.age / 0.15 : 1;                     // little pop-in
      // After MIN_LIFE seconds, a random chance each moment to pop early.
      if (b.popAt === undefined && b.age >= MIN_LIFE && Math.random() < POP_RATE * dt) b.popAt = b.age;
      var popT = b.popAt === undefined ? 0 : (b.age - b.popAt) / 0.12;  // quick burst: swell and vanish
      if (popT > 0) { grow *= 1 + popT * 0.4; pop *= Math.max(0, 1 - popT); }
      b.el.style.transform = "translate(" + px + "px," + py + "px) scale(" + grow + ")";
      b.el.style.opacity = pop;
      if (b.y < -SIZE || popT >= 1) {
        b.el.remove();
        bubbles.splice(i, 1);
      }
    }
    if (bubbles.length) requestAnimationFrame(tick);
    else running = false;
  }

  // Every so often a bubble rises from the bottom of the screen on its own.
  var RANDOM_MIN = 2, RANDOM_MAX = 5; // seconds between random bubbles
  var MIDDLE_SKIP = 0.7; // chance a bubble that lands in the middle 50% moves out to the sides
  function randomX() {
    var p = Math.random();
    if (p > 0.25 && p < 0.75 && Math.random() < MIDDLE_SKIP) {
      // move it to a random spot in the left or right quarter instead
      p = Math.random() * 0.5;
      if (p >= 0.25) p += 0.5;
    }
    return p * window.innerWidth;
  }
  function randomBubble() {
    if (!document.hidden) spawn(randomX(), window.innerHeight + SIZE * 2, true); // well below the bottom edge
    setTimeout(randomBubble, (RANDOM_MIN + Math.random() * (RANDOM_MAX - RANDOM_MIN)) * 1000);
  }
  setTimeout(randomBubble, (RANDOM_MIN + Math.random() * (RANDOM_MAX - RANDOM_MIN)) * 1000);
})();
