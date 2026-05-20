// UI Components & Chart Managers - TeamFlow

// 1. Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';
  if (type === 'info') icon = 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'fade-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 2. Render Task Card
function createTaskCard(task, projectRole, onClickHandler) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id = task.id;
  
  const priorityClass = `priority-${task.priority.toLowerCase()}`;
  
  // Date status calculation
  let dateHtml = '';
  if (task.due_date) {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.due_date < today && task.status !== 'Done';
    const dateClass = isOverdue ? 'task-due-date overdue' : 'task-due-date';
    
    dateHtml = `
      <div class="${dateClass}">
        <i class="fa-regular fa-calendar"></i>
        <span>${task.due_date}</span>
        ${isOverdue ? '<span style="font-size:0.625rem; font-weight:700;">(OVERDUE)</span>' : ''}
      </div>
    `;
  } else {
    dateHtml = `<div class="task-due-date"><i class="fa-regular fa-calendar"></i> <span>No due date</span></div>`;
  }

  // Assignee rendering
  let assigneeHtml = '';
  if (task.assignee_id) {
    const initials = task.assignee_name
      ? task.assignee_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'U';
    assigneeHtml = `
      <div class="task-card-assignee" title="Assigned to ${task.assignee_name || 'Member'}">
        <div class="assignee-avatar">${initials}</div>
        <span class="assignee-name">${task.assignee_name.split(' ')[0]}</span>
      </div>
    `;
  } else {
    assigneeHtml = `
      <div class="task-card-assignee" title="Unassigned">
        <div class="assignee-avatar" style="background: rgba(255,255,255,0.05); color: var(--text-muted);"><i class="fa-solid fa-user-plus" style="font-size: 0.625rem;"></i></div>
        <span class="assignee-name" style="color: var(--text-muted);">Unassigned</span>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="task-card-header">
      <h4 class="task-card-title">${escapeHTML(task.title)}</h4>
      <span class="priority-badge priority-indicator ${priorityClass}">${task.priority}</span>
    </div>
    <p class="task-card-desc">${escapeHTML(task.description || 'No description provided.')}</p>
    <div class="task-card-footer">
      ${dateHtml}
      ${assigneeHtml}
    </div>
  `;

  // Attach interactive click details handler
  card.addEventListener('click', () => {
    onClickHandler(task);
  });

  return card;
}

// 3. Render Member Item Row
function createMemberItem(member, projectCreatorId, currentUserId, currentProjectRole, onRemoveHandler) {
  const item = document.createElement('div');
  item.className = 'member-list-item';

  const initials = member.name
    ? member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const isCreator = member.id === projectCreatorId;
  const isSelf = member.id === currentUserId;

  let roleLabel = '';
  if (isCreator) {
    roleLabel = '<span class="project-role-badge admin">Owner</span>';
  } else {
    roleLabel = `<span class="project-role-badge ${member.role.toLowerCase()}">${member.role}</span>`;
  }

  let actionsHtml = '';
  // Admin can remove other members, but not the project owner/creator
  if (currentProjectRole === 'Admin' && !isCreator && !isSelf) {
    actionsHtml = `
      <div class="member-actions">
        <button class="btn-link remove-member-btn" title="Remove Member" data-id="${member.id}">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;
  }

  item.innerHTML = `
    <div class="member-user-detail">
      <div class="member-avatar" style="${isSelf ? 'background: var(--primary); color: white;' : ''}">${initials}</div>
      <div class="member-meta">
        <span class="member-name">${escapeHTML(member.name)} ${isSelf ? '(You)' : ''}</span>
        <span class="member-email">${escapeHTML(member.email)}</span>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:0.5rem;">
      ${roleLabel}
      ${actionsHtml}
    </div>
  `;

  // Attach action triggers
  if (actionsHtml) {
    item.querySelector('.remove-member-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to remove ${member.name} from the project?`)) {
        onRemoveHandler(member.id);
      }
    });
  }

  return item;
}

// 4. Chart.js State Handler
let statusChartInstance = null;
let workloadChartInstance = null;

function renderDashboardCharts(tasksByStatus, tasksPerUser) {
  // Chart.js Default styling tweaks
  Chart.defaults.color = '#9ca3af';
  Chart.defaults.font.family = "'Inter', sans-serif";

  // Status Chart (Doughnut)
  const statusCtx = document.getElementById('status-chart');
  if (statusCtx) {
    if (statusChartInstance) statusChartInstance.destroy();
    
    const labels = Object.keys(tasksByStatus);
    const data = Object.values(tasksByStatus);
    const hasData = data.some(v => v > 0);

    statusChartInstance = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: hasData ? labels : ['No Tasks'],
        datasets: [{
          data: hasData ? data : [1],
          backgroundColor: hasData 
            ? ['#06b6d4', '#f59e0b', '#10b981'] // Cyan, Orange, Emerald
            : ['rgba(255, 255, 255, 0.05)'],
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 15 }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Workload Chart (Bar)
  const workloadCtx = document.getElementById('workload-chart');
  if (workloadCtx) {
    if (workloadChartInstance) workloadChartInstance.destroy();

    const userNames = tasksPerUser.map(item => item.name);
    const counts = tasksPerUser.map(item => item.count);
    const hasData = userNames.length > 0;

    workloadChartInstance = new Chart(workloadCtx, {
      type: 'bar',
      data: {
        labels: hasData ? userNames : ['No Members'],
        datasets: [{
          label: 'Tasks Count',
          data: hasData ? counts : [0],
          backgroundColor: 'rgba(99, 102, 241, 0.45)', // Transparent Indigo
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            border: { dash: [4, 4] },
            ticks: { precision: 0 }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
}

// 5. Utility HTML Escaper
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
