const jwt = require('jsonwebtoken');
const db = require('../db');

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

  try {
    const member = await db.get(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    req.projectRole = member.role;
    req.projectId = parseInt(projectId, 10);
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
