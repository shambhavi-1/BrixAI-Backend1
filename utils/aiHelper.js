const natural = require('natural');
const chrono = require('chrono-node');

// Analyze message for task creation patterns
exports.analyzeMessage = async (message) => {
  const analysis = {
    originalMessage: message,
    shouldCreateTask: false,
    shouldCreateIssue: false,
    shouldLogProgress: false,
    taskTitle: '',
    taskDescription: '',
    issueTitle: '',
    issueDescription: '',
    progressSummary: '',
    priority: 'medium',
    severity: 'medium',
    dueDate: null
  };

  // Task creation patterns
  const taskPatterns = [
    /need to (complete|finish|do|start|begin)/i,
    /we (need to|should|must)/i,
    /let's (do|start|begin|work on)/i,
    /schedule/i,
    /deadline/i,
    /by (tomorrow|next week|next month|end of)/i,
    /due (by|on)/i
  ];

  // Issue/problem patterns
  const issuePatterns = [
    /problem/i,
    /issue/i,
    /broken/i,
    /not working/i,
    /delay/i,
    /stuck/i,
    /blocked/i,
    /error/i,
    /fault/i
  ];

  // Progress reporting patterns
  const progressPatterns = [
    /completed/i,
    /finished/i,
    /done/i,
    /progress/i,
    /update/i,
    /status/i,
    /worked on/i,
    /started/i
  ];

  // Check for task creation
  if (taskPatterns.some(pattern => pattern.test(message))) {
    analysis.shouldCreateTask = true;
    analysis.taskTitle = extractTaskTitle(message);
    analysis.taskDescription = message;
    analysis.priority = determinePriority(message);
    analysis.dueDate = extractDueDate(message);
  }

  // Check for issue reporting
  if (issuePatterns.some(pattern => pattern.test(message))) {
    analysis.shouldCreateIssue = true;
    analysis.issueTitle = extractIssueTitle(message);
    analysis.issueDescription = message;
    analysis.severity = determineSeverity(message);
  }

  // Check for progress logging
  if (progressPatterns.some(pattern => pattern.test(message))) {
    analysis.shouldLogProgress = true;
    analysis.progressSummary = extractProgressSummary(message);
  }

  return analysis;
};

// Extract task title from message
function extractTaskTitle(message) {
  // Try to extract the main action/task
  const taskKeywords = ['complete', 'finish', 'do', 'start', 'begin', 'work on', 'schedule'];

  for (const keyword of taskKeywords) {
    const regex = new RegExp(`${keyword}\\s+(.+?)(?:\\s+(by|before|tomorrow|next|due)|$)`, 'i');
    const match = message.match(regex);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: take first meaningful part of the sentence
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 5);
  return sentences[0]?.trim() || 'Task from channel message';
}

// Extract issue title from message
function extractIssueTitle(message) {
  const issueKeywords = ['problem', 'issue', 'broken', 'not working', 'delay', 'stuck', 'blocked', 'error'];

  for (const keyword of issueKeywords) {
    const regex = new RegExp(`${keyword}\\s+(?:with|in|on)?\\s*(.+?)(?:\\s+(is|are|has|have)|$)`, 'i');
    const match = message.match(regex);
    if (match) {
      return `Issue: ${match[1].trim()}`;
    }
  }

  return 'Issue reported in channel';
}

// Extract progress summary
function extractProgressSummary(message) {
  // Take the first sentence or meaningful part
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 5);
  return sentences[0]?.trim() || message.substring(0, 200);
}

// Determine task priority
function determinePriority(message) {
  const highPriorityWords = ['urgent', 'asap', 'immediately', 'critical', 'important', 'priority'];
  const lowPriorityWords = ['when possible', 'eventually', 'later', 'low priority'];

  if (highPriorityWords.some(word => message.toLowerCase().includes(word))) {
    return 'high';
  }

  if (lowPriorityWords.some(word => message.toLowerCase().includes(word))) {
    return 'low';
  }

  return 'medium';
}

