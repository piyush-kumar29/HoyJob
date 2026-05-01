// Auth JS — Clerk Integration

async function initAuthPage() {
  // Wait for Clerk to be ready
  const checkClerk = setInterval(() => {
    if (window.Clerk && window.Clerk.isReady()) {
      clearInterval(checkClerk);
      renderClerkComponents();
    }
  }, 100);
}

function renderClerkComponents() {
  const signupContainer = document.getElementById('clerk-signup');
  const loginContainer = document.getElementById('clerk-login');

  if (signupContainer) {
    window.Clerk.mountSignUp(signupContainer, {
      appearance: {
        variables: {
          colorPrimary: '#EFFF00',
          colorBackground: '#ffffff',
          colorText: '#000000'
        }
      }
    });
  }

  if (loginContainer) {
    window.Clerk.mountSignIn(loginContainer, {
      appearance: {
        variables: {
          colorPrimary: '#EFFF00',
          colorBackground: '#ffffff',
          colorText: '#000000'
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initAuthPage);
