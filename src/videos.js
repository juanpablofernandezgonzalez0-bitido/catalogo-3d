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

    grid.innerHTML = videos.map((v, i) => {
      const publicId = v.url.replace(/.*\/upload\//, '').replace(/\.[^.]+$/, '');
      return `
        <div class="video-card">
          <video
            id="cld-video-${i}"
            class="cld-video-player-cards"
            controls
            muted
            loop
            playsinline
            preload="metadata"
            data-cld-public-id="${publicId}"
          ></video>
        </div>
      `;
    }).join('');

    if (window.cloudinary) {
      videos.forEach((v, i) => {
        try {
          const el = document.getElementById(`cld-video-${i}`);
          if (!el) return;
          window.cloudinary.videoPlayer(el, {
            cloud_name: 'dkz2x6emo',
            autoplay: false,
            muted: true,
            loop: true,
            controls: 'play-large',
            fluid: true,
            aspectRatio: '9:16',
          });
        } catch (e) {
          console.warn('CldPlayer error:', e);
        }
      });
    }
  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}
