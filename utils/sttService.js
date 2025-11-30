// backend/utils/sttService.js
const OpenAI = require("openai");
const fs = require("fs");

// Lazy load OpenAI client
let openai = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-testing') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

module.exports = {
  transcribeFile: async (filePath) => {
    const client = getOpenAI();
    if (!client) {
      console.log("OpenAI not available, skipping transcription");
      return "";
    }

    try {
      const resp = await client.audio.transcriptions.create({
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
