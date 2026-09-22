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
      grid.innerHTML = '<p style="text-align:center;color:#999;padding:2rem">Proximamente</p>';
      return;
    }

    const hlsUrls = videos.map(v =>
      v.url.replace(/\/upload\//, '/upload/sp_auto/').replace(/\.[^.]+$/, '.m3u8')
    );

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    grid.innerHTML = videos.map((v, i) => `
      <div class="video-card">
        <video muted loop playsinline preload="metadata"></video>
      </div>
    `).join('');

    const cards = grid.querySelectorAll('.video-card');

    cards.forEach((card, i) => {
      const video = card.querySelector('video');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !video._loaded) {
            video._loaded = true;
            if (isSafari) {
              video.src = hlsUrls[i];
            } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
              const hls = new Hls({ startLevel: -1, maxBufferLength: 30 });
              hls.loadSource(hlsUrls[i]);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                hls.currentLevel = hls.levels.length - 1;
                video.play().catch(() => {});
              });
            } else {
              video.src = videos[i].url;
              video.play().catch(() => {});
            }
            video.play().catch(() => {});
            observer.unobserve(card);
          }
        });
      }, { rootMargin: '400px' });
      observer.observe(card);
    });
  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}