// Determine issue severity
function determineSeverity(message) {
  const criticalWords = ['critical', 'emergency', 'dangerous', 'safety', 'severe'];
  const highWords = ['urgent', 'major', 'significant', 'important'];
  const lowWords = ['minor', 'small', 'cosmetic', 'trivial'];

  if (criticalWords.some(word => message.toLowerCase().includes(word))) {
    return 'critical';
  }

  if (highWords.some(word => message.toLowerCase().includes(word))) {
    return 'high';
  }

  if (lowWords.some(word => message.toLowerCase().includes(word))) {
    return 'low';
  }

  return 'medium';
}

// Extract due date from message
function extractDueDate(message) {
  try {
    const results = chrono.parse(message);
    if (results.length > 0) {
      return results[0].start.date();
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }
  return null;
}

// Generate AI response for channel messages
exports.generateResponse = async (message, analysis) => {
  // Simple rule-based responses for now
  const lowerMessage = message.toLowerCase();

  if (analysis.shouldCreateTask) {
    return `I've created a task for "${analysis.taskTitle}"${analysis.dueDate ? ` due by ${analysis.dueDate.toDateString()}` : ''}. You can view and manage all tasks in the BrixAI widget.`;
  }

  if (analysis.shouldCreateIssue) {
    return `I've logged this issue: "${analysis.issueTitle}". The team will address it based on the severity level.`;
  }

  if (analysis.shouldLogProgress) {
    return `Thanks for the progress update! This has been logged in the project timeline.`;
  }

  // General construction-related responses
  if (lowerMessage.includes('summary') || lowerMessage.includes('status')) {
    return 'I can provide a project summary. Check the BrixAI widget for detailed analytics and reports.';
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return `I'm BrixAI, your construction management assistant! I can:
• Create tasks from your messages (e.g., "we need to complete plumbing by tomorrow")
• Report issues automatically
• Log progress updates
• Provide project summaries
• Help with scheduling and deadlines

Use the BrixAI widget for full project management features.`;
  }

  // Default response for unrecognized messages
  return null; // Don't respond to everything to avoid spam
};

// Suggest assignee for a task (simple implementation)
exports.suggestAssignee = async (projectId, taskTitle) => {
  try {
    // In a real implementation, this would use ML to suggest the best person
    // For now, we'll just return a random team member or null

    const Project = require('../models/Project');
    const User = require('../models/User');

    const project = await Project.findById(projectId).populate('members');
    if (!project || !project.members.length) {
      return null;
    }

    // Simple logic: prefer engineers for technical tasks
    const lowerTitle = taskTitle.toLowerCase();
    let preferredRole = 'labor';

    if (lowerTitle.includes('design') || lowerTitle.includes('plan') || lowerTitle.includes('engineer')) {
      preferredRole = 'engineer';
    } else if (lowerTitle.includes('supervise') || lowerTitle.includes('manage') || lowerTitle.includes('oversee')) {
      preferredRole = 'mistri';
    }

    // Find users with preferred role
    const suitableUsers = project.members.filter(user => user.role === preferredRole);

    if (suitableUsers.length > 0) {
      return suitableUsers[Math.floor(Math.random() * suitableUsers.length)];
    }

    // Fallback to any team member
    return project.members[Math.floor(Math.random() * project.members.length)];
  } catch (error) {
    console.error('Error suggesting assignee:', error);
    return null;
  }
};

// Classify issue severity (enhanced version)
exports.classifyIssueSeverity = async (description, imageUrl = null) => {
  // Simple rule-based classification
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('safety') || lowerDesc.includes('danger') || lowerDesc.includes('emergency')) {
    return 'critical';
  }

  if (lowerDesc.includes('delay') || lowerDesc.includes('blocked') || lowerDesc.includes('urgent')) {
    return 'high';
  }

  if (lowerDesc.includes('cosmetic') || lowerDesc.includes('minor') || lowerDesc.includes('small')) {
    return 'low';
  }

  return 'medium';
};
