import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const polishNote = async (content: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return content;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful assistant for a personal relationship manager app. 
      Rewrite the following rough note to be more concise, professional, and grammatically correct. 
      Keep the tone neutral but warm. Do not add any introductory text, just return the polished note.
      
      Rough note: "${content}"`,
    });
    return response.text || content;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return content;
  }
};

export const suggestConversationStarters = async (personName: string, notes: string[]): Promise<string[]> => {
  const ai = getClient();
  if (!ai) return [];

  const context = notes.slice(0, 5).join("\n"); // Use last 5 notes for context

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following notes about ${personName}, suggest 3 brief, friendly conversation starters for the next time we meet.
      Return the result as a simple JSON array of strings.
      
      Notes history:
      ${context}`,
    });

    const text = response.text || "[]";
    // Basic cleanup to ensure we parse JSON array
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1) {
       const jsonString = text.substring(jsonStart, jsonEnd + 1);
       return JSON.parse(jsonString);
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};
