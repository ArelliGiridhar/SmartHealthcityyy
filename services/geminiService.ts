
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Automatically recognizes the problem category and generates a description.
 * Uses gemini-3-pro-preview for deep image understanding.
 */
export const analyzeProblemFromImage = async (base64Image: string) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1] || base64Image;

  const prompt = `You are a Smart City AI Assistant. Analyze this photo taken by a citizen.
  Identify:
  1. The most likely category from this list: GARBAGE, ROAD_DAMAGE, WATER_LEAKAGE, DRAINAGE, STREET_LIGHT, OTHER.
  2. A concise, professional 1-2 sentence description of the issue.
  Return a JSON object with 'category' and 'description'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { 
              type: Type.STRING,
              description: "One of: GARBAGE, ROAD_DAMAGE, WATER_LEAKAGE, DRAINAGE, STREET_LIGHT, OTHER"
            },
            description: { type: Type.STRING }
          },
          required: ["category", "description"]
        },
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Analysis failed", error);
    throw error;
  }
};

/**
 * Verifies complaint image using Gemini 3 Pro Preview for deep analysis.
 */
export const verifyComplaintImage = async (base64Image: string, category: string) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1] || base64Image;

  const prompt = `System role: Expert Urban Infrastructure Auditor.
  Task: Analyze this photo for a reported "${category}" complaint.
  Rules:
  1. Determine if the issue is physically visible in the photo.
  2. Rate the legitimacy based on evidence.
  3. Provide a clear reason for your decision.
  Return a JSON object only.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isLegitimate: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["isLegitimate", "reason", "confidence"]
        },
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Analysis failed, falling back to basic verification", error);
    return { isLegitimate: true, reason: "Detailed AI analysis failed or budget exceeded. Manual review required.", confidence: 0.5 };
  }
};

/**
 * Gets full address from coords using Maps grounding.
 * Maps grounding is only supported in Gemini 2.5 series models.
 */
export const getFullAddressFromCoords = async (lat: number, lng: number) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Identify the precise municipal and street address for coordinates ${lat}, ${lng} in India.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Maps grounding failed", error);
    return "Address localized to GPS coordinates.";
  }
};

/**
 * Edits complaint image using Gemini 2.5 Flash Image.
 */
export const editComplaintImage = async (base64Image: string, prompt: string) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1] || base64Image;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: 'image/png' } },
        { text: prompt },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return base64Image;
};

/**
 * Generates an animated video of the issue using Veo 3.1.
 */
export const generateAnimateVideo = async (base64Image: string) => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1] || base64Image;

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: 'A professional handheld camera shot inspecting this urban damage, showing its impact on the street.',
    image: {
      imageBytes: base64Data,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  // Fetch MP4 bytes with API key appended as per guidelines.
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

/**
 * Performs search grounding with Gemini 3 Flash Preview.
 */
export const searchGroundingInfo = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text || '',
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

/**
 * Performs maps grounding for infrastructure analysis using Gemini 2.5 series models.
 */
export const mapsGroundingInfo = async (query: string, lat?: number, lng?: number) => {
  const ai = getAI();
  const config: any = {
    tools: [{ googleMaps: {} }],
  };
  
  if (lat && lng) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: { latitude: lat, longitude: lng }
      }
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config
  });

  return {
    text: response.text || '',
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};
