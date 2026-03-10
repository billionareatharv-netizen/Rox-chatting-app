import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: "https://aimodelapi.onrender.com/v1",
  apiKey: "devx-5xc0eda8tc5rcjgvuo0kxio4wncq1o1v",
  dangerouslyAllowBrowser: true
});

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export const aiService = {
  async generateCaptionOptions(prompt: string): Promise<string[]> {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: "You are a creative social media manager. Generate 5 catchy, trendy captions with emojis based on the user's description. Return them as a simple list separated by pipe characters (|). Keep them short and engaging." },
        { role: 'user', content: `Generate captions for: ${prompt}` }
      ]
    });
    const content = response.choices[0].message.content || "";
    return content.split('|').map(s => s.trim()).filter(Boolean);
  },

  async generateHashtags(caption: string): Promise<string> {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: "Generate 5-10 relevant and trending hashtags for the given caption. Return only the hashtags separated by spaces." },
        { role: 'user', content: `Caption: ${caption}` }
      ]
    });
    return response.choices[0].message.content || "";
  },

  async generateBioOptions(interests: string): Promise<string[]> {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: "Create 5 short, creative social media bios (max 150 chars) based on the user's interests. Use emojis. Return them as a simple list separated by pipe characters (|)." },
        { role: 'user', content: `Interests: ${interests}` }
      ]
    });
    const content = response.choices[0].message.content || "";
    return content.split('|').map(s => s.trim()).filter(Boolean);
  },

  async suggestCommentReplies(comment: string): Promise<string[]> {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: "Suggest 3 short, friendly, and engaging replies to the given comment. Return them as a simple list separated by pipe characters (|)." },
        { role: 'user', content: `Comment: ${comment}` }
      ]
    });
    const content = response.choices[0].message.content || "";
    return content.split('|').map(s => s.trim()).filter(Boolean);
  },

  async suggestDMReplies(lastMessage: string): Promise<string[]> {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: "Suggest 3 quick, natural-sounding replies for a direct message. Return them as a simple list separated by pipe characters (|)." },
        { role: 'user', content: `Last message: ${lastMessage}` }
      ]
    });
    const content = response.choices[0].message.content || "";
    return content.split('|').map(s => s.trim()).filter(Boolean);
  },

  async filterContent(text: string): Promise<{ isSafe: boolean; reason?: string }> {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: "Act as a content moderator. Analyze the text for abusive language, spam, or offensive content. Return a JSON object: { \"isSafe\": boolean, \"reason\": \"string\" }." },
        { role: 'user', content: `Analyze this text: ${text}` }
      ],
      response_format: { type: 'json_object' }
    });
    try {
      return JSON.parse(response.choices[0].message.content || '{"isSafe": true}');
    } catch (e) {
      return { isSafe: true };
    }
  },

  async refineText(text: string, style: 'engaging' | 'professional' | 'concise' = 'engaging'): Promise<string> {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: `Rewrite the following text to be more ${style} and improve grammar. Keep the original meaning.` },
        { role: 'user', content: text }
      ]
    });
    return response.choices[0].message.content || text;
  }
};
