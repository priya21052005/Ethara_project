const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkProjectAccess } = require('../middleware/auth');

// GET all tasks in project (Admin gets all, Member gets only assigned)
router.get('/', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    let tasks;
    if (req.projectRole === 'Admin') {
      tasks = await db.all(
        `SELECT t.*, u.name as assignee_name, u.email as assignee_email
         FROM tasks t
         LEFT JOIN users u ON t.assignee_id = u.id
         WHERE t.project_id = ?
         ORDER BY 
           CASE t.priority 
             WHEN 'High' THEN 1 
             WHEN 'Medium' THEN 2 
             WHEN 'Low' THEN 3 
             ELSE 4 
           END ASC, 
           t.due_date ASC, 
           t.created_at DESC`,
        [req.projectId]
      );
    } else {
      // Member can only see tasks assigned to them
      tasks = await db.all(
        `SELECT t.*, u.name as assignee_name, u.email as assignee_email
         FROM tasks t
         LEFT JOIN users u ON t.assignee_id = u.id
         WHERE t.project_id = ? AND t.assignee_id = ?
         ORDER BY 
           CASE t.priority 
             WHEN 'High' THEN 1 
             WHEN 'Medium' THEN 2 
             WHEN 'Low' THEN 3 
             ELSE 4 
           END ASC, 
           t.due_date ASC, 
           t.created_at DESC`,
        [req.projectId, req.user.id]
      );
    }
    res.json(tasks);
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
  const taskAssignee = assignee_id ? parseInt(assignee_id, 10) : null;

  try {
    // If assignee is provided, verify they are a member of this project
    if (taskAssignee) {
      const isMember = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [req.projectId, taskAssignee]
      );
      if (!isMember) {
        return res.status(400).json({ error: 'Assignee must be a member of the project.' });
      }
    }

    const result = await db.run(
      `INSERT INTO tasks (project_id, title, description, due_date, priority, status, assignee_id)
       VALUES (?, ?, ?, ?, ?, 'To Do', ?)`,
      [req.projectId, title.trim(), description ? description.trim() : '', due_date || null, taskPriority, taskAssignee]
    );

    const createdTask = await db.get(
      `SELECT t.*, u.name as assignee_name, u.email as assignee_email
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`,
      [result.id]
    );

    res.status(201).json(createdTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Server error creating task.' });
  }
});

// PATCH update task (Admin can update all, Member can only update status if assigned)
router.patch('/:taskId', authenticateToken, checkProjectAccess, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { title, description, due_date, priority, status, assignee_id } = req.body;

  try {
    // Verify task exists in this project
    const task = await db.get('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [taskId, req.projectId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found in this project.' });
    }

    if (req.projectRole === 'Admin') {
      // Admin has full permissions
      const updates = [];
      const params = [];

      if (title !== undefined) {
        if (!title.trim()) return res.status(400).json({ error: 'Title cannot be empty.' });
        updates.push('title = ?');
        params.push(title.trim());
      }

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description ? description.trim() : '');
      }

      if (due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(due_date || null);
      }

      if (priority !== undefined) {
        if (!['Low', 'Medium', 'High'].includes(priority)) {
          return res.status(400).json({ error: 'Invalid priority. Must be Low, Medium, or High.' });
        }
        updates.push('priority = ?');
        params.push(priority);
      }

      if (status !== undefined) {
        if (!['To Do', 'In Progress', 'Done'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status. Must be To Do, In Progress, or Done.' });
        }
        updates.push('status = ?');
        params.push(status);
      }

      if (assignee_id !== undefined) {
        const taskAssignee = assignee_id ? parseInt(assignee_id, 10) : null;
        if (taskAssignee) {
          const isMember = await db.get(
            'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
            [req.projectId, taskAssignee]
          );
          if (!isMember) {
            return res.status(400).json({ error: 'Assignee must be a member of the project.' });
          }
        }
        updates.push('assignee_id = ?');
        params.push(taskAssignee);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
      }

      params.push(taskId);
      await db.run(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

    } else {
      // Member can ONLY update status and ONLY if the task is assigned to them
      if (task.assignee_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You can only update tasks assigned to you.' });
      }

      // If user is trying to update fields other than 'status', block it
      if (title !== undefined || description !== undefined || due_date !== undefined || priority !== undefined || assignee_id !== undefined) {
        return res.status(403).json({ error: 'Access denied. Members can only update task status.' });
      }

      if (status === undefined) {
        return res.status(400).json({ error: 'Status is required to update.' });
      }

      if (!['To Do', 'In Progress', 'Done'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be To Do, In Progress, or Done.' });
      }

      await db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        [status, taskId]
      );
    }

    // Return the updated task with assignee details
    const updatedTask = await db.get(
      `SELECT t.*, u.name as assignee_name, u.email as assignee_email
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`,
      [taskId]
    );

    res.json(updatedTask);
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

  const taskId = parseInt(req.params.taskId, 10);

  try {
    const result = await db.run('DELETE FROM tasks WHERE id = ? AND project_id = ?', [taskId, req.projectId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found in this project.' });
    }
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Server error deleting task.' });
  }
});

module.exports = router;
