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
const jwt = require('jsonwebtoken');

// ---------------------- TOKEN STORE
const userTokens = new Map(); // key: cliqUserId, value: JWT
const getTokenForCliqUser = (cliqUserId) => {
  if (!cliqUserId) return null;
  return userTokens.get(cliqUserId) || null;
};

// ---------------------- ARGUMENT PARSER
const parseArgs = (text = "") => {
  const re = /"([^"]+)"|'([^']+)'|(\S+)/g;
  const args = [];
  let m;
  while ((m = re.exec(text)) !== null) args.push(m[1] || m[2] || m[3]);
  return args;
};

// ---------------------- CLI RESPONSE SHORTCUT
const respond = (res, msg, attachments) => {
  if (attachments) return res.json({ text: msg, attachments });
  return res.json({ text: msg });
};

// ---------------------- MAIN COMMAND HANDLER
exports.handleCliqCommand = async (req, res) => {
  try {
    const payload = req.body || {};
    const raw = (payload.text || "").trim();

    const cmd = (payload.command || raw.split(" ")[0] || "")
      .replace("/", "")
      .toLowerCase();

    const args = parseArgs(raw.replace(cmd, "").trim());

    const cliqUserId = payload.user?.id;
    const cliqUserEmail = payload.user?.email;

    const resolveProject = async (code) => {
      if (!code) return null;
      return await Project.findOne({ code });
    };

    // ---------------------- HELP / MAIN MENU
    if (!cmd || cmd === "bphelp" || cmd === "bp") {
      return respond(
        res,
        `BP Commands:
/bphelp — Help menu
/bplogin <email>|<password> — Login
/bpregister <name>|<email>|<password> — Register
/bpgetprofile — Fetch user profile
/bpjoin CODE — Join project
/bpprojects — List user's projects
/bptasks CODE — List tasks
/bptaskcreate "title" "desc" CODE [assigneeEmail] — Create task
/bptaskdetails TASKID — Task details
/bpdaylog FILE_URL CODE — Submit day log
/bpissue "title" "desc" CODE [img] — Report issue
/bpmaterials — Material request
/bpattendance CODE email present|absent — Mark attendance
/bpsummary CODE or "text" — AI summary
/bprisk CODE — Predict project risks
/bpacceptorder ORDERID — Accept order
/bpmarkdelivered ORDERID — Mark order delivered`
      );
    }

    // ---------------------- BP REGISTER
    if (cmd === "bpregister") {
  const input = args.join(" ");
  const [name, email, password] = input.split("|").map(s => s?.trim());

  if (!name || !email || !password) {
    return respond(res, "❌ Usage: /bpregister Name|email|password");
  }

  try {
    const response = await axios.post(`${process.env.API_BASE_URL}/auth/register`, {
      name,
      email,
      password,
      role: "labor"
    });

    // Optionally store token for Cliq login right away
    if (cliqUserId && response.data.token) {
      userTokens.set(cliqUserId, response.data.token);
    }

    return respond(res, `✅ Registration successful for ${response.data.user.name}`);
  } catch (err) {
    console.error("BP Register error:", err.response?.data || err.message);
    return respond(res, `❌ Registration failed: ${err.response?.data?.message || "error"}`);
  }
}


    // BP LOGIN
if (cmd === "bplogin") {
  const input = args.join(" ");
  const [email, password] = input.split("|").map(s => s?.trim());

  if (!email || !password) {
    return respond(res, "❌ Usage: /bplogin <email>|<password>");
  }

  try {
    const response = await axios.post(`${process.env.API_BASE_URL}/auth/login`, {
      email,
      password
    });

    const token = response.data.token; 
    const cliqUserId = payload.user?.id;

    if (cliqUserId && token) {
      userTokens.set(cliqUserId, token);
    }

    return respond(res, `🔐 Login successful\nUser: ${response.data.user.name}`);
  } catch (err) {
    return respond(res, `❌ Login failed: ${err.response?.data?.message || "error"}`);
  }
}

    // ---------------------- BP GET PROFILE
    if (cmd === "bpgetprofile") {
      const token = getTokenForCliqUser(cliqUserId);
      if (!token) return respond(res, "❌ You are not logged in. Use /bplogin first.");

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return respond(res, "❌ User not found");

        return respond(res, `👤 Profile:\nName: ${user.name}\nEmail: ${user.email}`);
      } catch (err) {
        console.error("BP Profile error:", err);
        if (cliqUserId) userTokens.delete(cliqUserId);
        return respond(res, "❌ Profile error: invalid/expired token");
      }
    }

    // ---------------------- JOIN PROJECT
    if (cmd === "bpjoin") {
      const code = args[0];
      if (!code) return respond(res, "Usage: /bpjoin CODE");

      const project = await resolveProject(code);
      if (!project) return respond(res, "Project not found");

      let user = await User.findOne({ email: cliqUserEmail });
      if (!user) {
        user = await User.create({
          name: payload?.user?.name || "Cliq User",
          email: cliqUserEmail || `user${Date.now()}@cliq.local`,
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

    // ---------------------- PROJECTS LIST
    if (cmd === "bpprojects") {
      const list = (await Project.find())
        .map((p) => `${p.name} (${p.code})`)
        .join("\n") || "No projects";
      return respond(res, list);
    }

    // ---------------------- CREATE TASK
    if (cmd === "bptaskcreate") {
      const [title, description, projectCode, assigneeEmail] = args;
      if (!title || !projectCode) return respond(res, "Usage: /bptaskcreate \"title\" \"desc\" CODE [assigneeEmail]");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      let assignee = assigneeEmail ? await User.findOne({ email: assigneeEmail }) : await aiHelper.suggestAssignee(proj._id, title);

      const task = await Task.create({ title, description, project: proj._id, assignedTo: assignee?._id });
      await sendToCliq(`New Task in ${proj.name}: ${task.title}`);
      return respond(res, `Task created: ${task.title}`);
    }

    // ---------------------- TASKS LIST
    if (cmd === "bptasks") {
      const code = args[0];
      if (!code) return respond(res, "Usage: /bptasks CODE");

      const proj = await resolveProject(code);
      if (!proj) return respond(res, "Project not found");

      const tasks = await Task.find({ project: proj._id }).populate("assignedTo", "name role");
      return respond(res, tasks.length
        ? tasks.map((t) => `${t.title} — ${t.status} — ${t.assignedTo?.name || "unassigned"}`).join("\n")
        : "No tasks");
    }

    // ---------------------- DAY LOG
    if (cmd === "bpdaylog") {
      const [fileUrl, projectCode] = args;
      if (!fileUrl || !projectCode) return respond(res, "Usage: /bpdaylog FILE_URL CODE");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

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

      if (!transcript) return respond(res, "Could not transcribe audio");

      await DayLog.create({ project: proj._id, progress: transcript, summary: transcript.slice(0, 200) });
      await sendToCliq(`Progress logged for ${proj.name}`);

      return respond(res, `Transcribed: ${transcript}`);
    }

    // ---------------------- REPORT ISSUE
    if (cmd === "bpissue") {
      const [title, description, projectCode, imageUrl] = args;
      if (!title || !projectCode) return respond(res, "Usage: /bpissue \"title\" \"desc\" CODE [img-url]");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      let uploaded = null;
      if (imageUrl && imageUrl.startsWith("http")) {
        const r = await cloudinary.uploader.upload(imageUrl, { folder: "buildproai/issues" });
        uploaded = r.secure_url;
      }

      const severity = await aiHelper.classifyIssueSeverity(description, uploaded);
      const issue = await Issue.create({ title, description, imageUrl: uploaded, severity, project: proj._id });
      await sendToCliq(`New Issue in ${proj.name}: ${title}`);

      return respond(res, `Issue reported: ${title}`);
    }

    // ---------------------- IMAGE ANALYSIS
    if (cmd === "analyzeimg") {
      const [imageUrl, projectCode] = args;
      if (!imageUrl || !projectCode) return respond(res, "Usage: /analyzeimg IMAGE_URL CODE");

      const proj = await resolveProject(projectCode);
      if (!proj) return respond(res, "Project not found");

      const analysis = await visionHelper.analyzeImage(imageUrl);
      if (analysis?.issues?.length > 0) {
        const top = analysis.issues[0];
        await Issue.create({
          title: `Detected: ${top.label}`,
          description: top.note || "",
          imageUrl,
          severity: top.confidence > 0.7 ? "high" : "medium",
          project: proj._id
        });
        await sendToCliq(`Auto Issue in ${proj.name}: ${top.label}`);
      }

      return respond(res, `Safety score: ${analysis.safety_score || "N/A"}`);
    }

    // ---------------------- UNKNOWN COMMAND
    return respond(res, "Unknown command. Type /bphelp");

  } catch (err) {
    console.error("cliq error", err);
    return res.status(500).json({ text: "server error" });
  }
};
