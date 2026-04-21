// js/renderer.js
// Draws the road, cars, effects, and HUD overlays onto the canvas with realistic lighting and shadows

const Renderer = (() => {

  let canvas, ctx;
  let W, H;

  // Road layout
  const LANES = 3;
  let ROAD_LEFT, ROAD_RIGHT, ROAD_W, LANE_W;
  let laneXArr = [];

  // Road scroll
  let roadY1 = 0, roadY2 = 0;

  // Particle effects
  let sparks = [];
  let skidMarks = [];
  let smoke = [];

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    W = canvas.width  = Math.min(window.innerWidth, 520);
    H = canvas.height = window.innerHeight;

    ROAD_W    = Math.min(360, W * 0.85);
    ROAD_LEFT = (W - ROAD_W) / 2;
    ROAD_RIGHT = ROAD_LEFT + ROAD_W;
    LANE_W    = ROAD_W / LANES;

    laneXArr = [];
    for (let i = 0; i < LANES; i++) laneXArr.push(ROAD_LEFT + LANE_W * i);

    roadY1 = 0; roadY2 = H;
  }

  // ── Road markings scroll ──────────────────────────────────────
  function scrollRoad(speed) {
    roadY1 += speed;
    roadY2 += speed;
    if (roadY1 > H) roadY1 = roadY2 - H;
    if (roadY2 > H * 2) roadY2 = roadY1 - H;
  }

  // ── Draw road ────────────────────────────────────────────────
  function drawRoad(weather) {
    // Sky / background with deeper gradients
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    if (weather === 'fog') {
      bgGrad.addColorStop(0, '#a8acb0');
      bgGrad.addColorStop(1, '#7d838a');
    } else if (weather === 'rain') {
      bgGrad.addColorStop(0, '#0a1a2a');
      bgGrad.addColorStop(0.5, '#05101a');
      bgGrad.addColorStop(1, '#02050a');
    } else if (weather === 'ice') {
      bgGrad.addColorStop(0, '#c0d8e5');
      bgGrad.addColorStop(1, '#6a98b4');
    } else {
      bgGrad.addColorStop(0, '#0a0a20');
      bgGrad.addColorStop(0.5, '#050510');
      bgGrad.addColorStop(1, '#020205');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Kerb / grass strip with noise texture or simple detail
    ctx.fillStyle = weather === 'ice' ? '#98b4c8' : '#102a10';
    ctx.fillRect(0, 0, ROAD_LEFT - 2, H);
    ctx.fillRect(ROAD_RIGHT + 2, 0, W - ROAD_RIGHT - 2, H);

    // Road surface with slight gradient for depth
    const roadCol = weather === 'ice' ? '#2a3a4a' :
                    weather === 'rain' ? '#151525' : '#22222e';
    
    const roadGrad = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
    roadGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    roadGrad.addColorStop(0.1, 'rgba(0,0,0,0)');
    roadGrad.addColorStop(0.9, 'rgba(0,0,0,0)');
    roadGrad.addColorStop(1, 'rgba(0,0,0,0.3)');

    ctx.fillStyle = roadCol;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);
    ctx.fillStyle = roadGrad;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

    // Dynamic Road Reflection (Rain)
    if (weather === 'rain') {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 5; i++) {
        const rx = ROAD_LEFT + Math.random() * ROAD_W;
        const ry = Math.random() * H;
        ctx.fillRect(rx, ry, Math.random() * 20, 2);
      }
    }

    // Edge lines
    ctx.strokeStyle = weather === 'ice' ? '#dae8f0' : '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT, 0); ctx.lineTo(ROAD_LEFT, H);
    ctx.moveTo(ROAD_RIGHT, 0); ctx.lineTo(ROAD_RIGHT, H);
    ctx.stroke();

    // Dashed lane dividers with motion blur feel
    ctx.setLineDash([40, 30]);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 1; i < LANES; i++) {
      const lx = ROAD_LEFT + LANE_W * i;
      [roadY1, roadY2].forEach(oy => {
        ctx.beginPath();
        ctx.moveTo(lx, oy - H);
        ctx.lineTo(lx, oy + H);
        ctx.stroke();
      });
    }
    ctx.setLineDash([]);
  }

  // ── Draw shadow ──────────────────────────────────────────────
  function drawShadow(x, y, w, h, angle) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.filter = 'blur(6px)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 5, -h / 2 + 10, w, h, 10);
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  }

  // ── Draw a traffic car ────────────────────────────────────────
  function drawCar(c, visionMult) {
    const fogStart = H * (1 - visionMult) - c.h * 2;
    const alpha = visionMult >= 0.95 ? 1 :
                  Utils.clamp((c.y - fogStart) / (c.h * 3), 0, 1);
    ctx.globalAlpha = alpha;

    // Movement tilt (very slight for traffic)
    const angle = c.vx ? c.vx * 0.05 : 0;

    drawShadow(c.x, c.y, c.w, c.h, angle);

    ctx.save();
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
    ctx.rotate(angle);
    const drawX = -c.w / 2;
    const drawY = -c.h / 2;

    if (c.type === 'truck') {
      drawTruck(drawX, drawY, c.w, c.h, c.color);
    } else {
      drawSmallCar(drawX, drawY, c.w, c.h, c.color);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawSmallCar(x, y, w, h, color) {
    // Body with gradient for volume
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, color.body);
    grad.addColorStop(0.5, Utils.lighten(color.body, 15));
    grad.addColorStop(1, Utils.darken(color.body, 15));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y + h * 0.2, w, h * 0.65, 6);
    ctx.fill();

    // Highlights (hood/trunk peaks)
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 4, y + h * 0.25, w - 8, 4);
    ctx.fillRect(x + 4, y + h * 0.75, w - 8, 4);

    // Roof
    ctx.fillStyle = color.roof;
    ctx.beginPath();
    ctx.roundRect(x + 6, y + h * 0.05, w - 12, h * 0.35, 4);
    ctx.fill();

    // Windows with reflections
    ctx.fillStyle = color.window;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + h * 0.08, w - 16, h * 0.15, 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(x + 10, y + h * 0.09, 4, h * 0.1);
    ctx.globalAlpha = 1;

    // Headlights / Tail lights
    ctx.fillStyle = '#ffe680'; // front
    ctx.beginPath(); ctx.ellipse(x + 6, y + h * 0.82, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w - 6, y + h * 0.82, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    
    ctx.fillStyle = '#ff2200'; // rear
    ctx.fillRect(x + 4, y + h * 0.18, 8, 3);
    ctx.fillRect(x + w - 12, y + h * 0.18, 8, 3);

    // Wheels
    ctx.fillStyle = '#111';
    [[x - 2, y + h * 0.25], [x + w - 3, y + h * 0.25],
     [x - 2, y + h * 0.6], [x + w - 3, y + h * 0.6]].forEach(([wx, wy]) => {
      ctx.beginPath(); ctx.ellipse(wx + 2.5, wy + 5, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawTruck(x, y, w, h, color) {
    // Trailer
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 2, y, w - 4, h * 0.6);
    // Vertical ribs
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x + 2 + (w - 4) / 5 * i, y); ctx.lineTo(x + 2 + (w - 4) / 5 * i, y + h * 0.6); ctx.stroke();
    }
    // Cab
    ctx.fillStyle = color.body;
    ctx.beginPath();
    ctx.roundRect(x, y + h * 0.62, w, h * 0.32, 2);
    ctx.fill();
    // Windshield
    ctx.fillStyle = color.window;
    ctx.fillRect(x + 4, y + h * 0.65, w - 8, h * 0.1);
    // Wheels (more wheels for truck)
    ctx.fillStyle = '#0a0a0a';
    [[x - 3, y + h * 0.7], [x + w - 2, y + h * 0.7],
     [x - 3, y + h * 0.85], [x + w - 2, y + h * 0.85],
     [x - 3, y + h * 0.2], [x + w - 2, y + h * 0.2]].forEach(([wx, wy]) => {
      ctx.beginPath(); ctx.ellipse(wx + 2.5, wy + 5, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ── Draw player car ──────────────────────────────────────────
  function drawPlayer() {
    if (!Player.isVisible()) return;
    const { x, y, w, h, angle, roll } = Player;

    drawShadow(x, y, w, h, angle);

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);
    // Apply body roll (skew/scale to simulate tilting)
    ctx.transform(1, 0, roll * 0.15, 1, 0, 0);

    const dx = -w / 2;
    const dy = -h / 2;

    // Body with premium gradient
    const bodyGrad = ctx.createLinearGradient(dx, 0, dx + w, 0);
    bodyGrad.addColorStop(0, '#00b4cc');
    bodyGrad.addColorStop(0.4, '#00f5ff');
    bodyGrad.addColorStop(1, '#0088aa');
    
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(dx, dy + h * 0.2, w, h * 0.65, 8);
    ctx.fill();

    // Glossy Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(dx + 4, dy + h * 0.3, w - 8, h * 0.4, 4);
    ctx.fill();
    ctx.fillStyle = bodyGrad; // covering middle
    ctx.beginPath();
    ctx.roundRect(dx + 6, dy + h * 0.32, w - 12, h * 0.36, 4);
    ctx.fill();

    // Windows
    ctx.fillStyle = 'rgba(10,20,30,0.9)';
    ctx.beginPath();
    ctx.roundRect(dx + 6, dy + h * 0.05, w - 12, h * 0.3, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,240,255,0.4)';
    ctx.beginPath();
    ctx.roundRect(dx + 8, dy + h * 0.07, w - 16, h * 0.12, 2);
    ctx.fill();

    // Headlights (forward)
    ctx.fillStyle = '#ffffaa';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255,255,100,0.8)';
    ctx.beginPath(); ctx.ellipse(dx + 8, dy + h * 0.22, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(dx + w - 8, dy + h * 0.22, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Tail lights (braking)
    if (Player.braking) {
      ctx.fillStyle = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff0000';
      ctx.fillRect(dx + 4, dy + h * 0.8, 10, 4);
      ctx.fillRect(dx + w - 14, dy + h * 0.8, 10, 4);
      ctx.shadowBlur = 0;
    }

    // Wheels
    ctx.fillStyle = '#111';
    [[dx - 2, dy + h * 0.25], [dx + w - 3, dy + h * 0.25],
     [dx - 2, dy + h * 0.6], [dx + w - 3, dy + h * 0.6]].forEach(([wx, wy]) => {
      ctx.beginPath(); ctx.ellipse(wx + 2.5, wy + 5, 3.5, 6, 0, 0, Math.PI * 2); ctx.fill();
    });

    ctx.restore();

    // Particles
    if (Player.braking && Player.brakeVel > 0.1) {
      spawnSmoke(x + w / 2, y + h * 0.85);
      if (Player.brakeVel > 0.2) spawnSparks(x + w / 2, y + h * 0.85);
    }
  }

  function spawnSmoke(x, y) {
    smoke.push({
      x, y,
      vx: Utils.randFloat(-1, 1),
      vy: Utils.randFloat(1, 4),
      size: Utils.randFloat(4, 10),
      life: 1.0,
      color: 'rgba(150,150,150,0.4)'
    });
  }

  function updateAndDrawSmoke(speed) {
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.x += p.vx; p.y += p.vy - speed * 0.5;
      p.size += 0.5;
      p.life -= 0.02;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.life <= 0) smoke.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── Draw obstacles ────────────────────────────────────────────
  function drawObstacles() {
    for (const o of Traffic.obstacles) {
      drawShadow(o.x, o.y, o.w, o.h, 0);
      if (o.type === 'cone') {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, o.y);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(o.x + 3, o.y + o.h * 0.5, o.w - 6, 3);
      } else if (o.type === 'barrier') {
        ctx.fillStyle = o.color;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#cc0000';
        for (let bx = o.x; bx < o.x + o.w; bx += 28) {
          ctx.fillRect(bx, o.y, 14, o.h);
        }
      } else {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.w, o.h, 4);
        ctx.fill();
      }
    }
  }

  // ── Skid marks ────────────────────────────────────────────────
  function updateAndDrawSkidMarks(speed) {
    for (let i = skidMarks.length - 1; i >= 0; i--) {
      const s = skidMarks[i];
      s.y += speed;
      s.alpha -= 0.005;
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y);
      ctx.lineTo(s.x2, s.y);
      ctx.stroke();
      if (s.alpha <= 0) skidMarks.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── Sparks ────────────────────────────────────────────────────
  function spawnSparks(x, y) {
    for (let i = 0; i < 2; i++) {
      sparks.push({
        x, y,
        vx: Utils.randFloat(-3, 3),
        vy: Utils.randFloat(-2, 2),
        life: 1.0,
        color: Utils.randFrom(['#ffdd00', '#ff8800', '#ffffff'])
      });
    }
  }

  function updateAndDrawSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.2;
      s.life -= 0.05;
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
      if (s.life <= 0) sparks.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── Ice overlay on road ───────────────────────────────────────
  function drawIceOverlay() {
    if (Weather.current.id !== 'ice') return;
    ctx.save();
    ctx.fillStyle = 'rgba(200,230,255,0.1)';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);
    ctx.restore();
  }

  function clear() {
    ctx.clearRect(0, 0, W, H);
  }

  return {
    init, scrollRoad, drawRoad, drawCar, drawPlayer,
    drawObstacles, updateAndDrawSkidMarks, updateAndDrawSparks, updateAndDrawSmoke,
    drawIceOverlay,
    get laneX() { return laneXArr; },
    get laneW()  { return LANE_W; },
    get W()      { return W; },
    get H()      { return H; },
    clear
  };
})();
