// Application State Controller - TeamFlow

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const App = {
    user: API.user,
    projects: [],
    currentProject: null,
    activeProjectId: null,
    activeView: 'dashboard',
    tasks: [],

    // Init App
    async init() {
      this.cacheDOM();
      this.bindEvents();
      
      if (API.token) {
        this.showWorkspace();
        await this.loadInitialData();
      } else {
        this.showAuth();
      }
    },

    cacheDOM() {
      // Containers
      this.dom = {
        authContainer: document.getElementById('auth-container'),
        mainWorkspace: document.getElementById('main-workspace'),
        loadingOverlay: document.getElementById('loading-overlay'),
        toastContainer: document.getElementById('toast-container'),
        
        // Forms
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        projectCreateForm: document.getElementById('project-create-form'),
        inviteMemberForm: document.getElementById('invite-member-form'),
        taskCreateForm: document.getElementById('task-create-form'),
        taskEditForm: document.getElementById('task-edit-form'),

        // Inputs
        loginEmail: document.getElementById('login-email'),
        loginPass: document.getElementById('login-password'),
        registerName: document.getElementById('register-name'),
        registerEmail: document.getElementById('register-email'),
        registerPass: document.getElementById('register-password'),
        projectNameInput: document.getElementById('project-name'),
        projectDescInput: document.getElementById('project-desc'),
        inviteEmailInput: document.getElementById('invite-email'),
        inviteRoleSelect: document.getElementById('invite-role'),
        
        // Modals
        projectModal: document.getElementById('project-modal'),
        taskCreateModal: document.getElementById('task-create-modal'),
        taskEditModal: document.getElementById('task-edit-modal'),

        // UI List Elements
        projectsList: document.getElementById('projects-list-container'),
        projectMembersList: document.getElementById('project-members-list'),
        tasksTodo: document.getElementById('tasks-todo'),
        tasksProgress: document.getElementById('tasks-progress'),
        tasksDone: document.getElementById('tasks-done'),
        dashboardProjectList: document.getElementById('dashboard-project-list'),

        // Counters/Badges
        userAvatarInitials: document.getElementById('user-avatar-initials'),
        userDisplayName: document.getElementById('user-display-name'),
        userDisplayEmail: document.getElementById('user-display-email'),
        viewTitle: document.getElementById('view-title'),
        projectMembersCount: document.getElementById('project-members-count'),
        
        // Dashboard Widgets
        dbTotalTasks: document.getElementById('dashboard-total-tasks'),
        dbTodoTasks: document.getElementById('dashboard-todo-tasks'),
        dbProgressTasks: document.getElementById('dashboard-progress-tasks'),
        dbOverdueTasks: document.getElementById('dashboard-overdue-tasks'),

        // Project Controls
        boardAddTaskBtn: document.getElementById('board-add-task-btn'),
        editTaskDeleteBtn: document.getElementById('edit-task-delete-btn'),

        // Navigation elements
        navItems: document.querySelectorAll('.nav-item'),
        logoutBtn: document.getElementById('logout-btn'),
        sidebarAddProjectBtn: document.getElementById('sidebar-add-project-btn')
      };
    },

    bindEvents() {
      // Toggle Auth Forms
      document.getElementById('to-register').addEventListener('click', (e) => {
        e.preventDefault();
        this.dom.loginForm.classList.add('hidden');
        this.dom.registerForm.classList.remove('hidden');
      });
      document.getElementById('to-login').addEventListener('click', (e) => {
        e.preventDefault();
        this.dom.registerForm.classList.add('hidden');
        this.dom.loginForm.classList.remove('hidden');
      });

      // Submit Auth Forms
      this.dom.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      this.dom.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
      this.dom.logoutBtn.addEventListener('click', () => this.handleLogout());

      // Navigation clicks
      this.dom.navItems.forEach(item => {
        item.addEventListener('click', () => {
          this.dom.navItems.forEach(n => n.classList.remove('active'));
          item.classList.add('active');
          const view = item.dataset.view;
          if (view === 'dashboard') {
            this.switchView('dashboard');
          }
        });
      });

      // Modal Triggers
      this.dom.sidebarAddProjectBtn.addEventListener('click', () => this.openModal(this.dom.projectModal));
      this.dom.boardAddTaskBtn.addEventListener('click', () => this.openTaskCreateModal());
      
      // Close Modals
      document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => this.closeAllModals());
      });
      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) this.closeAllModals();
        });
      });

      // Submit Modal Forms
      this.dom.projectCreateForm.addEventListener('submit', (e) => this.handleCreateProject(e));
      this.dom.inviteMemberForm.addEventListener('submit', (e) => this.handleInviteMember(e));
      this.dom.taskCreateForm.addEventListener('submit', (e) => this.handleCreateTask(e));
      this.dom.taskEditForm.addEventListener('submit', (e) => this.handleUpdateTask(e));

      // Task delete trigger
      this.dom.editTaskDeleteBtn.addEventListener('click', () => this.handleDeleteTask());
    },

    // UI State Toggles
    showLoader() { this.dom.loadingOverlay.classList.remove('hidden'); },
    hideLoader() { this.dom.loadingOverlay.classList.add('hidden'); },
    
    showWorkspace() {
      this.dom.authContainer.classList.add('hidden');
      this.dom.mainWorkspace.classList.remove('hidden');
    },
    
    showAuth() {
      this.dom.mainWorkspace.classList.add('hidden');
      this.dom.authContainer.classList.remove('hidden');
    },

    openModal(modal) {
      modal.classList.remove('hidden');
    },
    
    closeAllModals() {
      this.dom.projectModal.classList.add('hidden');
      this.dom.taskCreateModal.classList.add('hidden');
      this.dom.taskEditModal.classList.add('hidden');
      this.dom.projectCreateForm.reset();
      this.dom.taskCreateForm.reset();
      this.dom.taskEditForm.reset();
    },

    // Session Logic
    async handleLogin(e) {
      e.preventDefault();
      this.showLoader();
      try {
        const email = this.dom.loginEmail.value;
        const password = this.dom.loginPass.value;
        await API.login(email, password);
        this.user = API.user;
        showToast('Login successful!');
        this.showWorkspace();
        await this.loadInitialData();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    async handleRegister(e) {
      e.preventDefault();
      this.showLoader();
      try {
        const name = this.dom.registerName.value;
        const email = this.dom.registerEmail.value;
        const password = this.dom.registerPass.value;
        await API.signup(name, email, password);
        this.user = API.user;
        showToast('Registration successful!');
        this.showWorkspace();
        await this.loadInitialData();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    handleLogout() {
      API.logout();
      showToast('Signed out successfully.');
      this.showAuth();
    },

    // Load Data Sequence
    async loadInitialData() {
      if (!this.user) return;
      
      // Update sidebar user badge
      this.dom.userDisplayName.textContent = this.user.name;
      this.dom.userDisplayEmail.textContent = this.user.email;
      this.dom.userAvatarInitials.textContent = this.user.name
        ? this.user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()
        : 'U';

      // Load Projects Sidebar List
      await this.loadProjectsList();

      // Start by loading the default Dashboard
      await this.switchView('dashboard');
    },

    async loadProjectsList() {
      try {
        this.projects = await API.getProjects();
        this.renderProjectsSidebar();
      } catch (err) {
        showToast('Error loading projects list', 'error');
      }
    },

    renderProjectsSidebar() {
      this.dom.projectsList.innerHTML = '';
      if (this.projects.length === 0) {
        this.dom.projectsList.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding:0.5rem 0.75rem;">No active projects</div>`;
        return;
      }

      this.projects.forEach(project => {
        const item = document.createElement('div');
        const isActive = this.activeProjectId === project.id && this.activeView === 'project';
        item.className = `project-nav-item ${isActive ? 'active' : ''}`;
        
        item.innerHTML = `
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <i class="fa-regular fa-folder" style="margin-right: 0.5rem; color: var(--primary);"></i>
            ${escapeHTML(project.name)}
          </span>
          <span class="project-role-badge ${project.role.toLowerCase()}">${project.role}</span>
        `;
        
        item.addEventListener('click', () => {
          this.dom.navItems.forEach(n => n.classList.remove('active'));
          this.switchView('project', project.id);
        });

        this.dom.projectsList.appendChild(item);
      });
    },

    // View Switching
    async switchView(viewName, projectId = null) {
      this.activeView = viewName;
      this.activeProjectId = projectId;
      this.closeAllModals();

      // Update sidebar active highlights
      this.renderProjectsSidebar();

      const dashboardPanel = document.getElementById('dashboard-view');
      const projectPanel = document.getElementById('project-view');

      if (viewName === 'dashboard') {
        this.dom.viewTitle.textContent = 'Dashboard';
        dashboardPanel.classList.add('active');
        projectPanel.classList.add('hidden');
        projectPanel.classList.remove('active');
        dashboardPanel.classList.remove('hidden');
        
        await this.loadDashboardMetrics();
      } else if (viewName === 'project') {
        dashboardPanel.classList.add('hidden');
        dashboardPanel.classList.remove('active');
        projectPanel.classList.add('active');
        projectPanel.classList.remove('hidden');
        
        await this.loadProjectWorkspace(projectId);
      }
    },

    // Dashboard View Actions
    async loadDashboardMetrics() {
      this.showLoader();
      try {
        const data = await API.getDashboardMetrics();
        
        // Counter metrics
        this.dom.dbTotalTasks.textContent = data.totalTasks;
        this.dom.dbTodoTasks.textContent = data.tasksByStatus['To Do'] || 0;
        this.dom.dbProgressTasks.textContent = data.tasksByStatus['In Progress'] || 0;
        this.dom.dbOverdueTasks.textContent = data.overdueTasks || 0;

        // Render projects summary table
        this.dom.dashboardProjectList.innerHTML = '';
        if (this.projects.length === 0) {
          this.dom.dashboardProjectList.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No projects found. Create a project to start.</td></tr>`;
        } else {
          this.projects.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${escapeHTML(p.name)}</strong></td>
              <td><span class="project-role-badge ${p.role.toLowerCase()}">${p.role}</span></td>
              <td>${p.task_count} tasks (${p.member_count} members)</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="App.openProjectDirectly(${p.id})">Open Board</button>
              </td>
            `;
            this.dom.dashboardProjectList.appendChild(tr);
          });
        }

        // Render visual Chart.js widgets
        renderDashboardCharts(data.tasksByStatus, data.tasksPerUser);

      } catch (err) {
        showToast('Error loading dashboard: ' + err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    // Allow calling project open directly from table callbacks
    openProjectDirectly(projectId) {
      this.switchView('project', projectId);
    },

    // Project View Actions
    async loadProjectWorkspace(projectId) {
      this.showLoader();
      try {
        // Fetch project metadata (with member details)
        this.currentProject = await API.getProjectDetails(projectId);
        
        // Update Title & Description
        this.dom.viewTitle.textContent = this.currentProject.name;
        document.getElementById('project-view-desc').textContent = this.currentProject.description || 'No description added.';
        this.dom.projectMembersCount.textContent = this.currentProject.members.length;

        // Configure roles visibility
        const isAdmin = this.currentProject.role === 'Admin';
        
        // Members Invite section
        if (isAdmin) {
          this.dom.inviteMemberForm.classList.remove('hidden');
          this.dom.boardAddTaskBtn.classList.remove('hidden');
        } else {
          this.dom.inviteMemberForm.classList.add('hidden');
          this.dom.boardAddTaskBtn.classList.add('hidden');
        }

        // Render Members list
        this.renderMembersList();

        // Load project tasks
        await this.loadProjectTasks();

      } catch (err) {
        showToast('Error loading project: ' + err.message, 'error');
        this.switchView('dashboard');
      } finally {
        this.hideLoader();
      }
    },

    renderMembersList() {
      this.dom.projectMembersList.innerHTML = '';
      this.currentProject.members.forEach(member => {
        const item = createMemberItem(
          member,
          this.currentProject.creator_id,
          this.user.id,
          this.currentProject.role,
          (userId) => this.handleRemoveMember(userId)
        );
        this.dom.projectMembersList.appendChild(item);
      });
    },

    async loadProjectTasks() {
      try {
        this.tasks = await API.getTasks(this.activeProjectId);
        this.renderTaskBoard();
      } catch (err) {
        showToast('Error loading tasks: ' + err.message, 'error');
      }
    },

    renderTaskBoard() {
      // Clear Kanban Columns
      this.dom.tasksTodo.innerHTML = '';
      this.dom.tasksProgress.innerHTML = '';
      this.dom.tasksDone.innerHTML = '';

      let todoCount = 0;
      let progressCount = 0;
      let doneCount = 0;

      this.tasks.forEach(task => {
        const card = createTaskCard(task, this.currentProject.role, (t) => this.openTaskEditModal(t));
        
        if (task.status === 'To Do') {
          this.dom.tasksTodo.appendChild(card);
          todoCount++;
        } else if (task.status === 'In Progress') {
          this.dom.tasksProgress.appendChild(card);
          progressCount++;
        } else if (task.status === 'Done') {
          this.dom.tasksDone.appendChild(card);
          doneCount++;
        }
      });

      // Update header column counter badges
      this.dom.tasksTodo.previousElementSibling.querySelector('.col-count').textContent = todoCount;
      this.dom.tasksProgress.previousElementSibling.querySelector('.col-count').textContent = progressCount;
      this.dom.tasksDone.previousElementSibling.querySelector('.col-count').textContent = doneCount;
    },

    // Create Project Operations
    async handleCreateProject(e) {
      e.preventDefault();
      this.showLoader();
      try {
        const name = this.dom.projectNameInput.value;
        const description = this.dom.projectDescInput.value;
        const newProj = await API.createProject(name, description);
        
        showToast('Project created successfully!');
        this.closeAllModals();
        
        // Reload project lists
        await this.loadProjectsList();
        
        // Jump directly to the newly created project workspace
        await this.switchView('project', newProj.id);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    // Team Member Management Operations
    async handleInviteMember(e) {
      e.preventDefault();
      this.showLoader();
      try {
        const email = this.dom.inviteEmailInput.value;
        const role = this.dom.inviteRoleSelect.value;
        
        const newMember = await API.addProjectMember(this.activeProjectId, email, role);
        showToast(`${newMember.name} added as ${newMember.role}!`);
        this.dom.inviteMemberForm.reset();
        
        // Reload project metrics & layout
        await this.loadProjectWorkspace(this.activeProjectId);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    async handleRemoveMember(userId) {
      this.showLoader();
      try {
        await API.removeProjectMember(this.activeProjectId, userId);
        showToast('Member removed successfully.');
        await this.loadProjectWorkspace(this.activeProjectId);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    // Task Creation Modals
    openTaskCreateModal() {
      // Load members in assignee selection dropdown
      const select = document.getElementById('task-assignee');
      select.innerHTML = '<option value="">Unassigned</option>';
      this.currentProject.members.forEach(m => {
        select.innerHTML += `<option value="${m.id}">${escapeHTML(m.name)} (${m.role})</option>`;
      });

      // Set min due date to today
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('task-due').min = today;

      this.openModal(this.dom.taskCreateModal);
    },

    async handleCreateTask(e) {
      e.preventDefault();
      this.showLoader();
      try {
        const taskData = {
          title: document.getElementById('task-title').value,
          description: document.getElementById('task-desc').value,
          priority: document.getElementById('task-priority').value,
          due_date: document.getElementById('task-due').value,
          assignee_id: document.getElementById('task-assignee').value || null
        };

        await API.createTask(this.activeProjectId, taskData);
        showToast('Task added successfully.');
        this.closeAllModals();
        await this.loadProjectTasks();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    // Task Edit/Update Modals
    openTaskEditModal(task) {
      const isAdmin = this.currentProject.role === 'Admin';
      const isAssigned = task.assignee_id === this.user.id;

      // Fill in values
      document.getElementById('edit-task-id').value = task.id;
      
      const titleInput = document.getElementById('edit-task-title');
      const descInput = document.getElementById('edit-task-desc');
      const priorityInput = document.getElementById('edit-task-priority');
      const dueInput = document.getElementById('edit-task-due');
      const assigneeInput = document.getElementById('edit-task-assignee');
      const statusInput = document.getElementById('edit-task-status');

      titleInput.value = task.title;
      descInput.value = task.description || '';
      priorityInput.value = task.priority;
      dueInput.value = task.due_date || '';
      statusInput.value = task.status;

      // Fill assignee dropdown list
      assigneeInput.innerHTML = '<option value="">Unassigned</option>';
      this.currentProject.members.forEach(m => {
        assigneeInput.innerHTML += `<option value="${m.id}">${escapeHTML(m.name)}</option>`;
      });
      assigneeInput.value = task.assignee_id || '';

      // Context-aware UI controls depending on roles & assignment
      if (isAdmin) {
        titleInput.disabled = false;
        descInput.disabled = false;
        priorityInput.disabled = false;
        dueInput.disabled = false;
        assigneeInput.disabled = false;
        statusInput.disabled = false;
        this.dom.editTaskDeleteBtn.classList.remove('hidden');
      } else {
        // Members cannot edit fields other than status, and only if assigned
        titleInput.disabled = true;
        descInput.disabled = true;
        priorityInput.disabled = true;
        dueInput.disabled = true;
        assigneeInput.disabled = true;
        
        if (isAssigned) {
          statusInput.disabled = false;
        } else {
          statusInput.disabled = true;
        }
        
        this.dom.editTaskDeleteBtn.classList.add('hidden');
      }

      this.openModal(this.dom.taskEditModal);
    },

    async handleUpdateTask(e) {
      e.preventDefault();
      this.showLoader();
      try {
        const taskId = document.getElementById('edit-task-id').value;
        const isAdmin = this.currentProject.role === 'Admin';
        
        let taskData = {};
        if (isAdmin) {
          // Admin saves everything
          taskData = {
            title: document.getElementById('edit-task-title').value,
            description: document.getElementById('edit-task-desc').value,
            priority: document.getElementById('edit-task-priority').value,
            due_date: document.getElementById('edit-task-due').value,
            assignee_id: document.getElementById('edit-task-assignee').value || null,
            status: document.getElementById('edit-task-status').value
          };
        } else {
          // Member saves status only
          taskData = {
            status: document.getElementById('edit-task-status').value
          };
        }

        await API.updateTask(this.activeProjectId, taskId, taskData);
        showToast('Task updated successfully.');
        this.closeAllModals();
        await this.loadProjectTasks();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    },

    async handleDeleteTask() {
      if (!confirm('Are you sure you want to delete this task?')) return;
      this.showLoader();
      try {
        const taskId = document.getElementById('edit-task-id').value;
        await API.deleteTask(this.activeProjectId, taskId);
        showToast('Task deleted successfully.');
        this.closeAllModals();
        await this.loadProjectTasks();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.hideLoader();
      }
    }
  };

  // Expose App to global window scope so that HTML inline functions work (like onclick="App.openProjectDirectly(...)")
  window.App = App;

  // Initialize
  App.init();
});
