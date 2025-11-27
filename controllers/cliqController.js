// backend/controllers/cliqController.js
const Project = require('../models/Project');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const DayLog = require('../models/DayLog');

const sendToCliq = require('../utils/sendToCliq');
const cloudinary = require('../config/cloudinary');
const aiHelper = require('../utils/aiHelper');
const sttService = require('../utils/sttService');
const visionHelper = require('../utils/visionHelper');

const fs = require('fs');
const axios = require('axios');

// Argument parser: supports quotes (" ")
const parseArgs = (text = "") => {
  const re = /"([^"]+)"|'([^']+)'|(\S+)/g;
  const args = [];
  let m;
  while ((m = re.exec(text)) !== null) args.push(m[1] || m[2] || m[3]);
  return args;
};

// cli response shortcut
const respond = (res, msg, attachments) => {
  if (attachments) return res.json({ text: msg, attachments });
  return res.json({ text: msg });
};

// Role-based UI card (used for widgets later)
const buildRoleCard = (role, project) => {
  if (role === 'manager' || role === 'engineer') {
    return {
      text: `Project: ${project.name}`,
      attachments: [{
        title: 'Manager Actions',
        text: 'Summary, Predict, Create Task',
        actions: [
          { type: 'button', text: 'AI Summary', url: `/open?cmd=summary&proj=${project.code}` },
          { type: 'button', text: 'Predict Delay', url: `/open?cmd=predict&proj=${project.code}` }
        ]
      }]
    };
  }

  if (role === 'mistri') {
    return {
      text: `Project: ${project.name}`,
      attachments: [{
        title: 'Mistri Actions',
        text: 'Report Progress',
        actions: [
          { type: 'button', text: 'Report Progress', url: `/open?cmd=report&proj=${project.code}` }
        ]
      }]
    };
  }

  return { text: `Project: ${project.name} — Speak or upload photo to report progress.` };
};

