// js/utils.js
// Utility helpers used across modules

const Utils = {

  // Clamp a value between min and max
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  // Linear interpolation
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Random integer between min and max (inclusive)
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Random float between min and max
  randFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  // Random element from array
  randFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Check AABB collision between two rectangles
  // Each rect: { x, y, w, h }
  rectsOverlap(a, b, margin = 0) {
    return (
      a.x - margin < b.x + b.w &&
      a.x + a.w + margin > b.x &&
      a.y - margin < b.y + b.h &&
      a.y + a.h + margin > b.y
    );
  },

  // Format number with commas
  formatNum(n) {
    return Math.floor(n).toLocaleString();
  },

  // Ease out quad
  easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  },

  // Color manipulation
  lighten(hex, percent) {
    const num = parseInt(hex.replace('#',''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
  },

  darken(hex, percent) {
    const num = parseInt(hex.replace('#',''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
  },

  // Convert hsl to hex-ish rgba string
  rgba(r, g, b, a) {
    return `rgba(${r},${g},${b},${a})`;
  }
};
