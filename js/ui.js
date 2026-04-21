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
  }

  return { init };
})();
