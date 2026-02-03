
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getApiKey = () => {
    try {
        // Safe check for process.env in browser
        return (typeof process !== 'undefined' && process.env) ? process.env.API_KEY || "" : "";
    } catch {
        return "";
    }
};

const getClient = () => {
  if (!aiClient) {
    const key = getApiKey();
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
};

export const getAIResponse = async (prompt: string) => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful and witty chat assistant. Keep responses brief and conversational, suitable for a mobile chat app. If asked about facts, use common knowledge or admit if unsure.",
      }
    });
    return response.text || "I'm thinking...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I'm having a bit of trouble connecting to my brain right now. 🤖";
  }
};
