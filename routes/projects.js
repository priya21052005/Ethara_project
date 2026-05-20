const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, checkProjectAccess, requireProjectAdmin } = require('../middleware/auth');

// GET all projects current user is member of
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await db.all(
      `SELECT p.id, p.name, p.description, p.creator_id, p.created_at, pm.role,
       (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
       (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Server error fetching projects.' });
  }
});

// POST create project
router.post('/', authenticateToken, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  try {
    const projectResult = await db.run(
      'INSERT INTO projects (name, description, creator_id) VALUES (?, ?, ?)',
      [name.trim(), description ? description.trim() : '', req.user.id]
    );
    const projectId = projectResult.id;

    await db.run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, req.user.id, 'Admin']
    );

    res.status(201).json({
      id: projectId,
      name: name.trim(),
      description: description ? description.trim() : '',
      creator_id: req.user.id,
      role: 'Admin'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Server error creating project.' });
  }
});

// GET specific project details (including members)
router.get('/:id', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const project = await db.get(
      'SELECT p.id, p.name, p.description, p.creator_id, p.created_at FROM projects p WHERE p.id = ?',
      [req.projectId]
    );

    const members = await db.all(
      `SELECT u.id, u.name, u.email, pm.role
       FROM users u
       JOIN project_members pm ON u.id = pm.user_id
       WHERE pm.project_id = ?
       ORDER BY pm.role ASC, u.name ASC`,
      [req.projectId]
    );

    res.json({
      ...project,
      role: req.projectRole,
      members
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ error: 'Server error fetching project details.' });
  }
});

// POST add member to project (Admin only)
router.post('/:id/members', authenticateToken, checkProjectAccess, requireProjectAdmin, async (req, res) => {
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'User email is required.' });
  }

  const projectRole = role === 'Admin' ? 'Admin' : 'Member';

  try {
    const targetUser = await db.get('SELECT id, name, email FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    const existingMember = await db.get(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.projectId, targetUser.id]
    );

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project.' });
    }

    await db.run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [req.projectId, targetUser.id, projectRole]
    );

    res.status(201).json({
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: projectRole
    });
  } catch (error) {
    console.error('Error adding member to project:', error);
    res.status(500).json({ error: 'Server error adding member.' });
  }
});

// DELETE remove member from project (Admin only)
router.delete('/:id/members/:userId', authenticateToken, checkProjectAccess, requireProjectAdmin, async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    const project = await db.get('SELECT creator_id FROM projects WHERE id = ?', [req.projectId]);
    if (project.creator_id === userId) {
      return res.status(400).json({ error: 'Cannot remove the project owner/creator.' });
    }

    const result = await db.run(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.projectId, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found in this project.' });
    }

    // Unassign their tasks in this project
    await db.run(
      'UPDATE tasks SET assignee_id = NULL WHERE project_id = ? AND assignee_id = ?',
      [req.projectId, userId]
    );

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Server error removing member.' });
  }
});

module.exports = router;
