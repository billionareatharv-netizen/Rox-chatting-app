
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

export const getAIResponse = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a helpful and witty chat assistant. Keep responses brief and conversational, suitable for a mobile chat app. If asked about facts, use common knowledge or admit if unsure.",
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I'm having a bit of trouble connecting to my brain right now. 🤖";
  }
};
