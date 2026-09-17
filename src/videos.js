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

    grid.innerHTML = videos.map((v, i) => `
      <div class="video-card" data-video-idx="${i}">
        <video muted loop playsinline preload="metadata" poster=""></video>
        <div class="video-play-overlay">
          <svg viewBox="0 0 24 24" width="56" height="56"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.45)"/><polygon points="9.5,6.5 18.5,12 9.5,17.5" fill="white"/></svg>
        </div>
      </div>
    `).join('');

    const hlsUrls = videos.map(v => {
      const base = v.url.replace(/\/upload\//, '/upload/sp_auto/').replace(/\.[^.]+$/, '.m3u8');
      return base;
    });

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    grid.querySelectorAll('.video-card').forEach((card, i) => {
      const video = card.querySelector('video');
      const overlay = card.querySelector('.video-play-overlay');
      const url = hlsUrls[i];
      const videoUrl = videos[i].url;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (isSafari) {
              video.src = url;
            } else {
              loadHls(video, url, videoUrl);
            }
            observer.unobserve(card);
          }
        });
      }, { rootMargin: '600px' });
      observer.observe(card);

      overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        video.play();
      });
    });
  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}

function loadHls(video, hlsUrl, fallbackUrl) {
  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    const hls = new Hls({ startFragPrefetch: true });
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {});
    return;
  }
  video.src = fallbackUrl;
}
