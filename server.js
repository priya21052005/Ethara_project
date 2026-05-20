require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, 'public')));

// Import Routes
const authRouter = require('./routes/auth');
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const dashboardRouter = require('./routes/dashboard');

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);

// Catch-all route to serve the SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`Team Task Manager server is running on port ${PORT}`);
      console.log(`Local Access: http://localhost:${PORT}`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('Failed to start server due to database initialization error:', error);
    process.exit(1);
  }
}

startServer();
