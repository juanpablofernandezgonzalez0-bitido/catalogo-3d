export function initScene(canvas) {
  canvas.style.display = 'none';

  const container = document.createElement('div');
  container.className = 'particles-container';
  container.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 4;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      animation-delay:${Math.random()*20}s;
      animation-duration:${15+Math.random()*25}s;
      opacity:${0.2+Math.random()*0.4};
    `;
    container.appendChild(p);
  }

  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'shape-float';
    const size = 20 + Math.random() * 30;
    const shapes = ['50%', '30% 70% 70% 30% / 30% 30% 70% 70%', '50% 0 50% 100%'];
    s.style.cssText = `
      width:${size}px;height:${size}px;
      border-radius:${shapes[i % 3]};
      left:${10+Math.random()*80}%;top:${10+Math.random()*80}%;
      animation-delay:${Math.random()*15}s;
      animation-duration:${12+Math.random()*18}s;
      opacity:${0.08+Math.random()*0.12};
      border:1px solid rgba(239,173,209,0.15);
    `;
    container.appendChild(s);
  }

  const hero = document.getElementById('hero');
  if (hero) hero.appendChild(container);
}
