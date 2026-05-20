const express = require('express');
const router = express.Router();
const { Project, Task } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user projects
    const userProjects = await Project.find({ 'members.user_id': req.user.id });

    if (userProjects.length === 0) {
      return res.json({
        totalTasks: 0,
        tasksByStatus: { 'To Do': 0, 'In Progress': 0, 'Done': 0 },
        overdueTasks: 0,
        tasksPerUser: [],
        tasksPerProject: []
      });
    }

    const adminProjectIds = userProjects
      .filter(p => {
        const mem = p.members.find(m => m.user_id.toString() === req.user.id.toString());
        return mem && mem.role === 'Admin';
      })
      .map(p => p._id);

    const memberProjectIds = userProjects
      .filter(p => {
        const mem = p.members.find(m => m.user_id.toString() === req.user.id.toString());
        return mem && mem.role === 'Member';
      })
      .map(p => p._id);

    const queryConditions = [];

    if (adminProjectIds.length > 0) {
      queryConditions.push({ project_id: { $in: adminProjectIds } });
    }

    if (memberProjectIds.length > 0) {
      queryConditions.push({ project_id: { $in: memberProjectIds }, assignee_id: req.user.id });
    }

    if (queryConditions.length === 0) {
      return res.json({
        totalTasks: 0,
        tasksByStatus: { 'To Do': 0, 'In Progress': 0, 'Done': 0 },
        overdueTasks: 0,
        tasksPerUser: [],
        tasksPerProject: []
      });
    }

    // Fetch tasks and populate relationships
    const tasks = await Task.find({ $or: queryConditions })
      .populate('assignee_id', 'name')
      .populate('project_id', 'name');

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
      const userName = task.assignee_id ? task.assignee_id.name : 'Unassigned';
      userTaskCounts[userName] = (userTaskCounts[userName] || 0) + 1;

      // 4. Project task distribution
      const projectName = task.project_id ? task.project_id.name : 'Deleted Project';
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
