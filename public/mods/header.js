/*
 * cloudywd.dev – shared mods header
 *
 * Usage: put this as the FIRST thing inside <body> on every mod page:
 *   <script src="/mods/header.js"></script>
 *
 * To add, remove or reorder mods, edit the MODS list below. Every page updates.
 * The current page is highlighted automatically from its URL (/mods/starcatcher.html and /mods/starcatcher both match).
 * (Optional) force it: <script src="/mods/header.js" data-current="/mods/starcatcher.html"></script>
 */
(function () {
  var MODS = [
    { name: "Starcatcher",           href: "/mods/starcatcher.html" },
    { name: "Starcatcher Lite",      href: "/mods/starcatcher-lite.html" },
    { name: "Starcatcher's Delight", href: "/mods/starcatchers-delight.html" },
    { name: "Timeless Echoes",       href: "/mods/timeless-echoes.html" },
    { name: "wd's Selling Bin",      href: "/mods/wds-selling-bin.html" },
    { name: "Artisan Machines",      href: "/mods/artisan-machines.html" },
    { name: "Fancy Tab Sections",    href: "/mods/fancy-tab-sections.html" },
    { name: "LibTooltips",           href: "/mods/libtooltips.html" },
    { name: "Laicaps",               href: "/mods/laicaps.html" }
  ];

  var CSS = `
.site{--focus:#7cc4ff;--accent:#e8f4ff;font-family:inherit}
.site{border-bottom:1px solid rgba(190,220,255,.18);background:rgba(6,22,40,.45);backdrop-filter:blur(8px)}
.site .in{max-width:1200px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:nowrap}
.site .root{font-weight:700;font-size:1.2rem;color:#fff;text-decoration:none}
.site .root:hover{color:#bfe0ff}
.site .sep{color:rgba(190,220,255,.4);font-weight:300;font-size:1.4rem;line-height:1}
.site .area{font-size:.95rem;font-weight:500;color:#a9c3de}
.site nav{display:flex;flex:1 1 0;min-width:0;margin-left:32px;justify-content:flex-end;flex-wrap:wrap;gap:6px 22px}
.js .site nav{flex-wrap:nowrap}
.site nav a{position:relative;white-space:nowrap;padding:6px 0;font-size:.95rem;font-weight:500;color:#a9c3de;text-decoration:none;transition:color .15s}
.site nav a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;border-radius:2px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .18s}
.site nav a:hover{color:#fff}
.site nav a:hover::after,.site nav a:focus-visible::after{transform:scaleX(1)}
.site nav a[aria-current="page"]{color:var(--focus);font-weight:600}
.site nav a[aria-current="page"]::before{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;border-radius:2px;background:var(--focus)}
.site nav a[aria-current="page"]::after{background:#fff}
.site nav a[aria-current="page"]:hover{color:#fff}
.site .more{position:relative;flex:none}
.site .more .trig{display:inline-block;cursor:default;padding-right:16px}
.site .more .trig::before{content:"";position:absolute;right:2px;top:50%;width:5px;height:5px;margin-top:-5px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg)}
.site .more:hover .trig,.site .more:focus-within .trig{color:#fff}
.site .more:hover .trig::after,.site .more:focus-within .trig::after{transform:scaleX(1)}
.site .menu{display:none;position:absolute;right:0;top:100%;padding-top:10px;z-index:20}
.site .more:hover .menu,.site .more:focus-within .menu{display:block}
.site .menu-in{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:16px 20px;min-width:190px;background:rgba(7,24,44,.97);border:1px solid rgba(190,220,255,.22);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.4)}
`;

  var script = document.currentScript;
  var forced = script && script.getAttribute("data-current");
  function norm(p) { return p.replace(/\/$/, "").replace(/\.html$/, ""); }
  var path = norm(location.pathname);

  function isCurrent(m) {
    return norm(m.href) === (forced ? norm(forced) : path);
  }

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  document.documentElement.classList.add("js");

  var header = document.createElement("header");
  header.className = "site";
  header.innerHTML =
    '<div class="in">' +
      '<a class="root" href="/">cloudywd</a>' +
      '<span class="sep" aria-hidden="true">|</span>' +
      '<span class="area">Mods</span>' +
      '<nav id="modnav" aria-label="Mods">' +
        MODS.map(function (m) {
          return '<a href="' + m.href + '"' + (isCurrent(m) ? ' aria-current="page"' : "") + ">" + m.name + "</a>";
        }).join("") +
        '<div class="more" hidden>' +
          '<a class="trig" tabindex="0" role="button" aria-haspopup="true">More</a>' +
          '<div class="menu"><div class="menu-in"></div></div>' +
        "</div>" +
      "</nav>" +
    "</div>";
  document.body.insertBefore(header, document.body.firstChild);

  /* fit as many links as possible, put the rest in the "More" hover menu */
  var nav = header.querySelector("#modnav"),
      more = nav.querySelector(".more"),
      menu = more.querySelector(".menu-in");
  var links = [].slice.call(nav.querySelectorAll(":scope > a"));
  var clones = links.map(function (a) {
    var c = a.cloneNode(true);
    c.hidden = true;
    menu.appendChild(c);
    return c;
  });
  var gap = 22, w = [], moreW = 0;

  function measure() {
    links.forEach(function (l) { l.hidden = false; });
    more.hidden = false;
    w = links.map(function (l) { return l.offsetWidth; });
    moreW = more.offsetWidth;
    more.hidden = true;
  }
  function layout() {
    var avail = nav.clientWidth, n = links.length, k = n;
    var total = w.reduce(function (a, b) { return a + b; }, 0) + gap * (n - 1);
    if (total > avail) {
      k = 1;
      var used = w[0];
      for (var i = 1; i < n; i++) {
        used += gap + w[i];
        if (used + gap + moreW <= avail) k = i + 1; else break;
      }
    }
    links.forEach(function (l, i) { l.hidden = i >= k; clones[i].hidden = i < k; });
    more.hidden = k >= n;
  }
  function init() { measure(); layout(); }

  init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(nav);
  else window.addEventListener("resize", layout);
})();
