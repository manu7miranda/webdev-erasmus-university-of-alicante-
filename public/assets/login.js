document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorContainer = document.getElementById('error-container');
  errorContainer.textContent = '';

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      window.location.href = '/events';
    } else {
      const data = await response.json();
      if (response.status === 401) {
        errorContainer.textContent = data.error || 'Wrong email or password';
      } else {
        errorContainer.textContent = 'An error occurred. Please try again.';
      }
    }
  } catch (error) {
    errorContainer.textContent = 'Network error. Please check your connection.';
  }
});
