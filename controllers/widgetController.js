const Project = require('../models/Project');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Attendance = require('../models/Attendance');
const DayLog = require('../models/DayLog');
const User = require('../models/User');

// Get all projects (for widget dropdown)
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({})
      .select('name code _id')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get recent activity for a project
exports.getRecentActivity = async (req, res) => {
  try {
    const { project } = req.query;
    let query = {};

    if (project) {
      query.project = project;
    }

    // Get recent activities from different collections
    const [tasks, issues, daylogs, attendance] = await Promise.all([
      Task.find(query)
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title description status assignedTo createdAt'),

      Issue.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title description severity createdAt'),

      DayLog.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('progress summary createdAt'),

      Attendance.find(query)
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('status notes user createdAt')
    ]);

    // Combine and sort all activities
    const activities = [
      ...tasks.map(task => ({
        type: 'task',
        title: `Task: ${task.title}`,
        description: `Status: ${task.status}${task.assignedTo ? ` • Assigned to: ${task.assignedTo.name}` : ''}`,
        createdAt: task.createdAt
      })),
      ...issues.map(issue => ({
        type: 'issue',
        title: `Issue: ${issue.title}`,
        description: `Severity: ${issue.severity}`,
        createdAt: issue.createdAt
      })),
      ...daylogs.map(log => ({
        type: 'report',
        title: 'Progress Report',
        description: log.summary || log.progress.substring(0, 100) + '...',
        createdAt: log.createdAt
      })),
      ...attendance.map(att => ({
        type: 'attendance',
        title: `Attendance: ${att.user?.name || 'Unknown'}`,
        description: `Status: ${att.status}${att.notes ? ` • ${att.notes}` : ''}`,
        createdAt: att.createdAt
      }))
    ];

    // Sort by creation date (most recent first)
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Return only the 10 most recent activities
    res.json(activities.slice(0, 10));
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, project } = req.body;

    if (!title || !project) {
      return res.status(400).json({ error: 'Title and project are required' });
    }

    // Find project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create task
    const task = new Task({
      title,
      description: description || '',
      priority: priority || 'medium',
      status: 'todo',
      project: project
    });

    await task.save();

    // Populate assigned user info if needed
    await task.populate('assignedTo', 'name');

    res.status(201).json({
      message: 'Task created successfully',
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// Create a day log (progress report)
exports.createDayLog = async (req, res) => {
  try {
    const { type, message, project } = req.body;

    if (!message || !project) {
      return res.status(400).json({ error: 'Message and project are required' });
    }

    // Find project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create day log
    const dayLog = new DayLog({
      project: project,
      progress: message,
      summary: message.length > 200 ? message.substring(0, 200) + '...' : message
    });

    await dayLog.save();

    res.status(201).json({
      message: 'Report submitted successfully',
      dayLog: {
        _id: dayLog._id,
        progress: dayLog.progress,
        summary: dayLog.summary,
        createdAt: dayLog.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating day log:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

// Create an issue
exports.createIssue = async (req, res) => {
  try {
    const { title, description, severity, project } = req.body;

    if (!title || !project) {
      return res.status(400).json({ error: 'Title and project are required' });
    }

    // Find project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create issue
    const issue = new Issue({
      title,
      description: description || '',
      severity: severity || 'medium',
      status: 'open',
      project: project
    });

    await issue.save();

    res.status(201).json({
      message: 'Issue reported successfully',
      issue: {
        _id: issue._id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        createdAt: issue.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'Failed to report issue' });
  }
};

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    const { status, notes, project } = req.body;

    if (!status || !project) {
      return res.status(400).json({ error: 'Status and project are required' });
    }

    // Find project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // For demo purposes, create attendance for a default user
    // In production, you'd get the user from authentication
    let user = await User.findOne({ email: 'demo@brixai.com' });
    if (!user) {
      user = new User({
        name: 'Demo User',
        email: 'demo@brixai.com',
        password: 'demo123',
        role: 'labor'
      });
      await user.save();
    }

    // Create attendance record
    const attendance = new Attendance({
      user: user._id,
      project: project,
      status: status,
      notes: notes || '',
      date: new Date()
    });

    await attendance.save();

    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance: {
        _id: attendance._id,
        status: attendance.status,
        notes: attendance.notes,
        date: attendance.date,
        createdAt: attendance.createdAt
      }
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};
