document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('user-name');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const errorState = document.getElementById('error-state');
  const dataState = document.getElementById('data-state');
  const logoutBtn = document.getElementById('logout-btn');

  const eventsContainer = document.getElementById('events-container');
  const notificationEl = document.createElement('div');
  notificationEl.id = 'notification-banner';
  notificationEl.style.marginBottom = '16px';
  notificationEl.style.fontWeight = 'bold';
  eventsContainer.parentNode.insertBefore(notificationEl, eventsContainer);

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

  async function loadEvents() {
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    dataState.style.display = 'none';

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
            <h2>${escapeHtml(event.title)}</h2>
            <div class="event-meta">
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
              <p><strong>Free Places:</strong> ${event.free_places} / ${event.total_places}</p>
              ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
              <div style="margin-top: 12px;">
                ${
                  event.my_registration_id == null
                    ? `<button class="action-btn signup-btn" data-event-id="${event.id}">Sign up</button>`
                    : `<button class="action-btn cancel-btn" data-reg-id="${event.my_registration_id}">Cancel</button>`
                }
              </div>
            </div>
          </div>
        `).join('');

        dataState.querySelectorAll('.action-btn').forEach(button => {
          button.addEventListener('click', async () => {
            button.disabled = true;
            notificationEl.textContent = '';

            try {
              if (button.classList.contains('signup-btn')) {
                const eventId = button.getAttribute('data-event-id');
                const res = await fetch(`/api/events/${eventId}/registrations`, {
                  method: 'POST',
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                  notificationEl.textContent = data.message || 'You are signed up';
                  notificationEl.style.color = '#1e7f3a';
                } else {
                  notificationEl.textContent = data.message || data.error || 'Failed to sign up';
                  notificationEl.style.color = '#d70015';
                  button.disabled = false;
                }
              } else if (button.classList.contains('cancel-btn')) {
                const regId = button.getAttribute('data-reg-id');
                const res = await fetch(`/api/registrations/${regId}`, {
                  method: 'DELETE',
                });
                if (res.status === 204) {
                  notificationEl.textContent = 'Sign-up cancelled';
                  notificationEl.style.color = '#1e7f3a';
                } else {
                  const data = await res.json().catch(() => ({}));
                  notificationEl.textContent = data.message || data.error || 'Failed to cancel';
                  notificationEl.style.color = '#d70015';
                  button.disabled = false;
                }
              }
              await loadEvents();
            } catch (err) {
              notificationEl.textContent = 'An error occurred';
              notificationEl.style.color = '#d70015';
              button.disabled = false;
            }
          });
        });
      }
    } catch (err) {
      loadingState.style.display = 'none';
      errorState.style.display = 'block';
    }
  }

  await loadEvents();

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
