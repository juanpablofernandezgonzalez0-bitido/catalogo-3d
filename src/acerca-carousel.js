const STEP_MS = 3500;
const RESUME_MS = 4000;
const ANIM = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';

export function initAcercaCarousel() {
  const root = document.querySelector('.acerca-carousel');
  if (!root) return;

  const track = root.querySelector('.acerca-track');
  const dotsWrap = root.querySelector('.acerca-dots');
  const prevBtn = root.querySelector('.acerca-prev');
  const nextBtn = root.querySelector('.acerca-next');
  if (!track) return;

  const originals = Array.from(track.children);
  const count = originals.length;
  if (count < 2) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  originals.forEach((el) => {
    const clone = el.cloneNode(true);
    clone.setAttribute('data-clone', '1');
    clone.setAttribute('aria-hidden', 'true');
    clone.classList.add('visible');
    track.appendChild(clone);
  });

  const dots = originals.map((_, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'acerca-dot';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-label', 'Imagen ' + (i + 1));
    btn.setAttribute('aria-selected', 'false');
    btn.addEventListener('click', () => goTo(i));
    if (dotsWrap) dotsWrap.appendChild(btn);
    return btn;
  });

  let index = 0;
  let timer = null;
  let paused = false;
  let dragging = false;
  let startX = 0;
  let delta = 0;
  let resumeAt = 0;

  function stride() {
    const a = track.children[0];
    const b = track.children[1];
    if (!a || !b) return 0;
    return b.offsetLeft - a.offsetLeft;
  }

  function normalize() {
    if (index >= count || index < 0) {
      index = ((index % count) + count) % count;
      render(false);
    }
  }

  function render(animate) {
    track.style.transition = animate && !reduceMotion ? ANIM : 'none';
    track.style.transform = 'translate3d(' + -index * stride() + 'px, 0, 0)';
    const active = ((index % count) + count) % count;
    for (let i = 0; i < dots.length; i++) {
      dots[i].setAttribute('aria-selected', String(i === active));
    }
  }

  function arm(delay) {
    clearTimeout(timer);
    if (paused || reduceMotion || document.hidden) return;
    timer = setTimeout(tick, delay || STEP_MS);
  }

  function tick() {
    index += 1;
    render(true);
    arm();
  }

  function goTo(target) {
    if (target === index) return;
    if (target < 0) {
      if (index === 0) {
        index = count;
        render(false);
        void track.offsetWidth;
        target = count + target;
      } else {
        target = 0;
      }
    }
    index = target;
    render(true);
    arm(RESUME_MS);
  }

  function step(dir) {
    if (dir > 0) {
      index += 1;
    } else if (index === 0) {
      index = count;
      render(false);
      void track.offsetWidth;
      index -= 1;
    } else {
      index -= 1;
    }
    render(true);
    arm(RESUME_MS);
  }

  function setPaused(v) {
    paused = v;
    arm(resumeAt);
  }

  track.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'transform') normalize();
  });

  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));

  root.addEventListener('pointerenter', () => setPaused(true));
  root.addEventListener('pointerleave', () => setPaused(false));
  root.addEventListener('focusin', () => setPaused(true));
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget)) setPaused(false);
  });

  track.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    delta = 0;
    track.classList.add('is-dragging');
    track.style.transition = 'none';
    try {
      track.setPointerCapture(e.pointerId);
    } catch (err) {}
    resumeAt = RESUME_MS;
    paused = true;
  });

  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    delta = e.clientX - startX;
    track.style.transform = 'translate3d(' + (-index * stride() + delta) + 'px, 0, 0)';
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    resumeAt = 0;

    const unit = stride() || 1;
    let target = Math.round(index - delta / unit);
    if (Math.abs(delta) < unit * 0.18) target = index;
    if (target > count * 2 - 1) target = count * 2 - 1;
    if (target === index) {
      render(true);
      paused = false;
      arm();
      return;
    }
    goTo(target);
    paused = false;
    arm(RESUME_MS);
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  track.addEventListener('dragstart', (e) => e.preventDefault());

  document.addEventListener('visibilitychange', () => arm());

  window.addEventListener('resize', () => render(false));

  render(false);
  arm();
}
