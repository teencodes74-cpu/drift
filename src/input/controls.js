export function createControls() {
  const input = { throttle: false, brake: false, left: false, right: false, drift: false };
  function bindButton(el, key) {
    const setActive = (value) => { input[key] = value; el.classList.toggle('active', value); };
    ['pointerdown', 'pointerenter'].forEach((type) => el.addEventListener(type, (e) => { if (type === 'pointerenter' && e.buttons !== 1) return; e.preventDefault(); setActive(true); }));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => el.addEventListener(type, (e) => { e.preventDefault(); setActive(false); }));
  }
  document.querySelectorAll('[data-control]').forEach((el) => bindButton(el, el.dataset.control));
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyW' || e.code === 'ArrowUp') input.throttle = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') input.brake = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
    if (e.code === 'Space') input.drift = true;
  }, { passive: false });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') input.throttle = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') input.brake = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
    if (e.code === 'Space') input.drift = false;
  });
  return input;
}
