// js/player.js
// Player car — handles input, physics-based movement, steering angles, and health

const Player = (() => {

  // ── Constants ────────────────────────────────────────────────
  const LANES = 3;
  const CAR_W = 44;
  const CAR_H = 76;
  
  // Physics constants
  const TURN_SPEED = 0.12;   // Increased for better responsiveness
  const FRICTION = 0.85;     // Lower multiplier (higher friction) for quicker stabilization
  const STEER_LIMIT = 0.12;  // Slightly reduced for subtle steering look

  // ── State ────────────────────────────────────────────────────
  let lane = 1;
  let targetLane = 1;
  let x = 0;
  let vx = 0;            // lateral velocity
  let angle = 0;         // steering angle
  let roll = 0;          // body roll
  
  let laneX = [0, 0, 0];
  let y = 0;
  
  let braking = false;
  let brakeVel = 0;

  let health = 100;
  let lives = 3;
  let invincible = 0;
  let flashTimer = 0;

  let topSpeed = 0;
  let carsDodged = 0;

  const keys = {};

  function init(roadLeft, laneW, canvasH) {
    lane = 1; targetLane = 1;
    health = 100; lives = 3; invincible = 0; flashTimer = 0;
    braking = false; brakeVel = 0;
    topSpeed = 0; carsDodged = 0;
    vx = 0; angle = 0; roll = 0;

    for (let i = 0; i < LANES; i++) {
      laneX[i] = roadLeft + laneW * i + laneW / 2 - CAR_W / 2;
    }
    x = laneX[1];
    y = canvasH - CAR_H - 100; // a bit higher for better road view
  }

  function bindKeys() {
    document.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') trySwitch(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') trySwitch(1);
      if (e.code === 'Space') { e.preventDefault(); braking = true; }
    });
    document.addEventListener('keyup', e => {
      keys[e.code] = false;
      if (e.code === 'Space') braking = false;
    });
  }

  function trySwitch(dir) {
    const newLane = Utils.clamp(lane + dir, 0, LANES - 1);
    if (newLane === lane && targetLane === lane) return;

    // Removed random overshoot for better player comfort and control
    targetLane = newLane;
    
    Audio.SFX.laneSwitch();
  }

  function update(gameSpeed) {
    const grip = Weather.gripMult;
    const targetX = laneX[targetLane];
    
    // ── Steering Physics ──────────────────────────────────────
    const dist = targetX - x;
    const accel = dist * TURN_SPEED * grip;
    
    vx += accel;
    vx *= FRICTION;
    x += vx;

    // Angle based on velocity (steering look)
    angle = Utils.lerp(angle, vx * 0.04, 0.2);
    angle = Utils.clamp(angle, -STEER_LIMIT, STEER_LIMIT);

    // Body roll based on lateral acceleration (tuned for comfort)
    roll = Utils.lerp(roll, vx * 0.08, 0.15);

    // Snap to lane if very close and moving slowly
    if (Math.abs(dist) < 2 && Math.abs(vx) < 0.2) {
      lane = targetLane;
      x = targetX;
      vx = 0;
    }

    // ── Braking ───────────────────────────────────────────────
    const brakeEff = Weather.brakeMult;
    if (braking) {
      brakeVel = Math.min(brakeVel + 0.1 * brakeEff, 0.5 * brakeEff);
      if (brakeVel > 0.15) Audio.SFX.brakeSqueal();
    } else {
      brakeVel = Math.max(0, brakeVel - 0.05);
    }

    // ── Invincibility ─────────────────────────────────────────
    if (invincible > 0) invincible--;
    if (flashTimer > 0) flashTimer--;

    // ── HUD/Stats ─────────────────────────────────────────────
    const km = Math.floor(gameSpeed * 18);
    if (km > topSpeed) topSpeed = km;

    Audio.setEngineSpeed(Utils.clamp((gameSpeed - 3) / 8, 0, 1));
  }

  function takeDamage(amount) {
    if (invincible > 0) return false;
    health = Math.max(0, health - amount);
    invincible = 90;
    flashTimer = 90;
    Audio.SFX.crash();
    if (health <= 0) {
      lives--;
      health = lives > 0 ? 80 : 0;
    }
    return true;
  }

  function noteDodge() {
    carsDodged++;
    if (carsDodged % 5 === 0) Audio.SFX.scoreUp();
  }

  function isVisible() {
    if (invincible > 0) return Math.floor(invincible / 5) % 2 === 0;
    return true;
  }

  return {
    init, bindKeys, trySwitch, update, takeDamage, noteDodge, isVisible,
    get x() { return x; },
    get y() { return y; },
    get w() { return CAR_W; },
    get h() { return CAR_H; },
    get vx() { return vx; },
    get angle() { return angle; },
    get roll() { return roll; },
    get lane() { return lane; },
    get health() { return health; },
    get lives() { return lives; },
    get brakeVel() { return brakeVel; },
    get braking() { return braking; },
    get topSpeed() { return topSpeed; },
    get carsDodged() { return carsDodged; }
  };
})();
