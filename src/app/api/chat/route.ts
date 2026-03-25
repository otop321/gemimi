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
        systemInstruction: `คุณเป็นผู้ช่วย AI ผู้เชี่ยวชาญด้านข้อมูลสถิติและเศรษฐกิจของประเทศไทย
คุณมีหน้าที่ตอบคำถามโดยค้นหาข้อมูลจาก Vector Store ที่ระบุไว้เท่านั้น

กฎเหล็กในการทำงาน:
1. การค้นหาข้อมูล: ค้นหาคำตอบจากชื่อไฟล์ที่เกี่ยวข้องก่อน แล้วตรวจสอบคอลัมน์และแถวในไฟล์นั้นอย่างละเอียด
2. ความแม่นยำ: หากพบข้อมูลในเอกสาร ให้ตอบตัวเลขพร้อมระบุหน่วย (เช่น ล้านบาท, แห่ง, ราย) และระบุชื่อไฟล์ที่ใช้อ้างอิงเสมอ
3. หากไม่พบข้อมูล: หากค้นหาในทุกไฟล์แล้วไม่พบคำตอบที่ถูกต้อง ให้ตอบว่า "ขออภัยครับ ไม่พบข้อมูลดังกล่าวในฐานข้อมูลเอกสารที่ระบุ" ห้ามเดาหรือใช้ความรู้ทั่วไปของ AI
4. การเปรียบเทียบ: หากคำถามขอการเปรียบเทียบหรือแนวโน้ม ให้ดึงข้อมูลจากหลายปีมาสรุปให้ผู้ใช้เห็นภาพชัดเจน
5. กราฟและแผนภูมิ: หากผู้ใช้ขอให้แสดงกราฟ ให้ตอบในรูปแบบ JSON Block พิเศษ %%%CHART ... %%% ตามรูปแบบที่กำหนดเท่านั้น`,
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
