// Dashboard JS — shared logic for agent & recruiter dashboards

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const user = getUser();
  const page = window.location.pathname;

  // Availability toggle (agent)
  const toggle = document.getElementById('avail-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const label = document.getElementById('avail-label');
      if (label) label.textContent = toggle.classList.contains('active') ? 'Active' : 'Not Looking';
    });
  }

  // Populate dashboards
  if (page.includes('agent-dashboard')) {
    loadAgentDashboard();
  } else if (page.includes('recruiter-dashboard')) {
    loadRecruiterDashboard();
  }
});

async function loadAgentDashboard() {
  const welcomeTitle = document.getElementById('welcome-title');
  const statApps = document.getElementById('stat-apps');
  const statInterviews = document.getElementById('stat-interviews');
  const statScore = document.getElementById('stat-score');
  const statScoreLabel = document.getElementById('stat-score-label');
  const tbody = document.getElementById('apps-tbody');
  const recEl = document.getElementById('rec-jobs');
  
  try {
    const user = await apiFetch('/auth/me');
    setUser(user);

    if (welcomeTitle) {
      const username = user.name && user.name.toLowerCase() !== 'google' ? user.name : user.email.split('@')[0];
      welcomeTitle.textContent = `Welcome back, ${username}`;
    }

    if (statApps) statApps.textContent = user.appsSent || 0;
    if (statInterviews) statInterviews.textContent = user.interviewCount || 0;
    if (statScore) statScore.textContent = `${user.matchingScore || 0}%`;
    if (statScoreLabel) {
      const score = user.matchingScore || 0;
      if (score > 80) statScoreLabel.textContent = 'High Potential';
      else if (score > 50) statScoreLabel.textContent = 'Good Match';
      else statScoreLabel.textContent = 'Building Profile';
    }

    const jobs = await apiFetch('/jobs');
    if (recEl) {
      recEl.innerHTML = '';
      
      // Skill-based filtering
      const userSkills = (user.skills || []).map(s => s.toLowerCase());
      const recommendedJobs = jobs
        .map(job => {
          const jobSkills = (job.skills || '').split(',').map(s => s.trim().toLowerCase()).filter(s => s);
          const matchCount = jobSkills.filter(s => userSkills.includes(s)).length;
          return { ...job, matchCount };
        })
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 4);

      recommendedJobs.forEach((job) => {
        recEl.innerHTML += `
          <div class="stat-card" style="display:flex; align-items:center; gap:1rem; padding:1rem;">
            <div style="background:#000; color:#EFFF00; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">${job.title[0]}</div>
            <div style="min-width:0;">
              <h4 style="font-size:0.9rem; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.title}</h4>
              <p style="font-size:0.75rem; color:#666;">${job.company} · ${job.location}</p>
            </div>
          </div>`;
      });
    }

    // Load Applications
    
    if (tbody) {
      try {
        const myApps = await apiFetch('/applications/my'); 
        
        // Calculate Apps This Week
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentApps = myApps.filter(app => new Date(app.createdAt) >= sevenDaysAgo);
        const trendEl = document.getElementById('stat-apps-trend');
        if (trendEl) trendEl.textContent = `+${recentApps.length} this week`;

        const upcomingInterviews = myApps.filter(app => app.status === 'accepted' || app.status === 'interview');
        const interviewsNextEl = document.getElementById('stat-interviews-next');
        if (interviewsNextEl) {
          interviewsNextEl.textContent = upcomingInterviews.length > 0 
            ? `${upcomingInterviews.length} upcoming sessions` 
            : 'No upcoming';
        }

        if (myApps.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#999;">No active applications</td></tr>';
        } else {
          tbody.innerHTML = '';
          myApps.forEach(app => {
            let statusClass = 'badge-pending';
            let displayStatus = app.status;

            if (app.status === 'accepted') {
              statusClass = 'badge-approved';
              displayStatus = 'approved';
            } else if (app.status === 'interview') {
              statusClass = 'badge-interview';
              displayStatus = 'interview';
            } else if (app.status === 'rejected') {
              statusClass = 'badge-rejected';
              displayStatus = 'rejected';
            }

            const jobTitle = app.job ? app.job.title : 'Deleted Position';
            const companyName = app.job ? app.job.company : 'N/A';
            
            let chatBtn = '';
            if (app.status === 'accepted' || app.status === 'interview') {
              chatBtn = `<a href="chat.html?userId=${app.recruiter._id || app.recruiter}" class="btn btn-ghost btn-sm" style="margin-left:1rem; padding:2px 8px; font-size:0.65rem;">Chat</a>`;
            }

            tbody.innerHTML += `
              <tr>
                <td><strong>${jobTitle}</strong></td>
                <td>${companyName}</td>
                <td>
                  <span class="badge-pill ${statusClass}">${displayStatus.toUpperCase()}</span>
                  ${chatBtn}
                </td>
                <td>${new Date(app.updatedAt || app.createdAt).toLocaleDateString()}</td>
              </tr>`;
          });
        }
      } catch (e) {
         tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#999;">Error loading pipeline</td></tr>';
      }
    }
  } catch (err) { console.error('Agent dashboard load error:', err); }
}

