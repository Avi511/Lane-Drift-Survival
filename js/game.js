// js/game.js
// Main game loop and state machine

const Game = (() => {

  // ── State ────────────────────────────────────────────────────
  const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', DEAD: 'dead' };
  let state = STATE.MENU;
  let difficulty = 'normal';

  // Scoring
  let score = 0;
  let hiScore = parseInt(localStorage.getItem('ldsHiScore') || '0');
  let hiSpeed = parseInt(localStorage.getItem('ldsHiSpeed') || '0');
  let hiDriver = localStorage.getItem('ldsHiDriver') || 'GHOST';
  let curDriver = localStorage.getItem('ldsCurDriver') || 'DRIVER 1';
  let dodgeCount = 0;
  let frame = 0;

  // Speed
  let baseSpeed = 4.0;
  let gameSpeed = baseSpeed;
  const MAX_SPEED = 13;

  // DOM refs
  let scoreEl, bestEl, weatherEl, speedEl, healthEl, livesEl, warningEl;
  let menuScreen, gameScreen, gameOverScreen, pauseScreen;

  // ── Boot ─────────────────────────────────────────────────────
  function boot() {
    const canvas = document.getElementById('gameCanvas');
    Renderer.init(canvas);
    Audio.init();
    Weather.init();
    Player.bindKeys();

    scoreEl   = document.getElementById('scoreVal');
    bestEl    = document.getElementById('bestVal');
    weatherEl = document.getElementById('weatherDisplay');
    speedEl   = document.getElementById('speedDisplay');
    healthEl  = document.getElementById('healthFill');
    livesEl   = document.getElementById('livesDisplay');
    warningEl = document.getElementById('weatherWarning');

    menuScreen    = document.getElementById('menuScreen');
    gameScreen    = document.getElementById('gameScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    pauseScreen   = document.getElementById('pauseScreen');

    const nameInput = document.getElementById('driverName');
    nameInput.value = curDriver;
    nameInput.addEventListener('input', e => {
      curDriver = e.target.value.toUpperCase() || 'DRIVER 1';
      localStorage.setItem('ldsCurDriver', curDriver);
    });

    updateMenuStats();
    bestEl.textContent = hiScore;
    document.getElementById('finalBest').textContent = hiScore + ' m';

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('menuBtn').addEventListener('click', goMenu);

    updateMenuStats();
    UI.init();
    showScreen('menu');
    requestAnimationFrame(loop);
  }

  // ── Start / Reset ─────────────────────────────────────────────
  function startGame() {
    Audio.resume();
    score = 0; dodgeCount = 0; frame = 0;
    gameSpeed = difficulty === 'easy' ? 3.2 : difficulty === 'hard' ? 5.0 : 4.0;
    baseSpeed = gameSpeed;

    Player.init(Renderer.laneX[0], Renderer.laneW, Renderer.H, difficulty);
    Traffic.init(Renderer.laneX, Renderer.laneW, Renderer.H, difficulty);
    Weather.init();

    document.getElementById('hudDriverName').textContent = curDriver;

    showScreen('game');
    state = STATE.PLAYING;
    Audio.startEngine();
  }

  function goMenu() {
    state = STATE.MENU;
    Audio.stopEngine();
    showScreen('menu');
  }

  function showScreen(which) {
    menuScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    pauseScreen.classList.remove('active');

    if (which === 'menu')   menuScreen.classList.add('active');
    if (which === 'game')   gameScreen.classList.add('active');
    if (which === 'over')   gameOverScreen.classList.add('active');
    
    // For pause, we want the game screen clearly behind it, 
    // so we don't remove the game screen's active class, just overlay pause
    if (which === 'paused') {
      gameScreen.classList.add('active'); 
      pauseScreen.classList.add('active');
    }
  }

  function togglePause(shouldPause) {
    if (state !== STATE.PLAYING && state !== STATE.PAUSED) return;

    if (shouldPause) {
      state = STATE.PAUSED;
      showScreen('paused');
    } else {
      state = STATE.PLAYING;
      showScreen('game');
    }
  }

  function updateMenuStats() {
    const menuScore = document.getElementById('menuBestScore');
    const menuSpeed = document.getElementById('menuBestSpeed');
    const menuDriver = document.getElementById('menuBestDriver');
    if (menuScore) menuScore.textContent = Utils.formatNum(hiScore) + ' m';
    if (menuSpeed) menuSpeed.textContent = hiSpeed + ' km/h';
    if (menuDriver) menuDriver.textContent = hiDriver;
  }

  // ── Main loop ────────────────────────────────────────────────
  function loop() {
    requestAnimationFrame(loop);
    Renderer.clear();

    if (state === STATE.MENU) {
      renderMenu();
      return;
    }

    if (state === STATE.PAUSED) {
      // Draw frozen state but don't update
      drawPlayingScene();
      return;
    }

    if (state === STATE.PLAYING) {
      frame++;

      // Speed scaling
      gameSpeed = Math.min(MAX_SPEED, baseSpeed + frame * 0.0012);

      // Weather update
      Weather.update(60, showWeatherWarning);

      // Player update
      Player.update(gameSpeed);

      // Traffic update
      Traffic.update(
        gameSpeed,
        score,
        Weather.visionMult,
        onCarDodged,
        onCollision
      );

      // Score: distance in metres
      score += gameSpeed * 0.08;

      // Check death
      if (Player.lives <= 0 && Player.health <= 0) {
        triggerGameOver();
        return;
      }

      // Render
      Renderer.scrollRoad(gameSpeed);
      Renderer.drawRoad(Weather.current.id);
      Renderer.updateAndDrawSkidMarks(gameSpeed);
      Renderer.updateAndDrawSmoke(gameSpeed);
      Renderer.drawObstacles();
      for (const c of Traffic.cars) {
        Renderer.drawCar(c, Weather.visionMult);
      }
      Weather.drawRain(
        document.getElementById('gameCanvas').getContext('2d'),
        Renderer.W, Renderer.H
      );
      Weather.drawSnow(
        document.getElementById('gameCanvas').getContext('2d')
      );
      Renderer.drawIceOverlay();
      Weather.drawFog(
        document.getElementById('gameCanvas').getContext('2d'),
        Renderer.W, Renderer.H
      );
      Renderer.drawPlayer();
      Renderer.updateAndDrawSparks();

      updateHUD();
    }

    if (state === STATE.DEAD) {
      // Keep drawing frozen scene
      drawPlayingScene();
    }
  }

  // Refactored drawing to a helper
  function drawPlayingScene() {
    Renderer.drawRoad(Weather.current.id);
    Renderer.drawIceOverlay();
    Renderer.drawObstacles();
    for (const c of Traffic.cars) {
      Renderer.drawCar(c, Weather.visionMult);
    }
    Renderer.drawPlayer();
  }

  // ── Idle menu render ──────────────────────────────────────────
  function renderMenu() {
    Renderer.scrollRoad(2.5);
    Renderer.drawRoad('clear');
  }

  // ── Events ────────────────────────────────────────────────────
  function onCarDodged(car) {
    dodgeCount++;
    Audio.SFX.closeDodge();
    Player.noteDodge();
  }

  function onCollision() {
    // Health/lives handled in Player.takeDamage
    updateHUD();
  }

  function triggerGameOver() {
    state = STATE.DEAD;
    Audio.stopEngine();
    Audio.SFX.crash();

    const finalScore = Math.floor(score);
    // Allow the current driver to claim the "Top Driver" spot if they tie the high score 
    // This is especially important for the very first run (score 0 vs hiScore 0)
    if (finalScore >= hiScore) {
      // Don't overwrite a high score > 0 with a 0 score tie, but if the score is actually higher, do it.
      if (finalScore > hiScore || hiScore === 0) {
        hiScore = finalScore;
        hiDriver = curDriver;
        localStorage.setItem('ldsHiScore', hiScore);
        localStorage.setItem('ldsHiDriver', hiDriver);
      }
    }

    if (Player.topSpeed > hiSpeed) {
      hiSpeed = Player.topSpeed;
      localStorage.setItem('ldsHiSpeed', hiSpeed);
    }

    document.getElementById('finalScore').textContent   = finalScore + ' m';
    document.getElementById('finalSpeed').textContent   = Player.topSpeed + ' km/h';
    document.getElementById('finalDodged').textContent  = Player.carsDodged;
    document.getElementById('finalBest').textContent    = hiScore + ' m';

    updateMenuStats();
    setTimeout(() => showScreen('over'), 600);
  }

  function showWeatherWarning(weather) {
    warningEl.textContent = 'WEATHER CHANGE: ' + weather.label.toUpperCase();
    warningEl.classList.remove('hidden');
    // remove and re-add to retrigger animation
    void warningEl.offsetWidth;
    warningEl.style.animation = 'none';
    void warningEl.offsetWidth;
    warningEl.style.animation = '';
    warningEl.classList.add('active');
    setTimeout(() => warningEl.classList.add('hidden'), 2600);
  }

  // ── HUD update ────────────────────────────────────────────────
  function updateHUD() {
    scoreEl.textContent = Utils.formatNum(score) + ' m';
    bestEl.textContent  = Utils.formatNum(hiScore) + ' m';
    weatherEl.textContent = Weather.current.label;

    const km = Math.floor(gameSpeed * 18 - Player.brakeVel * gameSpeed * 18);
    speedEl.textContent = km + ' km/h';

    const hp = Utils.clamp(Player.health, 0, 100);
    healthEl.style.width = hp + '%';
    healthEl.style.background =
      hp > 60 ? '#00ff88' :
      hp > 30 ? '#ffd700' : '#ff2244';

    const hearts = '❤️'.repeat(Player.lives) + '🖤'.repeat(Math.max(0, 3 - Player.lives));
    livesEl.textContent = hearts;
  }

  return { 
    boot, 
    startGame, 
    goMenu, 
    togglePause, 
    getState: () => state,
    STATE 
  };
})();

// ── Entry point ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', Game.boot);
