import React, { useEffect, useRef, useState } from 'react';
  import * as THREE from 'three';

// Edita aquí tus proyectos. "image" es opcional, va en public/img (ej. '/img/plantita.jpg').
const PROJECTS = [
  {
    name: 'GUIA INFORMATIVA', mana: ['U', 'G'], color: '#ae8705', stats: 'R6',
    type: 'Criatura Legendaria — RAINBOW SIX|GUIDE',
    text: 'Pagina web informativa para nuevos jugadores en Rainbow Six',
    image: '/img/R6.png'
  },
  {
    name: 'POKEDEX', mana: ['G', 'U'], color: '#0336b7', stats: 'POKE',
    type: 'Artefacto — ¿Quién es ese Pokémon?',
    text: 'Ejercio de Pokedex usando bootstrap y una API de Pokemons',
    image: '/img/Pokedex.png'
  },
  {
    name: 'Maquetado de sistema de citas', mana: ['U', 'B'], color: '#38f858', stats: 'Tinder2',
    type: 'Encantamiento — Tinder2',
    text: 'Aplicacion hecha con archivos .FXML y JavaFx',
    image: '/img/Tinder2.png'
  },
  {
    name: 'Mini DBeaver', mana: ['R', 'W'], color: '#c81d1d', stats: 'Dbeaver',
    type: 'Encantamiento — Mini DBeaver',
    text: 'Aplicacion similar a DBeaver creada desde cero con funciones de conexion con SSH',
    image: '/img/MiniDB.png'
  },
  {
    name: 'Escapa del SaT', mana: ['R', 'U'], color: '#c20bf5', stats: 'SaT',
    type: 'Instantáneo — Escapa del SaT',
    text: 'Juego de navegador hecho en funcionalidades en JavaScript',
    image: '/img/SaT.png'
  }
];
const N = PROJECTS.length;

// Cartas sueltas sobre la mesa (imágenes en public/img).
// x, z = posición en el tapete, rot = giro en radianes
const TABLE_CARDS = [
  { image: '/img/Kardur.png', x: -3.4, z: 0.6, rot: 0.35 },
  { image: '/img/Solring.png', x: 3.6, z: 0.1, rot: -0.28 },
  { image: '/img/Venom.png', x: 0.3, z: 2.7, rot: 0.08 }
];

const VIEWS = {
  closed: { theta: 0.22, phi: 1.06, radius: 7.4, look: [0, 1.45, 0] },
  open: { theta: 0, phi: 1.4, radius: 4.6, look: [-0.35, 5.2, 2.0] }
};

// ---------- Texturas ----------
const rand = (a, b) => a + Math.random() * (b - a);

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

function makeTexture(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
  return t;
}

function grain(base, amp) {
  return (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = base + Math.random() * amp;
      img.data.set([v, v, v + 2, 255], i * 4);
    }
    g.putImageData(img, 0, 0);
  };
}

const leatherTex = () => makeTexture(makeCanvas(256, 256, grain(14, 16)), 3);

const woodTex = () =>
  makeTexture(
    makeCanvas(512, 512, (g, w, h) => {
      g.fillStyle = '#1b130e';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 350; i++) {
        g.strokeStyle = `rgba(${rand(55, 85)},${rand(38, 55)},${rand(28, 40)},0.28)`;
        g.lineWidth = rand(1, 3);
        const y = rand(0, h);
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + rand(-12, 12), w * 0.6, y + rand(-12, 12), w, y + rand(-6, 6));
        g.stroke();
      }
    }),
    2
  );

const playmatTex = () =>
  makeTexture(
    makeCanvas(1024, 640, (g, w, h) => {
      const bg = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.6);
      bg.addColorStop(0, '#2b3646');
      bg.addColorStop(1, '#10141c');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.3)';
      g.lineWidth = 1;
      for (let x = 0; x < w; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(212,175,55,0.2)';
      g.lineWidth = 2;
      g.strokeRect(24, 24, w - 48, h - 48);
      g.beginPath(); g.arc(w / 2, h / 2, 165, 0, Math.PI * 2); g.stroke();
    })
  );

function dieTexture(base) {
  return makeTexture(
    makeCanvas(256, 256, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d4af37';
      g.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        g.beginPath();
        g.moveTo(rand(0, w), rand(0, h));
        g.bezierCurveTo(rand(0, w), rand(0, h), rand(0, w), rand(0, h), rand(0, w), rand(0, h));
        g.stroke();
      }
    })
  );
}

