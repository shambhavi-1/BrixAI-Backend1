// backend/utils/sttService.js
const OpenAI = require("openai");
const fs = require("fs");

// New SDK client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = {
  transcribeFile: async (filePath) => {
    try {
      const resp = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "gpt-4o-transcribe"
      });
      return resp.text;
    } catch (err) {
      console.error("STT Error:", err);
      return "";
    }
  }
};