// MAIN COMMAND HANDLER
exports.handleCliqCommand = async (req, res) => {
  try {
    const payload = req.body || {};
    const raw = (payload.text || "").trim();

    const cmd = (payload.command || raw.split(" ")[0] || "")
      .replace("/", "")
      .toLowerCase();

    const args = parseArgs(raw.replace(cmd, "").trim());

    // Default help
    if (!cmd || cmd === "help") {
      return respond(
        res,
        '/createproject "Name"\n' +
        '/joinproject CODE\n' +
        '/projects\n' +
        '/createtask "title" "desc" CODE email?\n' +
        '/tasks CODE\n' +
        '/reportissue "title" "desc" CODE [img]\n' +
        '/attendance CODE email present|absent\n' +
        '/summary CODE or "text"\n' +
        '/predictdelay CODE\n' +
        '/improve CODE\n' +
        '/analyzeimg IMAGE_URL CODE\n' +
        '/voice FILE_URL CODE'
      );
    }

    const resolveProject = async (code) => {
      if (!code) return null;
      return await Project.findOne({ code });
    };

    // ---------------------- CREATE PROJECT
    if (cmd === "createproject") {
      const name = args[0];
      if (!name) return respond(res, 'Usage: /createproject "Project Name"');

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const p = await Project.create({ name, code, members: [] });

      return respond(res, `Project created: ${p.name} (${p.code})`);
    }

    // ---------------------- JOIN PROJECT
    if (cmd === "joinproject") {
      const code = args[0];
      if (!code) return respond(res, "Usage: /joinproject CODE");

      const project = await resolveProject(code);
      if (!project) return respond(res, "Project not found");

      const cliqEmail = payload?.user?.email ||
        `${(payload?.user?.name || "cliquser").replace(/\s/g, "").toLowerCase()}@cliq.local`;

      let user = await User.findOne({ email: cliqEmail });

      if (!user) {
        user = await User.create({
          name: payload?.user?.name || "Cliq User",
          email: cliqEmail,
          password: Math.random().toString(36).substring(2, 8),
          role: "labor",
          projects: []
        });
      }

      if (!project.members.includes(user._id)) {
        project.members.push(user._id);
        user.projects.push(project._id);
        await project.save();
        await user.save();
      }

      return respond(res, `Joined project ${project.name}`);
    }

    // ---------------------- PROJECT LIST
    if (cmd === "projects") {
      const list = (await Project.find())
        .map((p) => `${p.name} (${p.code})`)
        .join("\n") || "No projects";

      return respond(res, list);
    }

    // ---------------------- CREATE TASK
    if (cmd === "createtask") {
      const [title, description, projectCode, assigneeEmail] = args;

      if (!title || !projectCode)
        return respond(res, "Usage: /createtask \"title\" \"desc\" CODE [assigneeEmail]");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      let assignee = null;
      if (assigneeEmail) {
        assignee = await User.findOne({ email: assigneeEmail });
      } else {
        assignee = await aiHelper.suggestAssignee(proj._id, title);
      }

      const task = await Task.create({
        title,
        description,
        project: proj._id,
        assignedTo: assignee?._id
      });

      await sendToCliq(`New Task in ${proj.name}: ${task.title}`);

      return respond(res, `Task created: ${task.title}`);
    }

    // ---------------------- TASKS LIST
    if (cmd === "tasks") {
      const code = args[0];
      if (!code) return respond(res, "Usage: /tasks CODE");

      const proj = await resolveProject(code);
      if (!proj) return respond(res, "Project not found");

      const tasks = await Task.find({ project: proj._id })
        .populate("assignedTo", "name role");

      return respond(
        res,
        tasks.length
          ? tasks.map((t) => `${t.title} — ${t.status} — ${t.assignedTo?.name || "unassigned"}`).join("\n")
          : "No tasks"
      );
    }

    // ---------------------- REPORT ISSUE
    if (cmd === "reportissue") {
      const [title, description, projectCode, imageUrl] = args;

      if (!title || !projectCode)
        return respond(res, "Usage: /reportissue \"title\" \"desc\" CODE [img-url]");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      let uploaded = null;

      if (imageUrl && imageUrl.startsWith("http")) {
        const r = await cloudinary.uploader.upload(imageUrl, {
          folder: "buildproai/issues",
        });
        uploaded = r.secure_url;
      }

      const severity = await aiHelper.classifyIssueSeverity(description, uploaded);

      const issue = await Issue.create({
        title,
        description,
        imageUrl: uploaded,
        severity,
        project: proj._id,
      });

      await sendToCliq(`New Issue in ${proj.name}: ${title}`);

      return respond(res, `Issue reported: ${title}`);
    }

    // ---------------------- ATTENDANCE
    if (cmd === "attendance") {
      const [projectCode, userEmail, status] = args;

      if (!projectCode || !userEmail || !status)
        return respond(res, "Usage: /attendance CODE email present|absent");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      let u = await User.findOne({ email: userEmail });
      if (!u) {
        u = await User.create({
          name: userEmail.split("@")[0],
          email: userEmail,
          password: Math.random().toString(36).substring(2, 8),
          role: "labor",
        });
      }

      const a = await Attendance.create({
        project: proj._id,
        user: u._id,
        status: status === "present" ? "present" : "absent",
      });

      return respond(res, `${u.name} marked ${a.status} for ${proj.name}`);
    }

    // ---------------------- LIST ISSUES
    if (cmd === "listissues") {
      const code = args[0];
      if (!code) return respond(res, "Usage: /listissues CODE");

      const proj = await resolveProject(code);
      if (!proj) return respond(res, "Project not found");

      const issues = await Issue.find({ project: proj._id });

      if (!issues.length) return respond(res, "No issues");

      return respond(
        res,
        issues.map((i) => `${i.title} - ${i.severity}`).join("\n")
      );
    }

    // ---------------------- SUMMARY
    if (cmd === "summary") {
      const maybeCode = args[0];

      // summary by project
      if (maybeCode && maybeCode.length <= 8) {
        const proj = await resolveProject(maybeCode);
        if (!proj) return respond(res, "Project not found");

        const logs = await DayLog.find({ project: proj._id })
          .sort({ date: -1 })
          .limit(30);

        const text = logs.map((l) => `- ${l.date.toISOString().slice(0, 10)}: ${l.progress}`)
          .join("\n");

        const summary = await aiHelper.generateDailySummary(text || "No logs");

        return respond(res, summary);
      }

      // summary of raw text
      const content = args.join(" ");
      if (!content) return respond(res, "Usage: /summary CODE or \"text\"");

      const summary = await aiHelper.generateDailySummary(content);
      return respond(res, summary);
    }

    // ---------------------- PREDICT DELAY
    if (cmd === "predictdelay") {
      const code = args[0];
      if (!code) return respond(res, "Usage: /predictdelay CODE");

      const proj = await resolveProject(code);
      if (!proj) return respond(res, "Project not found");

      const prediction = await aiHelper.predictDelay(proj._id);

      return respond(res, JSON.stringify(prediction));
    }

    // ---------------------- IMPROVE
    if (cmd === "improve") {
      const code = args[0];
      if (!code) return respond(res, "Usage: /improve CODE");

      const proj = await resolveProject(code);
      if (!proj) return respond(res, "Project not found");

      const suggestion = await aiHelper.suggestImprovement(proj._id);

      return respond(res, suggestion);
    }

    // ---------------------- IMAGE ANALYSIS (Vision AI)
    if (cmd === "analyzeimg") {
      const [imageUrl, projectCode] = args;

      if (!imageUrl || !projectCode)
        return respond(res, "Usage: /analyzeimg IMAGE_URL CODE");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      const analysis = await visionHelper.analyzeImage(imageUrl);

      // auto-create issue if required
      if (analysis?.issues?.length > 0) {
        const top = analysis.issues[0];

        await Issue.create({
          title: `Detected: ${top.label}`,
          description: top.note || "",
          imageUrl,
          severity: top.confidence > 0.7 ? "high" : "medium",
          project: proj._id,
        });

        await sendToCliq(`Auto Issue in ${proj.name}: ${top.label}`);
      }

      return respond(res, `Safety score: ${analysis.safety_score || "N/A"}`);
    }

    // ---------------------- VOICE (STT)
    if (cmd === "voice") {
      const [fileUrl, projectCode] = args;

      if (!fileUrl || !projectCode)
        return respond(res, "Usage: /voice FILE_URL CODE");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      // download file to temp
      const tmp = `/tmp/${Date.now()}.ogg`;
      const writer = fs.createWriteStream(tmp);

      const r = await axios.get(fileUrl, { responseType: "stream" });
      await new Promise((resolve, reject) => {
        r.data.pipe(writer);
        r.data.on("end", resolve);
        r.data.on("error", reject);
      });

      const transcript = await sttService.transcribeAudio(tmp);

      fs.unlinkSync(tmp);

      if (!transcript)
        return respond(res, "Could not transcribe audio");

      await DayLog.create({
        project: proj._id,
        progress: transcript,
        summary: transcript.slice(0, 200),
      });

      await sendToCliq(`Progress logged for ${proj.name}`);

      return respond(res, `Transcribed: ${transcript}`);
    }

    // ---------------------- UNKNOWN
    return respond(res, "Unknown command. Type /help");
  } catch (err) {
    console.error("cliq error", err);
    return res.status(500).json({ text: "server error" });
  }
};

