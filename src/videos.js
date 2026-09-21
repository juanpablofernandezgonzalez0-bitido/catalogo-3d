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

    grid.innerHTML = `
      <div class="video-carousel-wrap">
        <div class="video-carousel" id="videoCarousel">
          ${videos.map((v, i) => `
            <div class="video-card" data-idx="${i}">
              <video muted loop playsinline preload="metadata"></video>
              <div class="video-play-overlay" data-idx="${i}">
                <svg viewBox="0 0 24 24" width="64" height="64"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.45)"/><polygon points="9.5,6.5 18.5,12 9.5,17.5" fill="white"/></svg>
              </div>
            </div>
          `).join('')}
        </div>
        ${videos.length > 1 ? `
          <button class="carousel-btn prev" data-dir="-1">&#8249;</button>
          <button class="carousel-btn next" data-dir="1">&#8250;</button>
          <div class="carousel-dots">
            ${videos.map((_, i) => `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></button>`).join('')}
          </div>
        ` : ''}
      </div>
    `;

    let current = 0;
    const carousel = document.getElementById('videoCarousel');
    const cards = carousel.querySelectorAll('.video-card');
    const dots = grid.querySelectorAll('.carousel-dot');
    let hlsInstances = [];

    function goTo(idx) {
      if (idx < 0 || idx >= videos.length) return;
      current = idx;
      carousel.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));

      cards.forEach((card, i) => {
        const video = card.querySelector('video');
        if (i === idx && !video.src && !video._hlsLoaded) {
          loadVideoHls(video, hlsUrls[i], videos[i].url);
        }
        if (i !== idx && !video.paused) {
          video.pause();
        }
      });
    }

    grid.querySelectorAll('.carousel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        goTo(current + parseInt(btn.dataset.dir));
      });
    });

    dots.forEach(dot => {
      dot.addEventListener('click', () => goTo(parseInt(dot.dataset.idx)));
    });

    grid.querySelectorAll('.video-play-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        const idx = parseInt(overlay.dataset.idx);
        goTo(idx);
        const video = cards[idx].querySelector('video');
        overlay.style.display = 'none';
        video.play();
      });
    });

    let touchStartX = 0;
    const wrap = grid.querySelector('.video-carousel-wrap');
    wrap.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
    }, { passive: true });

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    function loadVideoHls(video, hlsUrl, fallbackUrl) {
      video._hlsLoaded = true;
      if (isSafari) {
        video.src = hlsUrl;
        return;
      }
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({
          startLevel: -1,
          capLevelToPlayerSize: false,
          maxBufferLength: 30,
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hls.currentLevel = hls.levels.length - 1;
        });
        hlsInstances.push(hls);
      } else {
        video.src = fallbackUrl;
      }
    }

    const firstObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          goTo(0);
          firstObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '400px' });
    firstObserver.observe(grid);

  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}
