import './style.css';
import { initScene } from './three-scene.js';
import { initAnimations } from './animations.js';
import { renderProducts } from './products.js';
import { renderVideos } from './videos.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function hideLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.add('hidden');
}

if (document.readyState === 'complete') {
  hideLoading();
} else {
  window.addEventListener('load', hideLoading);
}

setTimeout(hideLoading, 4000);

try {
  const canvas = document.getElementById('three-canvas');
  if (canvas) {
    initScene(canvas);
  }
} catch (e) {
  console.warn('3D init error:', e);
}

(async () => {
  try {
    await Promise.all([
      renderProducts(),
      renderVideos(),
    ]);
  } catch (e) {
    console.warn('Render error:', e);
  }
  ScrollTrigger.refresh();
  try {
    initAnimations();
  } catch (e) {
    console.warn('Animations init error:', e);
  }
  init3DTilt();
})();

function init3DTilt() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    let raf = null;
    card.addEventListener('mousemove', (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `translateY(-6px) scale(1.01) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        card.style.transition = 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)';
      });
    });
    card.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = '';
    });
  });
}
