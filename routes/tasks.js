const express = require('express');
const router = express.Router({ mergeParams: true });
const { Project, Task, User } = require('../db');
const { authenticateToken, checkProjectAccess } = require('../middleware/auth');

// GET all tasks in project (Admin gets all, Member gets only assigned)
router.get('/', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    let tasks;
    if (req.projectRole === 'Admin') {
      tasks = await Task.find({ project_id: req.projectId }).populate('assignee_id', 'name email');
    } else {
      tasks = await Task.find({ project_id: req.projectId, assignee_id: req.user.id }).populate('assignee_id', 'name email');
    }

    // Sort tasks: High priority first, then due_date, then created_at (descending)
    const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
    tasks.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const formattedTasks = tasks.map(t => ({
      id: t._id.toString(),
      project_id: t.project_id.toString(),
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      priority: t.priority,
      status: t.status,
      assignee_id: t.assignee_id ? t.assignee_id._id.toString() : null,
      assignee_name: t.assignee_id ? t.assignee_id.name : null,
      assignee_email: t.assignee_id ? t.assignee_id.email : null,
      created_at: t.created_at
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Server error fetching tasks.' });
  }
});

// POST create task (Admin only)
router.post('/', authenticateToken, checkProjectAccess, async (req, res) => {
  if (req.projectRole !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Only project Admins can create tasks.' });
  }

  const { title, description, due_date, priority, assignee_id } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const taskPriority = ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium';
  const taskAssignee = assignee_id || null;

  try {
    // If assignee is provided, verify they are a member of this project
    if (taskAssignee) {
      const project = await Project.findById(req.projectId);
      const isMember = project.members.some(m => m.user_id.toString() === taskAssignee);
      if (!isMember) {
        return res.status(400).json({ error: 'Assignee must be a member of the project.' });
      }
    }

    const task = new Task({
      project_id: req.projectId,
      title: title.trim(),
      description: description ? description.trim() : '',
      due_date: due_date || null,
      priority: taskPriority,
      status: 'To Do',
      assignee_id: taskAssignee
    });

    await task.save();

    const createdTask = await Task.findById(task._id).populate('assignee_id', 'name email');

    res.status(201).json({
      id: createdTask._id.toString(),
      project_id: createdTask.project_id.toString(),
      title: createdTask.title,
      description: createdTask.description,
      due_date: createdTask.due_date,
      priority: createdTask.priority,
      status: createdTask.status,
      assignee_id: createdTask.assignee_id ? createdTask.assignee_id._id.toString() : null,
      assignee_name: createdTask.assignee_id ? createdTask.assignee_id.name : null,
      assignee_email: createdTask.assignee_id ? createdTask.assignee_id.email : null,
      created_at: createdTask.created_at
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Server error creating task.' });
  }
});

// PATCH update task (Admin can update all, Member can only update status if assigned)
router.patch('/:taskId', authenticateToken, checkProjectAccess, async (req, res) => {
  const { taskId } = req.params;
  const { title, description, due_date, priority, status, assignee_id } = req.body;

  // Validate ObjectId format
  if (!taskId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: 'Invalid Task ID format.' });
  }

  try {
    const task = await Task.findOne({ _id: taskId, project_id: req.projectId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found in this project.' });
    }

    if (req.projectRole === 'Admin') {
      if (title !== undefined) {
        if (!title.trim()) return res.status(400).json({ error: 'Title cannot be empty.' });
        task.title = title.trim();
      }

      if (description !== undefined) {
        task.description = description ? description.trim() : '';
      }

      if (due_date !== undefined) {
        task.due_date = due_date || null;
      }

      if (priority !== undefined) {
        if (!['Low', 'Medium', 'High'].includes(priority)) {
          return res.status(400).json({ error: 'Invalid priority. Must be Low, Medium, or High.' });
        }
        task.priority = priority;
      }

      if (status !== undefined) {
        if (!['To Do', 'In Progress', 'Done'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status. Must be To Do, In Progress, or Done.' });
        }
        task.status = status;
      }

      if (assignee_id !== undefined) {
        const taskAssignee = assignee_id || null;
        if (taskAssignee) {
          const project = await Project.findById(req.projectId);
          const isMember = project.members.some(m => m.user_id.toString() === taskAssignee);
          if (!isMember) {
            return res.status(400).json({ error: 'Assignee must be a member of the project.' });
          }
        }
        task.assignee_id = taskAssignee;
      }

      await task.save();

    } else {
      // Member checks
      if (!task.assignee_id || task.assignee_id.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only update tasks assigned to you.' });
      }

      if (title !== undefined || description !== undefined || due_date !== undefined || priority !== undefined || assignee_id !== undefined) {
        return res.status(403).json({ error: 'Access denied. Members can only update task status.' });
      }

      if (status === undefined) {
        return res.status(400).json({ error: 'Status is required to update.' });
      }

      if (!['To Do', 'In Progress', 'Done'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be To Do, In Progress, or Done.' });
      }

      task.status = status;
      await task.save();
    }

    const updatedTask = await Task.findById(taskId).populate('assignee_id', 'name email');

    res.json({
      id: updatedTask._id.toString(),
      project_id: updatedTask.project_id.toString(),
      title: updatedTask.title,
      description: updatedTask.description,
      due_date: updatedTask.due_date,
      priority: updatedTask.priority,
      status: updatedTask.status,
      assignee_id: updatedTask.assignee_id ? updatedTask.assignee_id._id.toString() : null,
      assignee_name: updatedTask.assignee_id ? updatedTask.assignee_id.name : null,
      assignee_email: updatedTask.assignee_id ? updatedTask.assignee_id.email : null,
      created_at: updatedTask.created_at
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Server error updating task.' });
  }
});

// DELETE delete task (Admin only)
router.delete('/:taskId', authenticateToken, checkProjectAccess, async (req, res) => {
  if (req.projectRole !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Only project Admins can delete tasks.' });
  }

  const { taskId } = req.params;

  // Validate ObjectId format
  if (!taskId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: 'Invalid Task ID format.' });
  }

  try {
    const result = await Task.deleteOne({ _id: taskId, project_id: req.projectId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Task not found in this project.' });
    }
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Server error deleting task.' });
  }
});

module.exports = router;
