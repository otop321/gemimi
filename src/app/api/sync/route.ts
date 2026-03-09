import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import os from "os";

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error("Form parsing error:", formError);
      return NextResponse.json(
        { error: "Failed to parse form data. File might be too large or corrupted." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    let vectorStoreId = formData.get("vectorStoreId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer and write to temp path
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const tempFilePath = join(os.tmpdir(), tempFileName);
    await writeFile(tempFilePath, buffer);

    console.log(`Uploading ${tempFileName} to Gemini... (${buffer.length} bytes)`);

    // Upload file to Google File API first
    const uploadedFile = await ai.files.upload({
      file: new Blob([buffer], { type: file.type || "text/csv" }),
      config: { displayName: file.name },
    });

    // Wait utility
    const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Polling for ACTIVE state to prevent 503 "Failed to count tokens" error 
    // when uploading large files directly to fileSearchStores
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 15) {
      const fileInfo = await ai.files.get({ name: uploadedFile.name! });
      if (fileInfo.state === 'ACTIVE') {
        isReady = true;
      } else if (fileInfo.state === 'FAILED') {
        throw new Error(`Gemini failed to process the file.`);
      } else {
        await wait(2000);
        attempts++;
      }
    }

    if (!isReady) {
      throw new Error("File processing timed out.");
    }

    console.log(`File is ACTIVE: ${uploadedFile.name}`);

    // Create or reuse a Vector Store (File Search Store)
    if (!vectorStoreId) {
      console.log("Creating new File Search Store (Vector Store)...");
      const store = await ai.fileSearchStores.create({
        config: {
          displayName: "Session Document Store",
        }
      });
      vectorStoreId = store.name!;
      console.log(`Vector Store created: ${vectorStoreId}`);
    }

    // Add the file to the Vector Store using importFile
    console.log(`Uploading and adding file to Vector Store ${vectorStoreId}...`);
    await ai.fileSearchStores.importFile({
      fileSearchStoreName: vectorStoreId,
      fileName: uploadedFile.name!,
    });
    console.log("File indexed into Vector Store!");

    // Clean up temp file
    await unlink(tempFilePath).catch(console.error);

    return NextResponse.json({
      success: true,
      vectorStoreId,
      file: {
        uri: uploadedFile.uri,
        name: uploadedFile.displayName,
        mimeType: uploadedFile.mimeType,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to sync file.";
    console.error("Critical error syncing file:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