const MANA = { W: '#ffd500', U: '#0a8fd6', B: '#000000', R: '#d00808', G: '#06b744' };

function wrap(g, text, x, y, maxW, lh) {
  let line = '';
  text.split(' ').forEach((word) => {
    if (g.measureText(line + word).width > maxW && line) {
      g.fillText(line.trim(), x, y);
      line = '';
      y += lh;
    }
    line += word + ' ';
  });
  g.fillText(line.trim(), x, y);
}

function cardTexture(p, i) {
  const w = 1024, h = 1430;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const panel = (x, y, pw, ph, r, fill) => {
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect(x, y, pw, ph, r);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#7c5d18';
    g.stroke();
  };

  const paint = (img) => {
    g.fillStyle = '#0b0c0e';
    g.fillRect(0, 0, w, h);
    panel(38, 38, w - 76, h - 76, 32, '#d9b45a');

    // título y maná
    panel(62, 62, w - 124, 78, 16, '#f5f1e6');
    g.fillStyle = '#111318';
    g.font = 'bold 42px Georgia, serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(p.name, 86, 102);
    p.mana.forEach((m, k) => {
      const x = w - 98 - (p.mana.length - 1 - k) * 48;
      g.fillStyle = MANA[m];
      g.beginPath(); g.arc(x, 101, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111318';
      g.font = 'bold 24px Georgia, serif';
      g.textAlign = 'center';
      g.fillText(m, x, 102);
    });

    // arte
    const ax = 68, ay = 152, aw = w - 136, ah = 610;
    g.save();
    g.beginPath();
    g.rect(ax, ay, aw, ah);
    g.clip();
    if (img) {
      const s = Math.max(aw / img.width, ah / img.height);
      g.drawImage(img, (img.width - aw / s) / 2, (img.height - ah / s) / 2, aw / s, ah / s, ax, ay, aw, ah);
    } else {
      const cx = ax + aw / 2, cy = ay + ah / 2;
      g.fillStyle = '#0d1220';
      g.fillRect(ax, ay, aw, ah);
      const glow = g.createRadialGradient(cx, cy, 10, cx, cy, aw * 0.5);
      glow.addColorStop(0, p.color + 'aa');
      glow.addColorStop(1, 'transparent');
      g.fillStyle = glow;
      g.fillRect(ax, ay, aw, ah);
      g.strokeStyle = p.color;
      g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, 155, 0, Math.PI * 2); g.stroke();
      g.fillStyle = p.color;
      g.beginPath();
      g.moveTo(cx, cy - 70); g.lineTo(cx + 50, cy); g.lineTo(cx, cy + 70); g.lineTo(cx - 50, cy);
      g.fill();
    }
    g.restore();
    g.lineWidth = 5;
    g.strokeStyle = '#5c4310';
    g.strokeRect(ax, ay, aw, ah);

    // tipo
    panel(62, 774, w - 124, 68, 14, '#f5f1e6');
    g.fillStyle = '#14161d';
    g.font = 'bold 30px Georgia, serif';
    g.textAlign = 'left';
    g.fillText(p.type, 84, 809);

    // texto
    panel(68, 854, w - 136, 445, 12, '#faf7ef');
    g.fillStyle = '#18181b';
    g.font = '40px Georgia, serif';
    g.textBaseline = 'alphabetic';
    wrap(g, p.text, 94, 916, w - 188, 54);

    // pie
    panel(w - 280, 1272, 214, 68, 16, '#f5f1e6');
    g.fillStyle = '#111318';
    g.font = 'bold 32px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(p.stats, w - 173, 1316);
    g.fillStyle = '#e5e7eb';
    g.font = 'bold 21px monospace';
    g.textAlign = 'left';
    g.fillText(`${String(i + 1).padStart(3, '0')}/${String(N).padStart(3, '0')}`, 68, 1368);
    tex.needsUpdate = true;
  };

  paint(null);
  if (p.image) {
    const img = new Image();
    img.onload = () => paint(img);
    img.src = p.image;
  }
  return tex;
}

