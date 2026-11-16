// input.js: Keyboard and pointer input handling

export const ACTION_CONFIRM = 1 << 0;
export const ACTION_PAUSE = 1 << 1;
export const ACTION_FIRE = 1 << 2;

export function createInput(canvas) {
  const keys = new Set();
  let pendingActions = 0;
  let mouseX = 640;
  let mouseY = 360;
  let mouseDown = false;

  function onKeyDown(e) {
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') {
      pendingActions |= ACTION_CONFIRM;
      pendingActions |= ACTION_FIRE;
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      pendingActions |= ACTION_PAUSE;
    }
    // Prevent default scroll on game keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
  }

  function onMouseDown() {
    mouseDown = true;
    pendingActions |= ACTION_CONFIRM;
    pendingActions |= ACTION_FIRE;
  }

  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    vector() {
      let dx = 0;
      let dy = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      return { dx, dy };
    },
    isFiring() {
      return keys.has('Space') || mouseDown || keys.has('KeyJ') || keys.has('KeyZ');
    },
    takeActions() {
      const a = pendingActions;
      pendingActions = 0;
      return a;
    },
    mouse() {
      return { x: mouseX, y: mouseY, down: mouseDown };
    },
  };
}
