/*
 * Draws Minecraft block/item JSON models (Blockbench models) in the browser,
 * the way they look in the inventory. Used for hats, tackle boxes, trophies,
 * vanilla blocks in recipes, etc. (anything with a 3D model in data/models.json).
 *
 *   WikiModels.icon(id)            -> Promise of a PNG data URL (inventory view)
 *
 * three.js is only downloaded the first time a 3D model is needed.
 */
(function () {
  var BASE = "/mods/starcatcher/wiki/data/";
  var THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  var ICON_SIZE = 128;
  var FOLIAGE = [0x48 / 255, 0xb5 / 255, 0x18 / 255]; // default leaf tint (models with tintindex)

  var modelsP, threeP, renderer, scene, camera;
  var textures = {}; // path -> Promise<THREE.Texture>
  var icons = {};    // id -> Promise<dataURL>

  function loadThree() {
    return threeP || (threeP = new Promise(function (ok, fail) {
      if (window.THREE) return ok();
      var s = document.createElement("script");
      s.src = THREE_URL; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    }));
  }
  function loadModels() {
    return modelsP || (modelsP = fetch(BASE + "models.json").then(function (r) { return r.json(); }).catch(function () { return {}; }));
  }
  function loadTexture(rel) {
    return textures[rel] || (textures[rel] = new Promise(function (ok) {
      var img = new Image();
      img.onload = function () {
        var t = new THREE.Texture(img);
        t.magFilter = t.minFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        t.needsUpdate = true;
        t.vScale = img.width / img.height; // animated textures: only use the first frame
        ok(t);
      };
      img.onerror = function () { ok(null); };
      img.src = BASE + "icons/" + rel;
    }));
  }

  /* ---------- geometry ---------- */
  // Corners of each face (top-left, top-right, bottom-right, bottom-left) seen from outside
  function corners(dir, a, b) {
    var x1 = a[0], y1 = a[1], z1 = a[2], x2 = b[0], y2 = b[1], z2 = b[2];
    switch (dir) {
      case "north": return [[x2, y2, z1], [x1, y2, z1], [x1, y1, z1], [x2, y1, z1]];
      case "south": return [[x1, y2, z2], [x2, y2, z2], [x2, y1, z2], [x1, y1, z2]];
      case "east":  return [[x2, y2, z2], [x2, y2, z1], [x2, y1, z1], [x2, y1, z2]];
      case "west":  return [[x1, y2, z1], [x1, y2, z2], [x1, y1, z2], [x1, y1, z1]];
      case "up":    return [[x1, y2, z1], [x2, y2, z1], [x2, y2, z2], [x1, y2, z2]];
      case "down":  return [[x1, y1, z2], [x2, y1, z2], [x2, y1, z1], [x1, y1, z1]];
    }
  }
  // UVs Minecraft uses when a face doesn't give any
  function defaultUv(dir, a, b) {
    switch (dir) {
      case "north": return [16 - b[0], 16 - b[1], 16 - a[0], 16 - a[1]];
      case "south": return [a[0], 16 - b[1], b[0], 16 - a[1]];
      case "east":  return [16 - b[2], 16 - b[1], 16 - a[2], 16 - a[1]];
      case "west":  return [a[2], 16 - b[1], b[2], 16 - a[1]];
      case "up":    return [a[0], a[2], b[0], b[2]];
      case "down":  return [a[0], 16 - b[2], b[0], 16 - a[2]];
    }
  }
  var NORMALS = { north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0], up: [0, 1, 0], down: [0, -1, 0] };

  // Element rotation (one axis, around an origin, optional rescale)
  function rotator(rot) {
    if (!rot || !rot.angle) return function (p) { return p; };
    var ang = rot.angle * Math.PI / 180, c = Math.cos(ang), s = Math.sin(ang), o = rot.origin || [8, 8, 8];
    var k = rot.rescale ? 1 / Math.cos(ang) : 1;
    return function (p) {
      var x = p[0] - o[0], y = p[1] - o[1], z = p[2] - o[2], r;
      if (rot.axis === "x") r = [x * 1, (y * c - z * s) * k, (y * s + z * c) * k];
      else if (rot.axis === "y") r = [(x * c + z * s) * k, y, (-x * s + z * c) * k];
      else r = [(x * c - y * s) * k, (x * s + y * c) * k, z];
      return [r[0] + o[0], r[1] + o[1], r[2] + o[2]];
    };
  }

  function texKey(model, ref) {
    var k = (ref || "").replace(/^#/, ""), n = 0;
    return model.textures[k] ? k : null;
  }

  // Builds a THREE.Group for a model, already posed like the inventory icon
  function build(model) {
    var keys = {};
    model.elements.forEach(function (el) {
      for (var d in el.faces) { var k = texKey(model, el.faces[d].texture); if (k) keys[model.textures[k]] = true; }
    });
    var paths = Object.keys(keys);
    return Promise.all(paths.map(loadTexture)).then(function (texs) {
      var byPath = {};
      paths.forEach(function (p, i) { byPath[p] = texs[i]; });

      // Gather faces per texture
      var buckets = {};
      model.elements.forEach(function (el) {
        var rot = rotator(el.rotation);
        for (var dir in el.faces) {
          var f = el.faces[dir], k = texKey(model, f.texture);
          if (!k || !corners(dir, el.from, el.to)) continue;
          var path = model.textures[k];
          var b = buckets[path] || (buckets[path] = { pos: [], uv: [], col: [], nrm: [] });
          var uv = f.uv || defaultUv(dir, el.from, el.to);
          var uvs = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
          var turn = ((f.rotation || 0) / 90) % 4;
          var cs = corners(dir, el.from, el.to).map(rot);
          var vScale = byPath[path] ? byPath[path].vScale : 1;
          var tint = f.tintindex !== undefined && f.tintindex >= 0 ? FOLIAGE : [1, 1, 1];
          var shade = el.shade !== false && model.shade !== false;
          var n = rot(NORMALS[dir].map(function (v, i) { return v + (el.rotation && el.rotation.origin ? el.rotation.origin[i] : 8); }));
          var o = el.rotation && el.rotation.origin ? el.rotation.origin : [8, 8, 8];
          var normal = [n[0] - o[0], n[1] - o[1], n[2] - o[2]];
          [0, 3, 2, 0, 2, 1].forEach(function (i) { // two triangles: TL BL BR, TL BR TR
            var p = cs[i], t = uvs[(i - turn + 4) % 4];
            b.pos.push(p[0] - 8, p[1] - 8, p[2] - 8);
            b.uv.push(t[0] / 16, 1 - (t[1] / 16) * vScale);
            b.col.push(tint[0], tint[1], tint[2]);
            b.nrm.push(normal[0], normal[1], normal[2], shade ? 1 : 0);
          });
        }
      });

      // Inventory pose: translate, rotate (X then Y then Z), scale
      var gui = model.gui || {};
      var r = gui.rotation || [30, 225, 0], t = gui.translation || [0, 0, 0], s = gui.scale || [0.625, 0.625, 0.625];
      var pose = new THREE.Group();
      pose.position.set(t[0], t[1], t[2]);
      pose.rotation.set(r[0] * Math.PI / 180, r[1] * Math.PI / 180, r[2] * Math.PI / 180, "XYZ");
      pose.scale.set(s[0], s[1], s[2]);
      var group = new THREE.Group();
      group.add(pose);

      for (var path in buckets) {
        var bk = buckets[path], g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(bk.pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(bk.uv, 2));
        g.setAttribute("color", new THREE.Float32BufferAttribute(bk.col.slice(), 3));
        g.userData = { tint: bk.col, nrm: bk.nrm };
        var mat = new THREE.MeshBasicMaterial({ map: byPath[path], vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide });
        pose.add(new THREE.Mesh(g, mat));
      }
      return group;
    });
  }

  // Minecraft-like inventory lighting: top brightest, left side lighter than right.
  function relight(group) {
    group.updateMatrixWorld(true);
    var v = new THREE.Vector3();
    group.traverse(function (m) {
      if (!m.isMesh) return;
      var nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
      var d = m.geometry.userData, col = m.geometry.attributes.color;
      for (var i = 0; i < col.count; i++) {
        var b = 1;
        if (d.nrm[i * 4 + 3]) {
          v.set(d.nrm[i * 4], d.nrm[i * 4 + 1], d.nrm[i * 4 + 2]).applyMatrix3(nm).normalize();
          b = Math.min(1, Math.max(0.35, 0.72 + 0.3 * v.y - 0.12 * v.x + 0.05 * v.z));
        }
        col.setXYZ(i, d.tint[i * 3] * b, d.tint[i * 3 + 1] * b, d.tint[i * 3 + 2] * b);
      }
      col.needsUpdate = true;
    });
  }

  function makeCamera() {
    var c = new THREE.OrthographicCamera(-8, 8, 8, -8, -100, 100);
    c.position.set(0, 0, 50);
    return c;
  }
  function setup() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true });
    renderer.setSize(ICON_SIZE, ICON_SIZE, false);
    renderer.setClearColor(0x000000, 0);
    camera = makeCamera();
    scene = new THREE.Scene();
  }

  function withModel(id) {
    return Promise.all([loadModels(), loadThree()]).then(function (r) {
      var m = r[0][id];
      if (!m) throw new Error("no model");
      return build(m);
    });
  }

  // Renders one item to a PNG (cached per item)
  var queue = Promise.resolve();
  function icon(id) {
    if (icons[id]) return icons[id];
    return (icons[id] = withModel(id).then(function (group) {
      // Render one at a time with the shared renderer
      return (queue = queue.then(function () {
        setup();
        relight(group);
        scene.add(group);
        renderer.render(scene, camera);
        var url = renderer.domElement.toDataURL("image/png");
        scene.remove(group);
        return url;
      }));
    }));
  }

  window.WikiModels = { icon: icon };
})();