function cardBackTexture() {
  return makeTexture(
    makeCanvas(512, 715, (g, w, h) => {
      g.fillStyle = '#2e1c10';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#b47b44';
      g.lineWidth = 6;
      g.strokeRect(32, 32, w - 64, h - 64);
      g.fillStyle = '#1e293b';
      g.beginPath(); g.ellipse(w / 2, h / 2, 145, 225, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d4af37';
      g.stroke();
    })
  );
}

// ---------- Componente ----------
export default function App() {
  const mountRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const ui = useRef({ open: false, sel: 0 });
  const view = useRef({ cur: { ...VIEWS.closed, look: new THREE.Vector3(...VIEWS.closed.look) }, tgt: { ...VIEWS.closed, look: new THREE.Vector3(...VIEWS.closed.look) } });
  const setters = useRef({});
  setters.current = { setIsOpen, setSel };

  const current = PROJECTS[sel];

  const goTo = (v) => {
    const t = view.current.tgt;
    Object.assign(t, { theta: v.theta, phi: v.phi, radius: v.radius });
    t.look.set(...v.look);
  };

  useEffect(() => {
    ui.current = { open: isOpen, sel };
    goTo(isOpen ? VIEWS.open : VIEWS.closed);
  }, [isOpen, sel]);

  useEffect(() => {
    const box = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(box.clientWidth, box.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    box.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a0f);
    scene.fog = new THREE.FogExp2(0x080a0f, 0.03);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x090b10);
    [[0xfff8eb, 18, 12, 0, 10, 2], [0xffd28a, 10, 8, 11, 4, 5], [0x6ea8ff, 10, 8, -11, 5, -4], [0xdbeafe, 14, 3, 0, 3.5, 12]]
      .forEach(([color, pw, ph, x, y, z]) => {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
        panel.position.set(x, y, z);
        panel.lookAt(0, 0, 0);
        envScene.add(panel);
      });
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.035).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, box.clientWidth / box.clientHeight, 0.1, 100);

    // adapta el campo de visión: en pantallas verticales (celular) se abre para que quepa la escena
    const fit = () => {
      const a = box.clientWidth / box.clientHeight;
      camera.aspect = a;
      camera.fov = a < 1.3
        ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * 1.3 / a))
        : 40;
      camera.updateProjectionMatrix();
    };
    fit();

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x181412, 0.45));
    const key = new THREE.DirectionalLight(0xfff4e0, 2.1);
    key.position.set(5.5, 9.5, 6.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -6.5, right: 6.5, top: 6.5, bottom: -6.5, near: 2, far: 25 });
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x60a5fa, 0.95);
    rim.position.set(-6, 5.5, -5.5);
    scene.add(rim);
    const fill = new THREE.PointLight(0xfef3c7, 1.1, 12);
    fill.position.set(0.8, 2.4, 4.6);
    scene.add(fill);

    const add = (geo, mat, x, y, z, parent = scene) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const cube = (w, h, d) => new THREE.BoxGeometry(w, h, d);

    // mesa y tapete
    const wood = woodTex();
    add(new THREE.CylinderGeometry(9, 9, 0.4, 64), new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 2, roughness: 0.72 }), 0, -0.24, 0);
    const mat = playmatTex();
    add(cube(11.6, 0.04, 7.2), new THREE.MeshStandardMaterial({ map: mat, bumpMap: mat, bumpScale: 1, roughness: 0.88 }), 0, -0.02, 0.35);

    // caja de cuero
    const lt = leatherTex();
    const leather = new THREE.MeshStandardMaterial({ map: lt, bumpMap: lt, bumpScale: 2, roughness: 0.8, envMapIntensity: 0.9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.9 });
    const W = 2.58, H = 3.36, D = 2.24, T = 0.14, Y0 = 0.02;
    const winW = 1.88, winH = 2.62, cy = Y0 + H / 2, fz = D / 2 - T / 2;
    const pillar = (W - winW) / 2, band = (H - winH) / 2;

    const body = new THREE.Group();
    scene.add(body);
    add(cube(W, T, D), leather, 0, Y0 + T / 2, 0, body);
    add(cube(W, H, T), leather, 0, cy, -D / 2 + T / 2, body);
    add(cube(T, H, D - T), leather, -W / 2 + T / 2, cy, T / 2, body);
    add(cube(T, H, D - T), leather, W / 2 - T / 2, cy, T / 2, body);
    add(cube(W, band, T), leather, 0, Y0 + band / 2, fz, body);
    add(cube(W, band, T), leather, 0, Y0 + H - band / 2, fz, body);
    add(cube(pillar, winH, T), leather, -W / 2 + pillar / 2, cy, fz, body);
    add(cube(pillar, winH, T), leather, W / 2 - pillar / 2, cy, fz, body);
    [[winW + 0.09, 0.045, 0, winH / 2], [winW + 0.09, 0.045, 0, -winH / 2], [0.045, winH, -winW / 2, 0], [0.045, winH, winW / 2, 0]]
      .forEach(([bw, bh, x, y]) => add(cube(bw, bh, 0.03), gold, x, cy + y, D / 2 + 0.005, body));

    // tapa
    const lid = new THREE.Group();
    lid.position.set(0, Y0 + H, -D / 2);
    scene.add(lid);
    const lidW = W + 0.08, lidD = D + 0.14;
    add(cube(lidW, 0.16, lidD), leather, 0, 0.08, lidD / 2 - 0.02, lid);
    add(cube(lidW, 0.36, 0.12), leather, 0, -0.02, lidD - 0.08, lid);
    add(cube(lidW * 0.65, 0.035, 0.02), gold, 0, -0.14, lidD - 0.015, lid);

    // cartas
    const edge = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.6 });
    const back = new THREE.MeshPhysicalMaterial({ map: cardBackTexture(), roughness: 0.35, clearcoat: 0.65 });
    const CH = 2.52;
    const cardGeo = cube(1.8, CH, 0.014);
    const cards = PROJECTS.map((p, i) => {
      const front = new THREE.MeshPhysicalMaterial({ map: cardTexture(p, i), roughness: 0.5, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2 });
      front.emissive.set(0xffffff);
      front.emissiveMap = front.map;
      front.emissiveIntensity = 0.3;
      const m = add(cardGeo, [edge, edge, edge, edge, front, back], 0, cy, 0, scene);
      m.userData = { index: i, sel: i === 0 ? 1 : 0 };
      return m;
    });

    // dados
    [[0x1a2030, '#141a28', 2.35, 1.35, [0.4, 0.7, 0.2]], [0x44121c, '#44121c', -2.25, 1.65, [1.1, 0.3, 0.8]]].forEach(([, base, x, z, r]) => {
      const die = add(
        new THREE.IcosahedronGeometry(0.32, 0),
        new THREE.MeshPhysicalMaterial({ map: dieTexture(base), roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.5 }),
        x, 0.26, z
      );
      die.rotation.set(...r);
    });

    // cartas reales sobre la mesa
    const loader = new THREE.TextureLoader();
    const tableGeo = cube(1.8, 2.52, 0.014);
    TABLE_CARDS.forEach(({ image, x, z, rot }) => {
      const tex = loader.load(image);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.25 });
      const m = add(tableGeo, [edge, edge, edge, edge, face, back], x, 0.01, z);
      m.rotation.set(-Math.PI / 2, 0, rot); // acostada, frente hacia arriba
    });

    // interacción
    const clickable = [lid, body, ...cards];
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const drag = { on: false, moved: false, x: 0, y: 0 };
    const el = renderer.domElement;

    const pick = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(clickable, true)[0];
    };
    const onDown = (e) => Object.assign(drag, { on: true, moved: false, x: e.clientX, y: e.clientY });
    const onMove = (e) => {
      if (!drag.on) { el.style.cursor = pick(e) ? 'pointer' : 'grab'; return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      const t = view.current.tgt;
      t.theta -= dx * 0.0065;
      t.phi = Math.max(0.42, Math.min(1.42, t.phi - dy * 0.0055));
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onUp = (e) => {
      const click = drag.on && !drag.moved;
      drag.on = false;
      if (!click) return;
      const hit = pick(e);
      if (!hit) return;
      const idx = hit.object.userData.index;
      if (!ui.current.open) setters.current.setIsOpen(true);
      if (typeof idx === 'number') setters.current.setSel(idx);
      else if (ui.current.open) setters.current.setIsOpen(false);
    };
    const onWheel = (e) => {
      e.preventDefault();
      const t = view.current.tgt;
      t.radius = Math.max(4.2, Math.min(22, t.radius + e.deltaY * 0.005));
    };
    const onResize = () => {
      fit();
      renderer.setSize(box.clientWidth, box.clientHeight);
    };
    const onKey = (e) => {
      const { setIsOpen: openDeck, setSel: pickCard } = setters.current;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        openDeck(true);
        pickCard((x) => (x + (e.key === 'ArrowRight' ? 1 : -1) + N) % N);
      }
      if (e.key === 'Escape') openDeck(false);
    };
    window.addEventListener('keydown', onKey);
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    // animación
    const ease = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const prog = { open: 0 };
    const startT = performance.now();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const time = (performance.now() - startT) / 1000;
      const { open, sel: active } = ui.current;

      prog.open += ((open ? 1 : 0) - prog.open) * 0.075;
      lid.rotation.x = -ease(0, 0.48, prog.open) * Math.PI * 0.64;
      const rise = ease(0.18, 0.62, prog.open);
      const fan = ease(0.52, 1, prog.open);
      const topY = Y0 + H + CH / 2 + 0.55;

      cards.forEach((m, i) => {
        m.visible = i === 0 || prog.open > 0.22;
        const ud = m.userData;
        ud.sel += ((fan > 0.55 && i === active ? 1 : 0) - ud.sel) * 0.1;
        const o = i - (N - 1) / 2;

        const closed = i === 0 ? new THREE.Vector3(0, cy, D / 2 - 0.105) : new THREE.Vector3(0, cy - 0.12, 0.15 - i * 0.14);
        const out = new THREE.Vector3(0, topY, 0.15 - i * 0.08);
        const slot = new THREE.Vector3(-0.35 + o * 0.92, topY + 0.12 - Math.abs(o) * 0.08 + Math.sin(time * 1.8 + i) * 0.025, 0.65 - Math.abs(o) * 0.14);
        const focus = new THREE.Vector3(-0.35, topY + 0.2, 2.0);

        m.position.lerpVectors(closed, out, rise).lerp(slot.lerp(focus, ud.sel), fan);
        m.rotation.z += (fan * -o * 0.13 * (1 - ud.sel) - m.rotation.z) * 0.12;
        m.rotation.y += (fan * -o * 0.05 * (1 - ud.sel) - m.rotation.y) * 0.12;
        m.rotation.x += (fan * -0.04 * (1 - ud.sel) - m.rotation.x) * 0.12;
        m.scale.setScalar(m.scale.x + (1 + ud.sel * 0.12 - m.scale.x) * 0.12);
      });

      const { cur, tgt } = view.current;
      cur.theta += (tgt.theta - cur.theta) * 0.09;
      cur.phi += (tgt.phi - cur.phi) * 0.09;
      cur.radius += (tgt.radius - cur.radius) * 0.09;
      cur.look.lerp(tgt.look, 0.09);
      camera.position.set(
        cur.look.x + cur.radius * Math.sin(cur.phi) * Math.sin(cur.theta),
        cur.look.y + cur.radius * Math.cos(cur.phi),
        cur.look.z + cur.radius * Math.sin(cur.phi) * Math.cos(cur.theta)
      );
      camera.lookAt(cur.look);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      renderer.dispose();
      box.removeChild(el);
    };
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#080a0f] text-slate-100 select-none font-sans">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Título centrado (se oculta al abrir la caja) */}
      <div className={`absolute top-5 inset-x-0 z-20 text-center pointer-events-none transition-opacity duration-500 ${isOpen ? 'opacity-0' : 'opacity-100'}`}>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-wide text-amber-100 drop-shadow-lg" style={{ fontFamily: 'Georgia, serif' }}>
          PORTAFOLIO
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Alumno: Leonardo Ivan Gongora Us · toca la caja para abrirla</p>
      </div>

      {/* Cuadro de la carta seleccionada */}
      {isOpen && (
        <div className="absolute z-20 bottom-20 left-3 right-3 md:left-auto md:right-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-80 bg-slate-950/85 border border-amber-500/30 rounded-2xl p-3 backdrop-blur">
          <div className="flex md:block gap-3">
            {current.image ? (
              <img src={current.image} alt={current.name} className="w-24 h-24 md:w-full md:h-48 object-cover rounded-xl shrink-0" />
            ) : (
              <div
                className="w-24 h-24 md:w-full md:h-48 rounded-xl shrink-0 flex items-center justify-center text-3xl font-bold"
                style={{ background: `radial-gradient(circle, ${current.color}55, #000000)`, color: current.color }}
              >
                {current.stats}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-amber-100 md:mt-3">{current.name}</h2>
              <p className="text-[11px] text-amber-500/80">{current.type}</p>
              <p className="text-xs md:text-sm text-slate-300 mt-1 md:mt-2">{current.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Flechas */}
      {isOpen && (
        <div className="absolute z-20 bottom-4 inset-x-0 flex items-center justify-center gap-3">
          <button
            onClick={() => setSel((x) => (x - 1 + N) % N)}
            className="w-12 h-12 rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-100 text-2xl active:scale-95"
          >
            ‹
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-5 h-12 rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-100 text-sm active:scale-95"
          >
            Cerrar · {sel + 1}/{N}
          </button>
          <button
            onClick={() => setSel((x) => (x + 1) % N)}
            className="w-12 h-12 rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-100 text-2xl active:scale-95"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}