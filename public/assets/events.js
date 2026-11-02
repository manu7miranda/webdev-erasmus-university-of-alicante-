document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('user-name');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const errorState = document.getElementById('error-state');
  const dataState = document.getElementById('data-state');
  const logoutBtn = document.getElementById('logout-btn');

  // Fetch current user /api/me
  try {
    const meRes = await fetch('/api/me');
    if (!meRes.ok) {
      window.location.href = '/login';
      return;
    }
    const userData = await meRes.json();
    userNameEl.textContent = userData.name;
  } catch (err) {
    window.location.href = '/login';
    return;
  }

  // Fetch upcoming events /api/events
  try {
    const eventsRes = await fetch('/api/events');
    if (!eventsRes.ok) {
      if (eventsRes.status === 401) {
        window.location.href = '/login';
        return;
      }
      throw new Error('Failed to fetch events');
    }
    const events = await eventsRes.json();

    loadingState.style.display = 'none';

    if (!events || events.length === 0) {
      emptyState.style.display = 'block';
    } else {
      dataState.style.display = 'block';
      dataState.innerHTML = events.map(event => `
        <div class="event-card">
          <h3>${escapeHtml(event.title)}</h3>
          <div class="event-meta">
            <p><strong>Date:</strong> ${new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
            <p><strong>Free Places:</strong> ${event.free_places} / ${event.total_places}</p>
            ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
  }

  // Logout handler
  logoutBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout failed', err);
    }
  });
});


function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
