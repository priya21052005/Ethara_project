const API_URL = window.location.origin;

const API = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user')),

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  },

  setUser(user) {
    this.user = user;
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  },

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (this.token) {
            this.setToken(null);
            this.setUser(null);
            window.location.reload();
          }
        }
        throw new Error(data.error || 'Something went wrong.');
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },

  // Authentication
  async signup(name, email, password) {
    const data = await this.request('/api/auth/signup', {
      method: 'POST',
      body: { name, email, password }
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async logout() {
    this.setToken(null);
    this.setUser(null);
  },

  async getMe() {
    return this.request('/api/auth/me');
  },

  // Projects
  async getProjects() {
    return this.request('/api/projects');
  },

  async createProject(name, description) {
    return this.request('/api/projects', {
      method: 'POST',
      body: { name, description }
    });
  },

  async getProjectDetails(projectId) {
    return this.request(`/api/projects/${projectId}`);
  },

  async addProjectMember(projectId, email, role) {
    return this.request(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: { email, role }
    });
  },

  async removeProjectMember(projectId, userId) {
    return this.request(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    });
  },

  // Tasks
  async getTasks(projectId) {
    return this.request(`/api/projects/${projectId}/tasks`);
  },

  async createTask(projectId, taskData) {
    return this.request(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: taskData
    });
  },

  async updateTask(projectId, taskId, taskData) {
    return this.request(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: taskData
    });
  },

  async deleteTask(projectId, taskId) {
    return this.request(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE'
    });
  },

  // Dashboard
  async getDashboardMetrics() {
    return this.request('/api/dashboard');
  }
};
