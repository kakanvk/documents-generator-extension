import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { sheetPrompt } from "../prompt/sheet.prompt";
import { GeminiResponse } from "./res.type";

// Helper để tạo part cho file (nếu input là base64)
function fileToGenerativePart(base64Data: string, mimeType: string): Part {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

export async function generateSheetJson(
  apiKey: string,
  tasks: any[],
  files: { fileName: string; content: string }[],
  images: { base64: string; mimeType: string }[],
  modelName: string = "gemini-3-pro-preview",
): Promise<{ data: GeminiResponse; prompt: string }> {
  if (!apiKey) throw new Error("API Key is missing");

  // gemini-3-pro-preview
  // gemini-3-flash-preview
  // gemini-2.5-flash
  // gemini-2.5-flash-lite

  const genAI = new GoogleGenerativeAI(apiKey);
  // Sử dụng model mới nhất hỗ trợ multimodal tốt
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  // 1. Chuẩn bị prompt text
  let promptText = sheetPrompt + "\n\nINPUT DATA:\n";

  // Thêm danh sách task
  promptText += "DANH SÁCH TASK CẦN XỬ LÝ:\n";
  tasks.forEach((task) => {
    promptText += `- ID: ${task.id}\n- EPIC: ${task.epic || ""}\n- Task:\n`;
    if (task.userStories && task.userStories.length > 0) {
      task.userStories.forEach((u: any, index: number) => {
        const timeInfo =
          u.startDate || u.endDate
            ? ` (Start: ${u.startDate}, End: ${u.endDate})`
            : "";
        promptText += `${u.content}${timeInfo}\n`;
      });
    } else {
      promptText += `Empty user stories\n`;
    }
    promptText += "\n";
  });

  // Thêm nội dung code files
  // LOGIC MOVED: Only include file NAMES in the prompt log for brevity,
  // but include CONTENT in the actual API call text part.

  let promptForLog =
    promptText +
    "\nCODE FILES included: " +
    files.map((f) => f.fileName).join(", ") +
    "\n";

  // Appending actual content to promptText for API
  promptText += "\nCODE FILES:\n";
  files.forEach((file) => {
    promptText += `File: ${file.fileName}\nContent:\n${file.content}\n---\n`;
  });

  // 2. Chuẩn bị parts (text + images)
  const parts: Part[] = [{ text: promptText }];

  // Thêm images (nếu có)
  if (images && images.length > 0) {
    images.forEach((img) => {
      // Loại bỏ header 'data:image/png;base64,' nếu có để lấy raw base64
      const base64Clean = img.base64.replace(/^data:image\/\w+;base64,/, "");
      parts.push(fileToGenerativePart(base64Clean, img.mimeType));
    });
  }

  // 3. Gọi Gemini
  const result = await model.generateContent(parts);
  const response = await result.response;
  const text = response.text();

  // Clean markdown json block if necessary
  const cleanJson = text
    .replace(/```json\n|\n```/g, "")
    .replace(/```/g, "")
    .trim();

  return {
    data: JSON.parse(cleanJson) as GeminiResponse,
    prompt: promptForLog,
  };
}

export async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: "GET",
      },
    );

    return response.status === 200;
  } catch (error) {
    console.error("Error validating Gemini API Key:", error);
    return false;
  }
}
