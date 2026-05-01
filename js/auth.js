/* ============================================
   AUTH JS — Signup & Login Logic
   ============================================ */

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const role = document.querySelector('input[name="role"]:checked').value;

  const btn = document.getElementById('signup-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const res = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });

    if (res.requiresVerification) {
      document.getElementById('signup-form').style.display = 'none';
      const successEl = document.getElementById('auth-success');
      successEl.textContent = res.msg;
      successEl.style.display = 'block';
    }
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(res.token);
    setUser(res.user);

    const dashboard = res.user.role === 'recruiter' ? 'recruiter-dashboard.html' : 'agent-dashboard.html';
    window.location.href = dashboard;
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
}

function showError(msg) {
  const errEl = document.getElementById('auth-error');
  errEl.textContent = msg;
  errEl.style.display = 'block';
  setTimeout(() => {
    errEl.style.display = 'none';
  }, 5000);
}
