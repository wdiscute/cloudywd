/*
 * Starcatcher light rays
 *
 * Soft beams of sunlight seeping down from the water's surface at the top of
 * the screen. They slowly sway and shimmer, and fade out before reaching the
 * ocean floor. Sits behind everything else, including the kelp and bubbles.
 *
 * Usage: add this right after the ocean script on a page:
 *   <script src="/mods/starcatcher/light.js"></script>
 */
(function () {
  var RAYS = 9;     // how many beams
  var TILT = 14;    // degrees the light leans (sun off to one side)

  var style = document.createElement("style");
  style.textContent =
    "body{position:relative;z-index:0}" +
    ".sc-light{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;" +
    "-webkit-mask-image:linear-gradient(to bottom,#000 0,rgba(0,0,0,.6) 35%,transparent 80%);" +
    "mask-image:linear-gradient(to bottom,#000 0,rgba(0,0,0,.6) 35%,transparent 80%)}" +
    // faint band right at the surface
    ".sc-surface{position:absolute;left:0;right:0;top:0;height:90px;" +
    "background:linear-gradient(to bottom,rgba(190,225,255,.12),transparent);" +
    "animation:sc-surface 14s ease-in-out infinite alternate}" +
    "@keyframes sc-surface{from{opacity:.6}to{opacity:1}}" +
    ".sc-ray{position:absolute;top:-10vh;height:130vh;transform-origin:top center;" +
    "background:linear-gradient(to bottom,rgba(200,232,255,.22),rgba(170,215,255,.06) 50%,transparent);" +
    "filter:blur(10px);mix-blend-mode:screen;" +
    "animation-name:sc-sway,sc-shimmer;animation-timing-function:ease-in-out;" +
    "animation-iteration-count:infinite;animation-direction:alternate}" +
    // the angle stays fixed; rays only drift side to side
    "@keyframes sc-sway{from{transform:rotate(var(--a)) translateX(-30px)}" +
    "to{transform:rotate(var(--a)) translateX(30px)}}" +
    "@keyframes sc-shimmer{0%{opacity:var(--o)}50%{opacity:calc(var(--o) * .15)}100%{opacity:var(--o)}}" +
    "@media (prefers-reduced-motion:reduce){.sc-ray,.sc-surface{animation:none}" +
    ".sc-ray{transform:rotate(var(--a));opacity:var(--o)}}";
  document.head.appendChild(style);

  var layer = document.createElement("div");
  layer.className = "sc-light";
  layer.setAttribute("aria-hidden", "true");

  var surface = document.createElement("div");
  surface.className = "sc-surface";
  layer.appendChild(surface);

  for (var i = 0; i < RAYS; i++) {
    var ray = document.createElement("div");
    ray.className = "sc-ray";
    // spread across the width (a bit past the edges since they lean)
    var left = -10 + (i + Math.random() * 0.8) / RAYS * 115;
    ray.style.left = left + "%";
    ray.style.width = (30 + Math.random() * 90) + "px";
    ray.style.setProperty("--a", TILT + "deg");
    ray.style.setProperty("--o", (0.4 + Math.random() * 0.6).toFixed(2));
    ray.style.animationDuration = (25 + Math.random() * 20) + "s," + (15 + Math.random() * 15) + "s";
    ray.style.animationDelay = (-Math.random() * 45) + "s," + (-Math.random() * 30) + "s";
    layer.appendChild(ray);
  }

  // First child of body, so it sits under the kelp and bubbles.
  document.body.insertBefore(layer, document.body.firstChild);
})();
