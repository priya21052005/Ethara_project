const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pv190660_db_user:Adj9oxEfOhwupPVc@cluster0.1cnxylr.mongodb.net/teamflow?retryWrites=true&w=majority&appName=Cluster0';

async function initDb() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas database.');
  } catch (err) {
    console.error('Could not connect to MongoDB Atlas:', err);
    throw err;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

// Project Schema
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['Admin', 'Member'], default: 'Member' }
    }
  ],
  created_at: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  due_date: { type: String, default: null }, // Store as YYYY-MM-DD
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do' },
  assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = {
  initDb,
  User,
  Project,
  Task,
  mongoose
};
