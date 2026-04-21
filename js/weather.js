// js/weather.js
// Manages weather states, transitions, and effects on gameplay

const Weather = (() => {

  const TYPES = {
    clear: {
      id: 'clear',
      label: '☀️ CLEAR',
      color: 'rgba(135,206,235,0.05)',
      gripMult: 1.0,       // lane-switch responsiveness
      brakeMult: 1.0,      // brake effectiveness
      visionMult: 1.0,     // how early obstacles appear (0=late)
      fogAlpha: 0,
      rainAlpha: 0,
      duration: [12, 20],  // seconds
      transitions: ['rain', 'fog'],
      bgTint: null
    },
    rain: {
      id: 'rain',
      label: '🌧️ RAIN',
      color: 'rgba(100,140,200,0.15)',
      gripMult: 0.6,
      brakeMult: 0.7,
      visionMult: 0.9,
      fogAlpha: 0,
      rainAlpha: 1,
      duration: [8, 16],
      transitions: ['clear', 'fog', 'ice'],
      bgTint: 'rgba(80,120,200,0.12)'
    },
    fog: {
      id: 'fog',
      label: '🌫️ FOG',
      color: 'rgba(200,200,200,0.08)',
      gripMult: 1.0,
      brakeMult: 0.85,
      visionMult: 0.45,    // obstacles appear MUCH closer
      fogAlpha: 1,
      rainAlpha: 0,
      duration: [8, 14],
      transitions: ['clear', 'rain'],
      bgTint: 'rgba(180,180,190,0.18)'
    },
    ice: {
      id: 'ice',
      label: '❄️ ICE',
      color: 'rgba(200,230,255,0.1)',
      gripMult: 0.35,
      brakeMult: 0.3,
      visionMult: 0.85,
      fogAlpha: 0,
      rainAlpha: 0,
      duration: [7, 12],
      transitions: ['clear', 'fog'],
      bgTint: 'rgba(180,220,255,0.1)'
    }
  };

  let current = TYPES.clear;
  let timer = 0;
  let nextChange = Utils.randInt(...TYPES.clear.duration) * 60;
  let rainDrops = [];
  let snowFlakes = [];
  let transitionAlpha = 0; // 0=fully new weather, used for fade-in warning

  // Rain particle pool
  function initParticles() {
    rainDrops = Array.from({ length: 120 }, () => ({
      x: Math.random() * 600,
      y: Math.random() * 700,
      len: Utils.randFloat(8, 18),
      speed: Utils.randFloat(10, 18),
      alpha: Utils.randFloat(0.3, 0.7)
    }));
    snowFlakes = Array.from({ length: 60 }, () => ({
      x: Math.random() * 600,
      y: Math.random() * 700,
      r: Utils.randFloat(1.5, 3.5),
      speed: Utils.randFloat(2, 5),
      drift: Utils.randFloat(-0.5, 0.5),
      alpha: Utils.randFloat(0.4, 0.9)
    }));
  }

  function changeTo(typeId, onWarning) {
    current = TYPES[typeId];
    timer = 0;
    nextChange = Utils.randInt(...current.duration) * 60;
    if (onWarning) onWarning(current);
    Audio.SFX.weatherChange();
  }

  function update(fps, onWarning) {
    timer++;
    if (timer >= nextChange) {
      const next = Utils.randFrom(current.transitions);
      changeTo(next, onWarning);
    }

    // Update rain
    if (current.rainAlpha > 0) {
      for (const d of rainDrops) {
        d.y += d.speed;
        d.x += 2; // slight angle
        if (d.y > 700) { d.y = -20; d.x = Math.random() * 600; }
        // occasional sound
        if (Math.random() < 0.003) Audio.SFX.rainDrop();
      }
    }

    // Update snow/ice crystals
    if (current.id === 'ice') {
      for (const s of snowFlakes) {
        s.y += s.speed;
        s.x += s.drift;
        if (s.y > 700) { s.y = -10; s.x = Math.random() * 600; }
      }
    }
  }

  function drawRain(ctx, canvasW, canvasH) {
    if (current.rainAlpha === 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(180,200,255,${0.5 * current.rainAlpha})`;
    ctx.lineWidth = 1;
    for (const d of rainDrops) {
      ctx.globalAlpha = d.alpha * current.rainAlpha;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + 3, d.y + d.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawSnow(ctx) {
    if (current.id !== 'ice') return;
    ctx.save();
    for (const s of snowFlakes) {
      ctx.globalAlpha = s.alpha * 0.7;
      ctx.fillStyle = '#cceeff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawFog(ctx, canvasW, canvasH) {
    if (current.fogAlpha === 0) return;
    // Gradient fog that hides the top (far road = incoming obstacles)
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH * 0.6);
    grad.addColorStop(0, `rgba(200,205,210,${0.92 * current.fogAlpha})`);
    grad.addColorStop(0.5, `rgba(200,205,210,${0.6 * current.fogAlpha})`);
    grad.addColorStop(1, `rgba(200,205,210,0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH * 0.6);
  }

  return {
    init: initParticles,
    update,
    drawRain,
    drawSnow,
    drawFog,
    get current() { return current; },
    get gripMult() { return current.gripMult; },
    get brakeMult() { return current.brakeMult; },
    get visionMult() { return current.visionMult; }
  };
})();
