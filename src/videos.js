export async function renderVideos() {
  try {
    const res = await fetch('/api/videos');
    const videos = await res.json();
    const grid = document.getElementById('grid-videos');
    if (!grid) return;
    if (!videos.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:2rem">Próximamente</p>';
      return;
    }
    grid.innerHTML = videos.map(v => `
      <div class="video-card">
        <div class="video-wrap">
          <video src="${v.url}" muted loop preload="metadata" playsinline></video>
          <button class="video-play-btn" aria-label="Reproducir">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        ${v.title ? `<h3>${v.title}</h3>` : ''}
        ${v.desc ? `<p class="video-desc">${v.desc}</p>` : ''}
      </div>
    `).join('');

    grid.querySelectorAll('.video-card').forEach(card => {
      const video = card.querySelector('video');
      const btn = card.querySelector('.video-play-btn');
      btn.addEventListener('click', () => {
        if (video.paused) {
          video.play();
          btn.style.display = 'none';
        } else {
          video.pause();
        }
      });
      video.addEventListener('click', () => {
        if (video.paused) {
          video.play();
          btn.style.display = 'none';
        } else {
          video.pause();
          btn.style.display = '';
        }
      });
      video.addEventListener('pause', () => { btn.style.display = ''; });
      video.addEventListener('ended', () => { btn.style.display = ''; });
    });
  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}