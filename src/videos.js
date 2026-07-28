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
    grid.innerHTML = videos.map(v => `
      <div class="video-card">
        <video src="${v.url}" autoplay muted loop playsinline></video>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}