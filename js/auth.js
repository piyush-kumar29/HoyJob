// Auth JS — Custom UI with Clerk SDK Logic

async function handleSignup(e) {
  e.preventDefault();
  if (!window.Clerk || !window.Clerk.isReady()) return;

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role = document.querySelector('input[name="role"]:checked')?.value || 'agent';

  const nameParts = name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || ' ';

  try {
    // 1. Create the sign up attempt
    const signUp = await window.Clerk.client.signUp.create({
      emailAddress: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      unsafeMetadata: { role: role } // Store role in Clerk (accessible by client)
    });

    // 2. Prepare email link verification
    await signUp.prepareEmailAddressVerification({
      strategy: 'email_link',
      redirectUrl: window.location.origin + '/pages/login.html'
    });

    // 3. UI Update: Show check email message
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('clerk-signup-msg').style.display = 'block';
    showSuccess('Verification link sent! Please check your inbox.');

  } catch (err) {
    console.error('Clerk Signup Error:', err);
    showError(err.errors ? err.errors[0].longMessage : err.message);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  if (!window.Clerk || !window.Clerk.isReady()) return;

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const signIn = await window.Clerk.client.signIn.create({
      identifier: email,
      password: password,
    });

    if (signIn.status === 'complete') {
      await window.Clerk.setActive({ session: signIn.createdSessionId });
      
      // Get user to determine redirect
      const user = await apiFetch('/auth/me'); // Sync with our DB
      const dashboardLink = user.role === 'recruiter' ? 'recruiter-dashboard.html' : 'agent-dashboard.html';
      window.location.href = dashboardLink;
    } else {
      // Could be 'needs_identifier' or other states
      showError('Login incomplete. Please ensure your email is verified.');
    }
  } catch (err) {
    console.error('Clerk Login Error:', err);
    showError(err.errors ? err.errors[0].longMessage : err.message);
  }
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showSuccess(msg) {
  const el = document.getElementById('auth-success');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
