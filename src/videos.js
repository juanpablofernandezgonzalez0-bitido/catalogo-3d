export async function renderVideos() {
  try {
    const res = await fetch('/api/videos');
    const videos = await res.json();
    const grid = document.getElementById('grid-videos');
    if (!grid) return;

    if (videos.length) {
      const titleEl = document.getElementById('videos-title');
      const subEl = document.getElementById('videos-subtitle');
      if (titleEl) titleEl.textContent = videos[0].title || 'Videos';
      if (subEl) subEl.textContent = videos[0].desc || '';
    }

    if (!videos.length) {
      grid.innerHTML = '<p style="text-align:center;color:#999;padding:2rem">Próximamente</p>';
      return;
    }
    grid.innerHTML = videos.map((v, i) => `
      <div class="video-card">
        <video src="${v.url}" muted loop playsinline preload="none" data-lazy-video playsinline></video>
        <div class="video-play-overlay" onclick="this.previousElementSibling.play();this.style.display='none'">
          <svg viewBox="0 0 24 24" width="48" height="48"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.4)"/><polygon points="9,6 19,12 9,18" fill="white"/></svg>
        </div>
      </div>
    `).join('');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const v = entry.target.querySelector('video');
          if (v && v.dataset.lazyVideo !== undefined) {
            v.preload = 'auto';
            v.load();
            delete v.dataset.lazyVideo;
          }
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '400px' });

    grid.querySelectorAll('.video-card').forEach(card => observer.observe(card));
  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}