import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { messages, vectorStoreId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    // Use the vector store ID from the request, or fall back to the env variable
    const activeVectorStoreId = vectorStoreId || process.env.VECTOR_STORE_ID || null;

    // Build tools array to inject Vector Store search if an ID is available
    const tools = activeVectorStoreId
      ? [{ fileSearch: { fileSearchStoreNames: [activeVectorStoreId] } }]
      : [];

    // Format chat history for the SDK
    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const currentMessage = messages[messages.length - 1];

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `คุณเป็นผู้ช่วย AI ที่ตอบคำถามโดยอ้างอิงจากเอกสารที่ให้มาเท่านั้น ถ้าหาคำตอบไม่เจอในเอกสาร ให้ตอบว่าไม่ทราบ ห้ามเดา

กฎสำคัญเรื่องกราฟ: ถ้าผู้ใช้ขอให้แสดงกราฟ แผนภูมิ หรือ chart ให้ตอบข้อมูลตัวเลขในรูปแบบ JSON พิเศษตามนี้:
ให้ตอบคำอธิบายข้อมูลก่อน ตามด้วย JSON block:
%%%CHART
{"type":"bar","title":"ชื่อกราฟ","labels":["หมวด1","หมวด2"],"datasets":[{"label":"ชื่อชุดข้อมูล","data":[100,200]}]}
%%%
- type ต้องเป็น "bar", "line", หรือ "pie" เท่านั้น
- labels คือชื่อแกน X หรือหมวดหมู่
- datasets คือชุดข้อมูลตัวเลข สามารถมีได้หลายชุด
- ตอบ JSON ในบรรทัดเดียว ห้ามขึ้นบรรทัดใหม่ใน JSON
- ถ้าผู้ใช้ไม่ได้ขอกราฟ ให้ตอบเป็นข้อความปกติ`,
        temperature: 0.1,
        tools: tools,
      },
      history: history,
    });

    const response = await chat.sendMessage({
      message: currentMessage.content,
    });

    return NextResponse.json({
      role: "assistant",
      content: response.text,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate response.";
    console.error("Error in chat:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
