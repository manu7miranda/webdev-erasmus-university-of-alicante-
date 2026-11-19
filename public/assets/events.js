document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('user-name');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const errorState = document.getElementById('error-state');
  const dataState = document.getElementById('data-state');
  const logoutBtn = document.getElementById('logout-btn');
  const eventsContainer = document.getElementById('events-container');
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

  const EMPTY_TEXT = {
    sport: 'No upcoming sports events yet. New ones will appear here as soon as an organizer creates them.',
    social: 'No upcoming social events yet. New ones will appear here as soon as an organizer creates them.',
  };

  // The list from the server is kept here; the tabs only filter it, they never fetch.
  let allEvents = [];
  let currentCategory = 'sport';

  const notificationEl = document.createElement('div');
  notificationEl.id = 'notification-banner';
  notificationEl.setAttribute('role', 'status');
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
    if (userData.role === 'organizer') {
      setUpSuggestions();
    }
  } catch (err) {
    window.location.href = '/login';
    return;
  }

  // Organizer panel: model suggestion and the create-event form.
  // Only organizers get it; the server checks the role again (403).
  function setUpSuggestions() {
    const panel = document.getElementById('suggest-panel');
    const notesEl = document.getElementById('suggest-notes');
    const button = document.getElementById('suggest-btn');
    const statusEl = document.getElementById('suggest-status');
    const resultEl = document.getElementById('suggest-result');
    const textEl = document.getElementById('suggest-text');
    const useBtn = document.getElementById('suggest-use');
    const form = document.getElementById('create-form');
    const createStatus = document.getElementById('create-status');
    const descriptionEl = document.getElementById('create-description');
    panel.hidden = false;

    button.addEventListener('click', async () => {
      const notes = notesEl.value.trim();
      resultEl.hidden = true;
      if (!notes) {
        statusEl.textContent = 'Write a few notes first.';
        return;
      }
      button.disabled = true;
      statusEl.textContent = 'Thinking... this can take a few seconds.';
      try {
        const res = await fetch('/api/events/description-suggestion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.suggestion) {
          textEl.textContent = data.suggestion;
          resultEl.hidden = false;
          statusEl.textContent = '';
        } else {
          statusEl.textContent = data.message || 'Suggestion not available, write the description yourself.';
        }
      } catch (err) {
        statusEl.textContent = 'Could not reach the server. Try again in a moment.';
      } finally {
        button.disabled = false;
      }
    });

    // The organizer decides: the suggestion only goes into the form when they click.
    useBtn.addEventListener('click', () => {
      descriptionEl.value = textEl.textContent;
      descriptionEl.focus();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const dateValue = document.getElementById('create-date').value;
      const category = document.getElementById('create-category').value;
      const body = {
        title: document.getElementById('create-title').value,
        date: dateValue ? new Date(dateValue).toISOString() : '',
        total_places: Number(document.getElementById('create-places').value),
        category,
        description: descriptionEl.value,
      };
      submitBtn.disabled = true;
      createStatus.textContent = 'Creating the event...';
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 201) {
          createStatus.textContent = `Event created: ${data.title}`;
          form.reset();
          notesEl.value = '';
          resultEl.hidden = true;
          await loadEvents();
          selectTab(tabs.find((t) => t.dataset.category === category), false);
        } else {
          createStatus.textContent = data.message || data.error || 'The event could not be created.';
        }
      } catch (err) {
        createStatus.textContent = 'Could not reach the server. Try again in a moment.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function selectTab(tab, moveFocus) {
    currentCategory = tab.dataset.category;
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
    eventsContainer.setAttribute('aria-labelledby', tab.id);
    if (moveFocus) tab.focus();
    render();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab, false));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const step = e.key === 'ArrowRight' ? 1 : -1;
        selectTab(tabs[(index + step + tabs.length) % tabs.length], true);
        e.preventDefault();
      }
    });
  });

  function render() {
    const events = allEvents.filter((event) => event.category === currentCategory);

    if (events.length === 0) {
      dataState.style.display = 'none';
      emptyState.textContent = EMPTY_TEXT[currentCategory];
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
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
              notificationEl.style.color = '#c4001a';
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
              notificationEl.style.color = '#c4001a';
              button.disabled = false;
            }
          }
          await loadEvents();
        } catch (err) {
          notificationEl.textContent = 'An error occurred';
          notificationEl.style.color = '#c4001a';
          button.disabled = false;
        }
      });
    });
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
      allEvents = (await eventsRes.json()) || [];
      loadingState.style.display = 'none';
      render();
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
