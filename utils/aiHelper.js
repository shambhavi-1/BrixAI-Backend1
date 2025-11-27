// backend/utils/aiHelper.js
const OpenAI = require("openai");
const Prediction = require("../models/Prediction");
const Task = require("../models/Task");
const Material = require("../models/Material");
const User = require("../models/User");
const DayLog = require("../models/DayLog");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = {
  classifyIssueSeverity: async (text, imageUrl) => {
    try {
      const prompt = `Classify severity (low, medium, high) for this issue description:\n\n${text}\n\nRespond with one word only.`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 6
      });
      const severity = (resp.choices[0].message.content || "low").trim().toLowerCase();
      await Prediction.create({ type: "issue_severity", result: severity });
      return ["low", "medium", "high"].includes(severity) ? severity : "low";
    } catch (err) {
      await Prediction.create({ type: "issue_severity", result: "low", source: "error" });
      return "low";
    }
  },

  generateDailySummary: async (progressText) => {
    try {
      const prompt = `Summarize the following construction day progress in 3 bullet points and one action item:\n\n${progressText}`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 250
      });
      const summary = resp.choices[0].message.content.trim();
      await Prediction.create({ type: "daily_summary", result: summary });
      return summary;
    } catch (err) {
      return progressText.slice(0, 300);
    }
  },

  analyzePhoto: async (imageUrl) => {
    try {
      const prompt = `You are an expert construction inspector. Inspect this image and return JSON:
{ issues: [{label:"", confidence:0.0, note:""}], safety_score:0-100, suggested_actions: ["..."] }
Image URL: ${imageUrl}
Return only JSON.`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 350
      });
      const text = resp.choices[0].message.content.trim();
      try {
        const parsed = JSON.parse(text);
        await Prediction.create({ type: "vision_analysis", result: parsed });
        return parsed;
      } catch (e) {
        await Prediction.create({ type: "vision_analysis", result: { raw: text } });
        return { issues: [], safety_score: 80, suggested_actions: [], raw: text };
      }
    } catch (err) {
      console.warn("analyzePhoto error", err.message);
      return { issues: [], safety_score: 80, suggested_actions: [] };
    }
  },

  predictDelay: async (projectId) => {
    try {
      const daylogs = await DayLog.find({ project: projectId }).sort({ date: -1 }).limit(20);
      const recentText = daylogs.map(d => `${d.date.toISOString()}: ${d.progress}`).join("\n");
      const prompt = `Given the following recent progress logs, return JSON { delay: boolean, confidence:0.0-1.0, reason: "..." }:\n\n${recentText}`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200
      });
      const text = resp.choices[0].message.content.trim();
      let parsed = { delay: false, confidence: 0.2, reason: text };
      try { parsed = JSON.parse(text); } catch {}
      await Prediction.create({ project: projectId, type: "delay_prediction", result: parsed });
      return parsed;
    } catch (err) {
      return { delay: false, confidence: 0.3, reason: "model error" };
    }
  },

  suggestImprovement: async (projectId) => {
    try {
      const prompt = `Provide 3 short, practical improvements for a construction project id ${projectId}. Keep each suggestion one sentence.`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200
      });
      const suggestion = resp.choices[0].message.content.trim();
      await Prediction.create({ project: projectId, type: "improvement_suggestion", result: suggestion });
      return suggestion;
    } catch (err) {
      return "Check material supply and labor allocation weekly";
    }
  },

  forecastMaterial: async (projectId, materialName) => {
    try {
      const prompt = `Estimate when ${materialName} will run out for project ${projectId} given recent usage trends. Answer JSON: { willRunOut: boolean, estimatedDays: number, reason: "..." }`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
      });
      const text = resp.choices[0].message.content.trim();
      try {
        const parsed = JSON.parse(text);
        await Prediction.create({ project: projectId, type: "material_forecast", result: parsed });
        return parsed;
      } catch (e) {
        return { willRunOut: false, estimatedDays: 999, reason: text };
      }
    } catch (err) {
      return { willRunOut: false, estimatedDays: 999, reason: "error" };
    }
  },

  suggestAssignee: async (projectId, taskTitle) => {
    try {
      const users = await User.find({ projects: projectId }).limit(50).select("name role email");
      const userList = users.map(u => `${u.name} (${u.role})`).join(", ");
      const prompt = `We have task: "${taskTitle}". Choose best assignee from list: ${userList}. Return just the assignee email or name.`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60
      });
      const pick = resp.choices[0].message.content.trim();
      await Prediction.create({ project: projectId, type: "assignee_suggestion", result: pick });
      const byEmail = await User.findOne({ email: pick });
      if (byEmail) return byEmail;
      const byName = await User.findOne({ name: { $regex: new RegExp(pick.split(" ")[0], "i") } });
      return byEmail || byName || null;
    } catch (err) {
      return null;
    }
  }
};
