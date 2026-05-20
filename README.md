# TeamFlow | Team Task Manager

TeamFlow is a full-stack, collaborative Team Task Management Web Application designed to help teams organize projects, track tasks, assign workloads, and view real-time productivity statistics.

It features a beautiful glassmorphic dark-theme design, dynamic analytics charts, and strict Role-Based Access Control (RBAC).

---

## Key Features

- **Secure JWT Authentication**: User registration and login with encrypted password storage (`bcryptjs`).
- **Project Management**: Create projects (creator automatically gains the **Admin** role) and add or remove team members by email.
- **Kanban Task Board**: Group project tasks into status columns (**To Do**, **In Progress**, and **Done**), complete with priority badges and overdue flags.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Create projects, manage team members, assign tasks, delete tasks, and edit all task fields.
  - **Member**: Access joined projects, view assigned tasks only, and update the status of those assigned tasks. All other task properties are write-protected.
- **Interactive Metrics Dashboard**: Real-time project tracking statistics:
  - Total tasks count, tasks sorted by status, and total overdue tasks.
  - Interactive **Status Distribution** doughnut chart.
  - Interactive **Team Workload** bar chart (tasks per user) using Chart.js.
  - Combined project summaries table for quick navigation.

---

## Tech Stack

- **Backend**: Node.js, Express, SQLite (`sqlite3`)
- **Frontend**: Single Page Application (SPA) using HTML5, modern ES Modules, and Vanilla CSS variables (frosted glass, glowing accents, and responsive layout)
- **Visualizations**: Chart.js (via CDN)
- **Icons & Font**: FontAwesome Icons (via CDN), Inter Font (via Google Fonts)

---

## Project Structure

```
Ethara_project/
  ├── package.json         # Project metadata and dependencies
  ├── server.js            # Express server initialization & routes configuration
  ├── db.js                # SQLite database setup and Promise wrapper
  ├── database.sqlite      # SQLite database file (ignored by Git)
  ├── middleware/
  │     └── auth.js        # JWT verification and RBAC guards
  ├── routes/
  │     ├── auth.js        # User auth endpoints (signup, login, profile)
  │     ├── projects.js    # Project CRUD and team membership endpoints
  │     ├── tasks.js       # Task CRUD, status updates, and assignee rules
  │     └── dashboard.js   # Cross-project dashboard aggregations
  └── public/              # Static frontend assets
        ├── index.html     # SPA container
        ├── css/
        │     └── styles.css # Styling (variables, glassmorphic layout, responsive rules)
        └── js/
              ├── api.js     # Client API fetching handler with Authorization headers
              ├── app.js     # Application workflow, routing, and form actions
              └── components.js # Render engine for task cards, members list, and Chart.js
```

---

## Local Setup & Installation

### Prerequisites
- **Node.js** (v14.x or higher)
- **npm** (v6.x or higher)

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/priya21052005/Ethara_project.git
   cd Ethara_project
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project to customize port configurations and authentication security:
   ```env
   PORT=5000
   JWT_SECRET=your_custom_jwt_secret_phrase
   ```
   *(If no `.env` is provided, the server defaults to port `5000` and a default fallback secret is used).*

4. **Start the Application**:
   - For standard execution:
     ```bash
     npm start
     ```
   - For development auto-refresh (if you install `nodemon` globally):
     ```bash
     npm run dev
     ```

5. **Access the App**:
   Open your browser and navigate to:
   [http://localhost:5000](http://localhost:5000)

---

## API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/signup`: Creates a user. Body: `{ name, email, password }`
- `POST /api/auth/login`: Authenticates user. Body: `{ email, password }`
- `GET /api/auth/me`: Fetches current user profile. Header: `Authorization: Bearer <token>`

### Projects (`/api/projects`)
- `GET /api/projects`: Fetch projects user belongs to.
- `POST /api/projects`: Create project (creator becomes Admin). Body: `{ name, description }`
- `GET /api/projects/:id`: Fetch project metadata and members.
- `POST /api/projects/:id/members`: Invite member by email (Admin-only). Body: `{ email, role }`
- `DELETE /api/projects/:id/members/:userId`: Remove member (Admin-only).

### Tasks (`/api/projects/:projectId/tasks`)
- `GET /`: List tasks (Admin sees all; Member sees only assigned tasks).
- `POST /`: Create task (Admin-only). Body: `{ title, description, priority, due_date, assignee_id }`
- `PATCH /:taskId`: Update task (Admin can change everything; Member can only update `status` of tasks assigned to them). Body: `{ title, description, status, ... }`
- `DELETE /:taskId`: Delete task (Admin-only).

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard`: Fetch task status distribution, overdue count, and workload per user across projects.

---

## Production Deployment Steps

### 1. Deploying to Railway

Railway is the deployment environment for this full-stack application. Follow these instructions to launch:

1. **Create a Railway Account**: Sign in to [Railway.app](https://railway.app) using your GitHub account.
2. **Start a New Project**:
   - Click **New Project** in the upper right.
   - Select **Deploy from GitHub repo**.
   - Search for and select your `Ethara_project` repository.
3. **Configure Environment Variables**:
   In your service dashboard, open the **Variables** tab and add:
   - `JWT_SECRET`: A secure random secret key (e.g. `your_secret_key_phrase`).
   - `DATABASE_PATH`: `/app/data/database.sqlite` (Points SQLite to the mounted persistent storage).
4. **Configure Persistent Volume (Critical for SQLite)**:
   By default, container filesystems on Railway are ephemeral. To prevent losing your database and projects when the server restarts or redeploys:
   - Go to the **Settings** tab of your Node.js service.
   - Scroll down to the **Volumes** section and click **Add Volume**.
   - Set **Mount Path** to `/app/data` (this maps directly to the `DATABASE_PATH` env variable).
   - Save changes.
5. **Expose Public Domain**:
   - Under the **Settings** tab of the service, scroll to **Domains**.
   - Click **Generate Domain** to create a public `https://...` address.
   - Once build and deployment complete, your app is fully live and accessible!

---

### 2. Alternative: Deploying to Render
1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Add **Environment Variables**:
   - `JWT_SECRET`: A long random string.
   - `DATABASE_PATH`: `/var/data/database.sqlite`
4. Add a **Render Disk**:
   - **Name**: `sqlite-storage`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB`
