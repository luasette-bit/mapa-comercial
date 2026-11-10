/* Mapa Comercial · fundo animado da tela de entrada
   Globo de rede (como o da marca Grupo WorkOffice 30 anos) que gira sozinho
   e se inclina seguindo o mouse, com partículas ligadas ao fundo. */
(() => {
  "use strict";
  const calmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cv, ctx, W = 0, H = 0, dpr = 1, rodando = false, raf = 0, ultimo = 0;
  const mouse = { x: -9999, y: -9999, nx: 0, ny: 0, dentro: false };
  const giro = { y: 0, tiltX: -0.28, alvoX: -0.28, extraY: 0, alvoY: 0 };

  // ---- globo: pontos bem distribuídos na esfera (espiral de Fibonacci) + ligações com os vizinhos
  const N = 300, pontos = [], arestas = [];
  const ouro = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = ouro * i;
    // pequena irregularidade para parecer rede, não grade
    const j = 0.03;
    const x = Math.cos(t) * r + (Math.random() - 0.5) * j, z = Math.sin(t) * r + (Math.random() - 0.5) * j;
    const n = Math.hypot(x, y, z);
    pontos.push({ x: x / n, y: y / n, z: z / n, grande: Math.random() < 0.13, fase: Math.random() * Math.PI * 2 });
  }
  const vistos = new Set();
  pontos.forEach((p, i) => {
    const d = pontos.map((q, k) => [k, (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2]).filter(([k]) => k !== i).sort((a, b) => a[1] - b[1]);
    for (const [k] of d.slice(0, 4)) { const c = i < k ? `${i}-${k}` : `${k}-${i}`; if (!vistos.has(c)) { vistos.add(c); arestas.push([i, k]); } }
  });

  // ---- partículas soltas (inspiradas no template "Quantum Grid")
  const parts = [];
  function criarParticulas() {
    parts.length = 0;
    const qtd = Math.round(Math.min(70, (W * H) / 22000));
    for (let i = 0; i < qtd; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, s: Math.random() * 1.6 + 0.8 });
  }

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    criarParticulas();
  }

  const mistura = (a, b, t) => a + (b - a) * t;
  // azul do fundo -> ciano da marca, conforme a profundidade
  const cor = (t, a) => `rgba(${Math.round(mistura(52, 110, t))},${Math.round(mistura(98, 228, t))},${Math.round(mistura(196, 255, t))},${a})`;

  function quadro(agora) {
    if (!rodando) return;
    const dt = Math.min(50, agora - (ultimo || agora)); ultimo = agora;
    if (!calmo) giro.y += dt * 0.00011;
    giro.tiltX += (giro.alvoX - giro.tiltX) * 0.04;
    giro.extraY += (giro.alvoY - giro.extraY) * 0.04;

    ctx.clearRect(0, 0, W, H);
    const pequeno = W < 760;
    const cx = W * 0.5, cy = H * (pequeno ? 0.62 : 0.52);
    const R = pequeno ? Math.min(W * 0.62, H * 0.36) : Math.min(W * 0.3, H * 0.43);
    const foco = R * 3.2;
    const ay = giro.y + giro.extraY, ax = giro.tiltX;
    const cyA = Math.cos(ay), syA = Math.sin(ay), cxA = Math.cos(ax), sxA = Math.sin(ax);

    // halo atrás do globo
    const halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.25);
    halo.addColorStop(0, "rgba(70,120,220,0.18)"); halo.addColorStop(1, "rgba(70,120,220,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();

    // projeta os pontos
    const proj = pontos.map((p) => {
      let x = p.x * cyA + p.z * syA, z = -p.x * syA + p.z * cyA, y = p.y;
      const y2 = y * cxA - z * sxA, z2 = y * sxA + z * cxA;
      const k = foco / (foco - z2 * R);
      return { sx: cx + x * R * k, sy: cy + y2 * R * k, t: (z2 + 1) / 2, p };
    });

    // ligações do globo
    ctx.lineWidth = 1;
    for (const [i, k] of arestas) {
      const a = proj[i], b = proj[k], t = (a.t + b.t) / 2;
      ctx.strokeStyle = cor(t, 0.05 + t * t * 0.42);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }

    // mouse "puxa" as ligações dos pontos próximos (efeito grab)
    const alcance = 170;
    if (mouse.dentro) {
      for (const q of proj) {
        if (q.t < 0.45) continue;
        const d = Math.hypot(q.sx - mouse.x, q.sy - mouse.y);
        if (d < alcance) {
          ctx.strokeStyle = `rgba(110,228,255,${(1 - d / alcance) * 0.55})`;
          ctx.beginPath(); ctx.moveTo(q.sx, q.sy); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    }

    // nós do globo (os de trás primeiro)
    proj.sort((a, b) => a.t - b.t);
    for (const q of proj) {
      const t = q.t, pulso = 0.75 + 0.25 * Math.sin(agora * 0.0016 + q.p.fase);
      let perto = 0;
      if (mouse.dentro) { const d = Math.hypot(q.sx - mouse.x, q.sy - mouse.y); if (d < alcance) perto = 1 - d / alcance; }
      if (q.p.grande) {
        const r = (5 + 9 * t) * (1 + perto * 0.6);
        const g = ctx.createRadialGradient(q.sx, q.sy, 0, q.sx, q.sy, r);
        g.addColorStop(0, cor(t, (0.1 + 0.28 * t) * pulso + perto * 0.3)); g.addColorStop(1, cor(t, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, Math.PI * 2); ctx.fill();
      }
      const r = 0.7 + 1.9 * t + perto * 1.6;
      ctx.fillStyle = cor(Math.min(1, t + perto), (0.18 + 0.82 * t * t) * pulso + perto * 0.4);
      ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, Math.PI * 2); ctx.fill();
    }

    // partículas soltas e suas ligações
    for (const p of parts) {
      if (!calmo) { p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06; }
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    for (let i = 0; i < parts.length; i++) {
      const a = parts[i];
      for (let k = i + 1; k < parts.length; k++) {
        const b = parts[k], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 150) { ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 150) * 0.08})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      if (mouse.dentro) {
        const d = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (d < 220) { ctx.strokeStyle = `rgba(110,228,255,${(1 - d / 220) * 0.4})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(a.x - a.s / 2, a.y - a.s / 2, a.s, a.s);
    }

    raf = requestAnimationFrame(quadro);
  }

  function aoMover(x, y) {
    mouse.x = x; mouse.y = y; mouse.dentro = true;
    // o globo se inclina e gira um pouco na direção do mouse
    giro.alvoX = -0.28 + (y / H - 0.5) * 0.55;
    giro.alvoY = (x / W - 0.5) * 0.9;
  }

  function preparar() {
    if (cv) return;
    cv = document.createElement("canvas");
    cv.id = "fundo-globo"; cv.setAttribute("aria-hidden", "true");
    document.body.prepend(cv);
    ctx = cv.getContext("2d");
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("pointermove", (e) => aoMover(e.clientX, e.clientY), { passive: true });
    document.addEventListener("pointerleave", () => { mouse.dentro = false; giro.alvoX = -0.28; giro.alvoY = 0; });
    document.addEventListener("visibilitychange", () => { if (document.hidden) pausar(); else if (cv.dataset.ligado) ligar(); });
  }
  function ligar() { preparar(); cv.dataset.ligado = "1"; if (rodando || document.hidden) return; rodando = true; ultimo = 0; raf = requestAnimationFrame(quadro); }
  function pausar() { rodando = false; cancelAnimationFrame(raf); }
  function desligar() { if (cv) delete cv.dataset.ligado; pausar(); }

  window.FundoPRG = { ligar, desligar };
})();
