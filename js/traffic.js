// js/traffic.js
// Spawns and manages oncoming traffic cars and road obstacles

const Traffic = (() => {

  // ── Car colour palettes ──────────────────────────────────────
  const CAR_COLORS = [
    { body: '#e74c3c', roof: '#c0392b', window: '#aed6f1' },
    { body: '#3498db', roof: '#2980b9', window: '#d6eaf8' },
    { body: '#f39c12', roof: '#d68910', window: '#fdebd0' },
    { body: '#2ecc71', roof: '#27ae60', window: '#d5f5e3' },
    { body: '#9b59b6', roof: '#8e44ad', window: '#e8daef' },
    { body: '#ecf0f1', roof: '#bdc3c7', window: '#85c1e9' },
    { body: '#1abc9c', roof: '#17a589', window: '#d1f2eb' },
    { body: '#e67e22', roof: '#ca6f1e', window: '#fae5d3' },
  ];

  // Obstacle types
  const OBS_TYPES = [
    { id: 'cone',     w: 18, h: 22, color: '#ff6b35' },
    { id: 'barrier',  w: 90, h: 18, color: '#f0b429', laneSpan: true },
    { id: 'debris',   w: 26, h: 20, color: '#888' },
  ];

  let cars = [];
  let obstacles = [];
  let spawnTimer = 0;
  let obsTimer = 0;
  let laneX = [];
  let laneW = 0;
  let canvasH = 0;

  const LANES = 3;
  const CAR_W = 42;
  const CAR_H = 72;

  // Difficulty settings
  const DIFF = {
    easy:   { baseGap: 220, minGap: 110, spawnChance: 0.7 },
    normal: { baseGap: 160, minGap:  80, spawnChance: 0.85 },
    hard:   { baseGap: 100, minGap:  55, spawnChance: 1.0  }
  };

  let diff = DIFF.normal;

  function init(laneXArr, laneWVal, cH, difficulty) {
    cars = []; obstacles = [];
    spawnTimer = 60; obsTimer = 200;
    laneX = laneXArr;
    laneW = laneWVal;
    canvasH = cH;
    diff = DIFF[difficulty] || DIFF.normal;
  }

  function spawnCar(gameSpeed, score) {
    // Pick a random lane
    const lane = Utils.randInt(0, LANES - 1);
    const cx = laneX[lane] + laneW / 2 - CAR_W / 2;
    const color = Utils.randFrom(CAR_COLORS);

    // Faster cars appear as score grows
    const speedVariance = Utils.randFloat(0.5, 1.8 + score * 0.0004);

    cars.push({
      x: cx,
      y: -CAR_H - 10,
      w: CAR_W,
      h: CAR_H,
      lane,
      speed: gameSpeed * speedVariance,
      color,
      dodged: false,       // for scoring
      type: Math.random() < 0.15 ? 'truck' : 'car'
    });
  }

  function spawnObstacle() {
    const type = Utils.randFrom(OBS_TYPES);
    const lane = Utils.randInt(0, LANES - 1);
    const ox = laneX[lane] + laneW / 2 - type.w / 2;
    obstacles.push({
      x: type.laneSpan ? laneX[0] + 10 : ox,
      y: -type.h - 10,
      w: type.laneSpan ? laneX[LANES - 1] + laneW - laneX[0] - 20 : type.w,
      h: type.h,
      type: type.id,
      color: type.color,
      lane
    });
  }

  function update(gameSpeed, score, visionMult, onDodge, onHit) {
    spawnTimer--;
    obsTimer--;

    // Dynamic spawn gap shrinks with score
    const gap = Math.max(diff.minGap, diff.baseGap - score * 0.1);
    if (spawnTimer <= 0 && Math.random() < diff.spawnChance) {
      spawnCar(gameSpeed, score);
      // Sometimes spawn 2 cars side by side for challenge
      if (score > 300 && Math.random() < 0.25) spawnCar(gameSpeed, score);
      spawnTimer = gap;
    }

    if (obsTimer <= 0 && score > 100) {
      spawnObstacle();
      obsTimer = Utils.randInt(300, 600);
    }

    const px = Player.x, py = Player.y, pw = Player.w, ph = Player.h;

    // ── Update cars ───────────────────────────────────────────
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      c.y += c.speed - Player.brakeVel * gameSpeed * 0.4;

      // Vision culling: fog hides cars until they're closer
      // visionMult < 1 means cars only become "solid" after a certain Y
      c.visible = c.y > canvasH * (1 - visionMult) - CAR_H * 2;

      // Score dodge
      if (!c.dodged && c.y > py + ph + 10) {
        c.dodged = true;
        onDodge(c);
      }

      // Collision check
      if (
        c.visible &&
        Utils.rectsOverlap(
          { x: px + 4, y: py + 4, w: pw - 8, h: ph - 8 },
          { x: c.x + 3, y: c.y + 3, w: c.w - 6, h: c.h - 6 }
        )
      ) {
        if (Player.takeDamage(c.type === 'truck' ? 40 : 25)) {
          onHit();
        }
      }

      if (c.y > canvasH + 20) cars.splice(i, 1);
    }

    // ── Update obstacles ──────────────────────────────────────
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += gameSpeed * 0.8 - Player.brakeVel * gameSpeed * 0.4;

      // Collision
      if (Utils.rectsOverlap(
        { x: px + 4, y: py + 10, w: pw - 8, h: ph - 14 },
        { x: o.x, y: o.y, w: o.w, h: o.h }
      )) {
        if (Player.takeDamage(15)) onHit();
      }

      if (o.y > canvasH + 20) obstacles.splice(i, 1);
    }
  }

  function reset() { cars = []; obstacles = []; spawnTimer = 60; obsTimer = 200; }

  return {
    init, update, reset,
    get cars() { return cars; },
    get obstacles() { return obstacles; }
  };
})();
