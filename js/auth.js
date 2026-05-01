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
      document.querySelector('.role-toggle').style.display = 'none';
      document.querySelector('.subtitle').style.display = 'none';
      document.querySelector('.auth-card h1').style.display = 'none';
      
      const successEl = document.getElementById('auth-success');
      const msgEl = document.getElementById('success-msg');
      
      msgEl.innerHTML = `Verification mail sent to <span class="email-highlight">${email}</span>!<br>Please check your inbox to activate your account.`;
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
