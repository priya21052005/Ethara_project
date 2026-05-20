const jwt = require('jsonwebtoken');
const { Project } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_team_task_manager_key';

// Authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token.' });
    }
    req.user = user;
    next();
  });
}

// Check project membership and load role
async function checkProjectAccess(req, res, next) {
  const projectId = req.params.projectId || req.params.id || req.body.projectId;
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required.' });
  }

  // Validate ObjectId format
  if (!projectId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: 'Invalid Project ID format.' });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const member = project.members.find(m => m.user_id.toString() === req.user.id.toString());
    if (!member) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    req.projectRole = member.role;
    req.projectId = projectId;
    next();
  } catch (error) {
    console.error('Error checking project access:', error);
    res.status(500).json({ error: 'Server error checking project access.' });
  }
}

// Require Admin role in project
function requireProjectAdmin(req, res, next) {
  if (req.projectRole !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Project Admin role required.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  checkProjectAccess,
  requireProjectAdmin,
  JWT_SECRET
};
