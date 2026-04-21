// js/audio.js
// Procedural audio engine using Web Audio API with layered synthesis for realism

const Audio = (() => {
  let ctx = null;
  let engineOsc1 = null, engineOsc2 = null;
  let engineGain = null;
  let windNoise = null, windGain = null;
  let masterGain = null;
  let muted = false;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.6;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── Engine ──────────────────────────────────────────────────
  function startEngine() {
    if (!ctx || engineOsc1) return;
    
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.1;
    engineGain.connect(masterGain);

    // Deep sub-harmonic
    engineOsc1 = ctx.createOscillator();
    engineOsc1.type = 'sawtooth';
    engineOsc1.frequency.value = 40;
    engineOsc1.connect(engineGain);
    engineOsc1.start();

    // Mid-range detail
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 80;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    engineOsc2.connect(g2);
    g2.connect(engineGain);
    engineOsc2.start();

    startWind();
  }

  function startWind() {
    if (!ctx || windNoise) return;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    windNoise = ctx.createBufferSource();
    windNoise.buffer = buffer;
    windNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    windGain = ctx.createGain();
    windGain.gain.value = 0;

    windNoise.connect(filter);
    filter.connect(windGain);
    windGain.connect(masterGain);
    windNoise.start();
  }

  function setEngineSpeed(speedFactor) {
    if (!engineOsc1) return;
    const baseFreq = Utils.lerp(40, 120, speedFactor);
    engineOsc1.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.1);
    engineOsc2.frequency.setTargetAtTime(baseFreq * 2.02, ctx.currentTime, 0.1);
    
    engineGain.gain.setTargetAtTime(Utils.lerp(0.08, 0.18, speedFactor), ctx.currentTime, 0.1);
    
    if (windGain) {
      windGain.gain.setTargetAtTime(speedFactor * 0.4, ctx.currentTime, 0.2);
    }
  }

  function stopEngine() {
    if (!engineOsc1) return;
    engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    if (windGain) windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    
    setTimeout(() => {
      try { 
        engineOsc1.stop(); engineOsc2.stop(); 
        if (windNoise) windNoise.stop();
      } catch(e) {}
      engineOsc1 = null; engineOsc2 = null; windNoise = null;
    }, 400);
  }

  // ── One-shot sounds ─────────────────────────────────────────
  function playTone(freq, type, duration, gainVal, attack = 0.01) {
    if (!ctx || muted) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    g.connect(masterGain);

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playNoise(duration, gainVal, filterFreq = 2000, type = 'bandpass') {
    if (!ctx || muted) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    source.start();
    source.stop(ctx.currentTime + duration);
  }

  const SFX = {
    laneSwitch() {
      playNoise(0.2, 0.15, 600, 'lowpass');
    },
    crash() {
      playNoise(0.8, 0.7, 200, 'lowpass');
      playTone(50, 'sawtooth', 0.6, 0.4);
      playTone(100, 'square', 0.4, 0.2);
    },
    closeDodge() {
      playTone(880, 'sine', 0.1, 0.1);
      playTone(1320, 'sine', 0.08, 0.05);
    },
    weatherChange() {
      [261, 329, 392, 523].forEach((f, i) => {
        setTimeout(() => playTone(f, 'sine', 0.3, 0.1), i * 100);
      });
    },
    rainDrop() {
      playTone(Utils.randFloat(800, 1600), 'sine', 0.05, 0.03);
    },
    brakeSqueal() {
      if (!ctx || muted) return;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      g.connect(masterGain);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);
      osc.connect(g);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    },
    scoreUp() {
      playTone(523, 'sine', 0.1, 0.08);
      setTimeout(() => playTone(659, 'sine', 0.1, 0.08), 100);
    }
  };

  return { init, resume, startEngine, stopEngine, setEngineSpeed, SFX };
})();
