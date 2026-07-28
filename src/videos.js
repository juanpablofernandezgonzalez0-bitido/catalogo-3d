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
          <video src="${v.url}" autoplay muted loop playsinline></video>
        </div>
        <div class="video-caption">
          ${v.title ? `<h3>${v.title}</h3>` : ''}
          ${v.desc ? `<p class="video-desc">${v.desc}</p>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Error loading videos:', e);
  }
}