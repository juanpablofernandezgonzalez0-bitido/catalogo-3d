import './style.css';
import { initScene } from './three-scene.js';
import { renderProducts, initHeroSlider } from './products.js';

function hideLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.add('hidden');
}

requestAnimationFrame(() => setTimeout(hideLoading, 300));

try {
  const canvas = document.getElementById('three-canvas');
  if (canvas) initScene(canvas);
} catch (e) {}

(async () => {
  let products = [];
  try {
    products = await renderProducts();
  } catch (e) {
    console.warn('Render error:', e);
  }
  try {
    initHeroSlider(products || []);
  } catch (e) {
    console.warn('Hero slider error:', e);
  }
  hideLoading();

  try {
    const [{ initAnimations }, { ScrollTrigger }] = await Promise.all([
      import('./animations.js'),
      import('gsap/ScrollTrigger'),
    ]);
    ScrollTrigger.refresh();
    initAnimations();
  } catch (e) {}

  try {
    const { renderVideos } = await import('./videos.js');
    await renderVideos();
  } catch (e) {}

  init3DTilt();
  document.addEventListener('products-rendered', init3DTilt);
})();

function init3DTilt() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = '1';
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
