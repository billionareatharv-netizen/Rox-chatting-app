
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

export const getAIResponse = async (prompt: string) => {
  try {
    const ai = getClient();
    // Correct method: use ai.models.generateContent with both model and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful and witty chat assistant. Keep responses brief and conversational, suitable for a mobile chat app. If asked about facts, use common knowledge or admit if unsure.",
      }
    });
    // Access the text property directly (not a method).
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I'm having a bit of trouble connecting to my brain right now. 🤖";
  }
};
