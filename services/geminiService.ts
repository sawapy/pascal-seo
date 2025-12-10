import { GoogleGenAI } from "@google/genai";
import { RankingData, Keyword } from "../types";

// NOTE: This assumes process.env.API_KEY is available. 
// For this demo, we handle the case gracefully if it's missing.

const getAiClient = () => {
  const apiKey = process.env.API_KEY; 
  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeTrend = async (keyword: Keyword, data: RankingData[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    return "APIキーが設定されていないため、AI分析を実行できません。";
  }

  // Format data for the prompt
  const dataString = data.map(d => `${d.date}: ${d.rank}位`).join('\n');
  const prompt = `
    あなたはSEOの専門家です。以下のキーワードの検索順位推移データを分析し、
    変動の傾向（上昇傾向、下降傾向、安定など）と、考えられる要因や今後の対策について
    簡潔な日本語でアドバイスをください（200文字程度）。

    キーワード: "${keyword.term}"
    
    データ:
    ${dataString}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "分析結果を取得できませんでした。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "分析中にエラーが発生しました。";
  }
};