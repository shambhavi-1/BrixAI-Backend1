// backend/utils/visionHelper.js
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = {
  analyzeImage: async (imageUrl) => {
    try {
      const prompt = `You are an assistant inspecting construction site photos.
Given the photo URL: ${imageUrl}
Return a JSON object:
{ issues: [ { label: "leak|crack|no-helmet|scaffold", confidence: 0.0-1.0, note: "..." } ], safety_score: 0-100 }
Return only JSON.`;

      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      });

      const text = resp.choices[0].message.content.trim();
      try {
        return JSON.parse(text);
      } catch (e) {
        return { issues: [], safety_score: 80, raw: text };
      }
    } catch (err) {
      console.warn("visionHelper error", err.message);
      return { issues: [], safety_score: 80, error: true };
    }
  }
};
