// js/ui.js
// Handles UI interactions like the pause menu

const UI = (() => {

  let pauseScreen;

  function init() {
    pauseScreen = document.getElementById('pauseScreen');

    // Button Listeners
    document.getElementById('resumeBtn').addEventListener('click', () => {
      Game.togglePause(false);
    });

    document.getElementById('pauseRestartBtn').addEventListener('click', () => {
      Game.togglePause(false);
      Game.startGame();
    });

    document.getElementById('pauseMenuBtn').addEventListener('click', () => {
      Game.togglePause(false);
      Game.goMenu();
    });

    // ESC Key Listener
    document.addEventListener('keydown', e => {
      if (e.code === 'Escape') {
        if (Game.getState() === 'playing') {
          Game.togglePause(true);
        } else if (Game.getState() === 'paused') {
          Game.togglePause(false);
        }
      }
    });

    // Mobile Controls
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const brakeBtn = document.getElementById('brakeBtn');

    if (leftBtn) {
      leftBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        Player.trySwitch(-1);
      });
    }
    if (rightBtn) {
      rightBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        Player.trySwitch(1);
      });
    }
    if (brakeBtn) {
      brakeBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        Player.setBraking(true);
      });
      brakeBtn.addEventListener('touchend', e => {
        e.preventDefault();
        Player.setBraking(false);
      });
    }

    // Instructions Modal
    const instructionsModal = document.getElementById('instructionsModal');
    const howToPlayBtn = document.getElementById('howToPlayBtn');
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');

    if (howToPlayBtn) {
      howToPlayBtn.addEventListener('click', () => {
        instructionsModal.classList.add('active');
      });
    }

    if (closeInstructionsBtn) {
      closeInstructionsBtn.addEventListener('click', () => {
        instructionsModal.classList.remove('active');
      });
    }

    // Close modal on click outside content
    instructionsModal.addEventListener('click', (e) => {
      if (e.target === instructionsModal) {
        instructionsModal.classList.remove('active');
      }
    });
  }

  return { init };
})();
