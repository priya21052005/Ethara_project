const express = require('express');
const router = express.Router();
const { Project, Task, User } = require('../db');
const { authenticateToken, checkProjectAccess, requireProjectAdmin } = require('../middleware/auth');

// GET all projects current user is member of
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user_id': req.user.id }).sort({ created_at: -1 });

    const formattedProjects = await Promise.all(projects.map(async (p) => {
      const memberCount = p.members.length;
      const taskCount = await Task.countDocuments({ project_id: p._id });
      const userMember = p.members.find(m => m.user_id.toString() === req.user.id.toString());
      return {
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        creator_id: p.creator_id.toString(),
        created_at: p.created_at,
        role: userMember ? userMember.role : 'Member',
        member_count: memberCount,
        task_count: taskCount
      };
    }));

    res.json(formattedProjects);
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
    const project = new Project({
      name: name.trim(),
      description: description ? description.trim() : '',
      creator_id: req.user.id,
      members: [{ user_id: req.user.id, role: 'Admin' }]
    });

    await project.save();

    res.status(201).json({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      creator_id: project.creator_id.toString(),
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
    const project = await Project.findById(req.projectId).populate('members.user_id', 'name email');
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const members = project.members.map(m => {
      // Handle edge cases where user might have been deleted but member record remains
      const u = m.user_id || { _id: '', name: 'Deleted User', email: '' };
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: m.role
      };
    });

    res.json({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      creator_id: project.creator_id.toString(),
      created_at: project.created_at,
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
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    const project = await Project.findById(req.projectId);
    const existingMember = project.members.some(m => m.user_id.toString() === targetUser._id.toString());

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project.' });
    }

    project.members.push({ user_id: targetUser._id, role: projectRole });
    await project.save();

    res.status(201).json({
      id: targetUser._id.toString(),
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
  const userId = req.params.userId;

  try {
    const project = await Project.findById(req.projectId);
    if (project.creator_id.toString() === userId) {
      return res.status(400).json({ error: 'Cannot remove the project owner/creator.' });
    }

    const originalLength = project.members.length;
    project.members = project.members.filter(m => m.user_id.toString() !== userId);

    if (project.members.length === originalLength) {
      return res.status(404).json({ error: 'Member not found in this project.' });
    }

    await project.save();

    // Unassign their tasks in this project
    await Task.updateMany(
      { project_id: req.projectId, assignee_id: userId },
      { assignee_id: null }
    );

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Server error removing member.' });
  }
});

module.exports = router;