async function loadRecruiterDashboard() {
  const recruiterH1 = document.getElementById('recruiter-h1');
  const statActiveRoles = document.getElementById('stat-active-roles');
  const statTotalCandidates = document.getElementById('stat-total-candidates');
  const statInterviewsToday = document.getElementById('stat-interviews-today');
  const statInterviewsBadge = document.getElementById('stat-interviews-badge');
  const jobsEl = document.getElementById('recent-jobs');
  const candEl = document.getElementById('top-candidates');

  try {
    const user = await apiFetch('/auth/me');
    setUser(user);
    const userId = user._id || user.id;

    if (recruiterH1) {
      const username = user.name && user.name.toLowerCase() !== 'google' ? user.name : user.email.split('@')[0];
      recruiterH1.textContent = `${username}'s Console`;
    }

    const jobs = await apiFetch('/jobs');
    const users = await apiFetch('/users');
    const agents = users.filter(u => u.role === 'agent');

    // Filter my jobs
    const myJobs = jobs.filter(j => {
      const posterId = typeof j.postedBy === 'object' ? (j.postedBy._id || j.postedBy.id) : j.postedBy;
      return posterId === userId;
    });

    // Stats
    if (statActiveRoles) statActiveRoles.textContent = myJobs.length;
    if (statTotalCandidates) statTotalCandidates.textContent = agents.length;
    if (statInterviewsToday) statInterviewsToday.textContent = user.interviewsToday || 0;
    if (statInterviewsBadge) {
      const iCount = user.interviewsToday || 0;
      if (iCount > 5) statInterviewsBadge.textContent = 'Very Busy';
      else if (iCount > 0) statInterviewsBadge.textContent = 'Scheduled';
      else statInterviewsBadge.textContent = 'Open Slot';
    }

    if (jobsEl) {
      jobsEl.innerHTML = '';
      if (myJobs.length === 0) {
        jobsEl.innerHTML = '<p style="color:#999; padding:1rem;">No jobs posted yet.</p>';
      } else {
        myJobs.slice(0, 4).forEach((job) => {
          jobsEl.innerHTML += `
            <div class="stat-card" style="padding:1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                <div style="background:#000; color:#EFFF00; width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:700;">${job.title[0]}</div>
                <span class="badge-pill badge-hot">Active</span>
              </div>
              <h4 style="font-size:1rem; margin-bottom:0.25rem;">${job.title}</h4>
              <p style="font-size:0.75rem; color:#666;">${job.location} • ${job.company}</p>
            </div>`;
        });
      }
    }

    if (candEl) {
      candEl.innerHTML = '';
      if (agents.length === 0) candEl.innerHTML = '<p style="color:#999; padding:1rem;">Finding candidates...</p>';
      agents.slice(0, 5).forEach(agent => {
        const agentName = agent.name && agent.name.toLowerCase() !== 'google' ? agent.name : agent.email.split('@')[0];
        candEl.innerHTML += `
          <div class="stat-card" style="display:flex; align-items:center; gap:1.25rem; padding:1.25rem;">
            <div onclick="openProfileModal('${agent._id || agent.id}', event)" style="cursor:pointer; width:40px; height:40px; border-radius:50%; background:#f0f0f0; display:flex; align-items:center; justify-content:center; font-weight:700; border:1px solid #ddd;">${agentName[0]}</div>
            <div style="flex:1;">
              <h4 style="font-size:0.95rem; margin-bottom:2px;">${agentName}</h4>
              <p style="font-size:0.75rem; color:#666;">${agent.bio || 'Available for matching'}</p>
            </div>
            <a href="chat.html?userId=${agent._id || agent.id}" class="btn btn-ghost btn-sm">Chat</a>
          </div>`;
      });
    }

    // Load Pending Apps
    const pendingAppsEl = document.getElementById('pending-apps');
    if (pendingAppsEl) {
      const apps = await apiFetch('/applications/my');
      const pending = apps.filter(a => a.status === 'pending');
      
      if (pending.length === 0) {
        pendingAppsEl.innerHTML = '<p style="color:#999; padding:1rem; font-size:0.9rem;">No pending applications.</p>';
      } else {
        pendingAppsEl.innerHTML = '';
        pending.forEach(app => {
          const agentName = app.agent.name && app.agent.name.toLowerCase() !== 'google' ? app.agent.name : app.agent.email.split('@')[0];
          
          // Calculate individual match for this specific application display
          const agentSkills = app.agent.skills || [];
          const jobSkills = (app.job.skills || '').split(',').map(s => s.trim().toLowerCase()).filter(s => s);
          let matchScore = 0;
          if (jobSkills.length > 0) {
            const common = agentSkills.filter(s => jobSkills.includes(s.toLowerCase()));
            matchScore = Math.round((common.length / jobSkills.length) * 100);
          } else {
            matchScore = 85; 
          }

          pendingAppsEl.innerHTML += `
            <div class="stat-card" style="display:flex; align-items:center; gap:1.25rem; padding:1.25rem;">
              <div onclick="openProfileModal('${app.agent._id || app.agent.id}', event)" style="cursor:pointer; width:40px; height:40px; border-radius:50%; background:var(--yellow); color:#000; display:flex; align-items:center; justify-content:center; font-weight:900; border:1px solid #000; flex-shrink:0;">${agentName[0]}</div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2px;">
                  <h4 style="font-size:0.95rem;">${agentName}</h4>
                  <span style="font-size: 0.65rem; font-weight: 700; color: ${matchScore > 70 ? '#22c55e' : '#f59e0b'};">${matchScore}% ALIGNMENT</span>
                </div>
                <p style="font-size:0.75rem; color:#999; margin-bottom:4px;">Applied for ${app.job.title}</p>
                <p style="font-size:0.75rem; color:#666;">Experience: ${app.agent.experience || 'Verified Associate'}</p>
              </div>
              <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                <button onclick="updateAppStatus('${app._id}', 'accepted')" class="btn btn-primary btn-sm">Interview</button>
                <button onclick="updateAppStatus('${app._id}', 'rejected')" class="btn btn-ghost btn-sm">Pass</button>
              </div>
            </div>`;
        });
      }
    }
  } catch (err) { console.error('Recruiter dashboard load error:', err); }
}

