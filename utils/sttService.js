// backend/utils/sttService.js
const OpenAI = require("openai");
const fs = require("fs");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-testing',
  baseURL: 'https://api.groq.com/openai/v1'
});

module.exports = {
  transcribeFile: async (filePath) => {
    try {
      // Read file and encode to base64
      const audioBuffer = fs.readFileSync(filePath);
      const base64Audio = audioBuffer.toString('base64');

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `Transcribe this audio file to text. Audio data: data:audio/wav;base64,${base64Audio}`
          }
        ],
        model: 'llama3-8b-8192',
        max_tokens: 200,
      });

      return response.choices[0].message.content.trim();
    } catch (err) {
      console.error("STT Error:", err);
      return "";
    }
  }
};
