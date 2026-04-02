import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeGarbageImage(base64Image: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze the given image and perform a comprehensive object detection. 
Identify EVERY single identifiable object in the scene, no matter how small or common.
This includes:
- People (actions, clothing)
- Vehicles (type, color, plates)
- Infrastructure (poles, signs, benches, bins)
- Nature (trees, plants, animals)
- Buildings and structures
- Litter and garbage (specific items)
- Personal items (bags, phones, umbrellas)

Return the result in JSON format with:
{
  "garbage_detected": true/false,
  "person_detected": true/false,
  "throwing_action": true/false,
  "vehicle_detected": true/false,
  "number_plate": "text or null",
  "detected_items": ["garbage_item1", "garbage_item2", ...],
  "all_objects": ["object1", "object2", "object3", "object4", "object5", ...],
  "scene_description": "A very detailed description of the entire scene",
  "confidence": percentage,
  "severity": "low" | "medium" | "high"
}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            garbage_detected: { type: Type.BOOLEAN },
            person_detected: { type: Type.BOOLEAN },
            throwing_action: { type: Type.BOOLEAN },
            vehicle_detected: { type: Type.BOOLEAN },
            number_plate: { type: Type.STRING, nullable: true },
            detected_items: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "A detailed list of all individual items detected in the garbage"
            },
            all_objects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of all major objects detected in the entire scene (people, cars, etc.)"
            },
            scene_description: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            severity: { type: Type.STRING, enum: ["low", "medium", "high"] }
          },
          required: ["garbage_detected", "person_detected", "throwing_action", "vehicle_detected", "detected_items", "all_objects", "scene_description", "confidence", "severity"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error(`Gemini analysis failed. Image size: ${Math.round(base64Image.length / 1024)} KB`, error);
    throw error;
  }
}

export async function getPredictiveInsights(reports: any[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Based on the following garbage reports (location, time, severity), predict high-risk dumping zones and provide a short summary for each zone.
  
  Reports: ${JSON.stringify(reports)}
  
  Return an array of zones with:
  {
    "lat": number,
    "lng": number,
    "riskLevel": 0-100,
    "prediction": "string summary"
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            riskLevel: { type: Type.NUMBER },
            prediction: { type: Type.STRING }
          },
          required: ["lat", "lng", "riskLevel", "prediction"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}