// Convert message → task
exports.convertMessageToTask = async (req, res) => {
  try {
    const { messageText, projectCode, userEmail } = req.body;

    if (!messageText || !projectCode)
      return res.status(400).json({ message: "missing" });

    const proj = await Project.findOne({ code: projectCode });
    if (!proj) return res.status(404).json({ message: "project not found" });

    const assignee = userEmail ? await User.findOne({ email: userEmail }) : null;

    const task = await Task.create({
      title: messageText.slice(0, 80),
      description: messageText,
      project: proj._id,
      assignedTo: assignee?._id,
    });

    await sendToCliq(`Task created from message in ${proj.name}: ${task.title}`);

    res.json({ message: "ok", taskId: task._id });
  } catch (err) {
    console.error("convertMessageToTask", err);
    res.status(500).json({ message: "error" });
  }
};

// Widget data
exports.widgetData = async (req, res) => {
  try {
    const { projectCode } = req.query;

    if (!projectCode)
      return res.status(400).json({ message: "projectCode required" });

    const proj = await Project.findOne({ code: projectCode }).populate("members", "name role");
    if (!proj) return res.status(404).json({ message: "project not found" });

    const tasks = await Task.find({ project: proj._id })
      .populate("assignedTo", "name role");

    const issues = await Issue.find({ project: proj._id })
      .sort({ createdAt: -1 });

    const completed = await Task.countDocuments({ project: proj._id, status: "completed" });
    const pending = await Task.countDocuments({ project: proj._id, status: { $ne: "completed" } });

    res.json({
      project: proj,
      tasks,
      issues,
      kpis: { completed, pending },
    });
  } catch (err) {
    console.error("widgetData", err);
    res.status(500).json({ message: "error" });
  }
};

// Scheduler
exports.scheduledDailySummary = async (req, res) => {
  try {
    const secret = req.headers["x-scheduler-secret"];
    if (!secret || secret !== process.env.SCHEDULER_SECRET)
      return res.status(403).json({ message: "forbidden" });

    const projects = await Project.find();

    for (const proj of projects) {
      const logs = await DayLog.find({ project: proj._id })
        .sort({ date: -1 })
        .limit(30);

      const text = logs
        .map((l) => `- ${l.date.toISOString().slice(0, 10)}: ${l.progress}`)
        .join("\n") || "No logs";

      const summary = await aiHelper.generateDailySummary(text);

      await sendToCliq(`Daily Summary for ${proj.name}:\n${summary}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("scheduledDailySummary", err);
    res.status(500).json({ message: "error" });
  }
};
