import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach(char => {
    const s = document.createElement('span');
    s.textContent = char === ' ' ? '\u00A0' : char;
    s.style.display = 'inline-block';
    el.appendChild(s);
  });
}

export function initAnimations() {
  // 4. Title character reveal (works both directions)
  document.querySelectorAll('.section-header').forEach(header => {
    const h2 = header.querySelector('h2');
    const num = header.querySelector('.section-number');
    const p = header.querySelector('p');
    if (!h2) return;

    splitChars(h2);
    const chars = h2.querySelectorAll('span');
    gsap.set(chars, { opacity: 0, y: 25, rotateZ: -8 });

    function revealTitle() {
      gsap.killTweensOf(chars);
      gsap.set(chars, { opacity: 0, y: 25, rotateZ: -8 });
      gsap.to(chars, { opacity: 1, y: 0, rotateZ: 0, stagger: 0.035, duration: 0.45, ease: 'power3.out' });
      if (num) {
        gsap.killTweensOf(num);
        gsap.set(num, { opacity: 0, y: 20 });
        gsap.to(num, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      }
      if (p) {
        gsap.killTweensOf(p);
        gsap.set(p, { opacity: 0, y: 15 });
        gsap.to(p, { opacity: 1, y: 0, duration: 0.5, delay: 0.15, ease: 'power2.out' });
      }
    }

    ScrollTrigger.create({
      trigger: header,
      start: 'top 85%',
      onEnter: revealTitle,
      onEnterBack: revealTitle,
    });
  });

  // 5. Prices stagger per card (works both directions)
  document.querySelectorAll('.product-card').forEach(card => {
    const rows = card.querySelectorAll('.price-row');
    if (!rows.length) return;
    gsap.set(rows, { opacity: 0, x: 30 });

    function revealPrices() {
      gsap.killTweensOf(rows);
      gsap.set(rows, { opacity: 0, x: 30 });
      gsap.to(rows, { opacity: 1, x: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out' });
    }

    ScrollTrigger.create({
      trigger: card,
      start: 'top 88%',
      onEnter: revealPrices,
      onEnterBack: revealPrices,
    });
  });

  // Product card entrance (existing)
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      onEnter: () => {
        setTimeout(() => el.classList.add('visible'), i * 80);
      },
    });
  });

  const kit = document.querySelector('.kit-showcase');
  if (kit) {
    ScrollTrigger.create({
      trigger: kit,
      start: 'top 80%',
      onEnter: () => kit.classList.add('visible'),
    });
  }

  const paymentBox = document.querySelector('.payment-box');
  if (paymentBox) {
    ScrollTrigger.create({
      trigger: paymentBox,
      start: 'top 85%',
      onEnter: () => paymentBox.classList.add('visible'),
    });
  }

  const stepCards = document.querySelectorAll('.step-card');
  stepCards.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      onEnter: () => {
        setTimeout(() => el.classList.add('visible'), i * 100);
      },
    });
  });

  const acercaItems = document.querySelectorAll('.acerca-item');
  acercaItems.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      onEnter: () => {
        setTimeout(() => el.classList.add('visible'), i * 90);
      },
    });
  });

  // Editorial banner — simple reveal on scroll
  document.querySelectorAll('.editorial-banner').forEach((banner) => {
    const text = banner.querySelector('.editorial-text');
    if (!text) return;
    gsap.set(text, { opacity: 0, y: 20 });
    ScrollTrigger.create({
      trigger: banner,
      start: 'top 90%',
      onEnter: () => {
        gsap.to(text, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      },
    });
  });

  // 7. Magnetic WhatsApp button
  const waBtn = document.querySelector('.payment-box .btn-primary');
  if (waBtn) {
    let raf = null;
    waBtn.addEventListener('mousemove', (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = waBtn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        waBtn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });
    });
    waBtn.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      waBtn.style.transform = '';
      waBtn.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => { waBtn.style.transition = ''; }, 300);
    });
  }

  // Navbar scroll
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top -80px',
    onUpdate: (self) => {
      const nav = document.getElementById('navbar');
      if (nav) {
        nav.classList.toggle('scrolled', self.progress > 0);
      }
    },
  });

  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  const sections2 = document.querySelectorAll('.section-product');
  const updateActiveLink = () => {
    let current = '';
    sections2.forEach((sec) => {
      const top = sec.offsetTop - 200;
      if (scrollY >= top) {
        current = '#' + sec.id;
      }
    });
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === current);
    });
  };

  window.addEventListener('scroll', updateActiveLink);
  updateActiveLink();
}
