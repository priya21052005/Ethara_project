const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user projects and roles
    const userProjects = await db.all(
      'SELECT project_id, role FROM project_members WHERE user_id = ?',
      [req.user.id]
    );

    if (userProjects.length === 0) {
      return res.json({
        totalTasks: 0,
        tasksByStatus: { 'To Do': 0, 'In Progress': 0, 'Done': 0 },
        overdueTasks: 0,
        tasksPerUser: [],
        tasksPerProject: []
      });
    }

    const adminProjects = userProjects.filter(p => p.role === 'Admin').map(p => p.project_id);
    const memberProjects = userProjects.filter(p => p.role === 'Member').map(p => p.project_id);

    let queryParts = [];
    let params = [];

    if (adminProjects.length > 0) {
      const placeholders = adminProjects.map(() => '?').join(',');
      queryParts.push(`t.project_id IN (${placeholders})`);
      params.push(...adminProjects);
    }

    if (memberProjects.length > 0) {
      const placeholders = memberProjects.map(() => '?').join(',');
      queryParts.push(`(t.project_id IN (${placeholders}) AND t.assignee_id = ?)`);
      params.push(...memberProjects, req.user.id);
    }

    const whereClause = queryParts.join(' OR ');

    // Fetch visible tasks
    const tasks = await db.all(
      `SELECT t.*, u.name as assignee_name, p.name as project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE ${whereClause}`,
      params
    );

    // Calculate metrics
    const totalTasks = tasks.length;
    const tasksByStatus = { 'To Do': 0, 'In Progress': 0, 'Done': 0 };
    let overdueTasks = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    const userTaskCounts = {};
    const projectTaskCounts = {};

    tasks.forEach(task => {
      // 1. Status distribution
      if (tasksByStatus[task.status] !== undefined) {
        tasksByStatus[task.status]++;
      } else {
        tasksByStatus[task.status] = 1;
      }

      // 2. Overdue calculation
      if (task.due_date && task.due_date < todayStr && task.status !== 'Done') {
        overdueTasks++;
      }

      // 3. User workload distribution
      const userName = task.assignee_name || 'Unassigned';
      userTaskCounts[userName] = (userTaskCounts[userName] || 0) + 1;

      // 4. Project task distribution
      const projectName = task.project_name;
      projectTaskCounts[projectName] = (projectTaskCounts[projectName] || 0) + 1;
    });

    const tasksPerUser = Object.keys(userTaskCounts).map(name => ({
      name,
      count: userTaskCounts[name]
    })).sort((a, b) => b.count - a.count);

    const tasksPerProject = Object.keys(projectTaskCounts).map(name => ({
      name,
      count: projectTaskCounts[name]
    })).sort((a, b) => b.count - a.count);

    res.json({
      totalTasks,
      tasksByStatus,
      overdueTasks,
      tasksPerUser,
      tasksPerProject
    });

  } catch (error) {
    console.error('Error compiling dashboard metrics:', error);
    res.status(500).json({ error: 'Server error generating dashboard data.' });
  }
});

module.exports = router;