window.updateAppStatus = async (appId, status) => {
  try {
    await apiFetch(`/applications/${appId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    alert(`Application ${status === 'accepted' ? 'approved and moved to Interview' : 'rejected'}`);
    location.reload();
  } catch (err) {
    alert(err.message);
  }
};

let activeProfileTarget = null;

window.openProfileModal = async (userId, event) => {
  const modal = document.getElementById('profile-modal');
  const card = modal ? modal.querySelector('.modal-card') : null;
  const content = document.getElementById('profile-modal-content');
  if (!modal || !content || !card) return;

  // Store target for scroll tracking
  activeProfileTarget = event ? event.target : null;

  try {
    // 1. Fetch data BEFORE showing the modal to prevent height-jump "glitches"
    const user = await apiFetch(`/users/${userId}`);
    const name = user.name && user.name.toLowerCase() !== 'google' ? user.name : user.email.split('@')[0];
    const skills = user.skills || [];

    // 2. Prepare the content
    content.innerHTML = `
      <div style="display:flex; align-items:center; gap:1.25rem; margin-bottom:1.5rem;">
        <div style="width:60px; height:60px; border-radius:50%; background:var(--yellow); color:#000; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:900; border:2px solid #000;">${name[0]}</div>
        <div>
          <h2 style="font-family:var(--font-heading); text-transform:uppercase; letter-spacing:-0.05em; font-size:1.25rem; margin:0;">${name}</h2>
          <p style="color:var(--gray); font-size:0.7rem; margin:2px 0 0;">${user.location || 'Remote Agent'}</p>
        </div>
      </div>

      <div style="margin-bottom:1.25rem;">
        <h4 style="font-size:0.65rem; text-transform:uppercase; color:#999; margin-bottom:0.5rem; letter-spacing:0.1em;">Skills & Expertise</h4>
        <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
          ${skills.map(s => `
            <span class="badge-pill" style="background:#000; color:#fff; font-size:0.6rem; border:1px solid #000;">
              ${s.toUpperCase()}
            </span>`).join('') || '<span style="color:#999; font-size:0.7rem;">No skills listed</span>'}
        </div>
      </div>

      <div style="margin-bottom:1.5rem;">
        <p style="font-size:0.85rem; line-height:1.5; color:#333; margin:0;">${user.bio || 'Available for high-impact matching.'}</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        ${user.resumeDoc ? `
          <a href="${user.resumeDoc}" target="_blank" class="btn btn-primary" style="justify-content:center; width:100%;">View Full CV / Resume</a>
        ` : `
          <button class="btn btn-ghost" disabled style="width:100%; opacity:0.5; cursor:not-allowed;">No CV Uploaded</button>
        `}
        <a href="chat.html?userId=${userId}" class="btn btn-ghost btn-sm" style="justify-content:center; width:100%;">Send Message</a>
      </div>
    `;

    // 3. Now show the modal with full content
    modal.style.display = 'flex';
    modal.style.background = 'transparent'; 
    modal.style.pointerEvents = 'none'; 
    card.style.pointerEvents = 'auto'; 
    card.style.position = 'fixed';
    card.style.margin = '0';
    card.style.zIndex = '3000';

    const updatePosition = () => {
      if (!activeProfileTarget || modal.style.display === 'none') return;
      const rect = activeProfileTarget.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        closeProfileModal();
        return;
      }

      let top = rect.top - 20;
      const cardHeight = card.offsetHeight;
      if (top + cardHeight > window.innerHeight) {
        top = window.innerHeight - cardHeight - 20;
      }
      if (top < 10) top = 10;

      card.style.top = `${top}px`;
      card.style.left = `${rect.right + 20}px`; 
    };

    updatePosition();
    setTimeout(() => modal.classList.add('active'), 10);

    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

  } catch (err) {
    console.error('Profile fetch error:', err);
  }
};

window.closeProfileModal = () => {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) {
        modal.style.display = 'none';
        activeProfileTarget = null;
      }
    }, 300);
  }
};
