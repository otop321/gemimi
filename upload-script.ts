import { GoogleGenAI } from "@google/genai";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Initialize Gemini SDK with your API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Delay helper
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Detect MIME type from extension
function getMimeType(filename: string): string {
  if (filename.endsWith('.csv')) return 'text/csv';
  if (filename.endsWith('.pdf')) return 'application/pdf';
  if (filename.endsWith('.txt')) return 'text/plain';
  if (filename.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

async function main() {
  const dataDir = "./data"; // Folder containing your CSV files
  let files: string[] = [];
  
  try {
    files = readdirSync(dataDir).filter(f =>
      f.endsWith('.csv') || f.endsWith('.pdf') || f.endsWith('.txt') || f.endsWith('.md')
    );
    if (files.length === 0) {
      console.log(`No CSV/PDF/TXT files found in ${dataDir}. Please put your files there.`);
      return;
    }
    console.log(`Found ${files.length} files to upload.`);
  } catch {
    console.error(`Please create a "data" folder in your project root and place your CSV files inside it.`);
    return;
  }

  // 1. Create the Vector Store
  console.log("Creating new File Search Store (Vector Store)...");
  const store = await ai.fileSearchStores.create({
    config: {
      displayName: "Bulk Import Session Document Store",
    }
  });
  const vectorStoreId = store.name!;
  console.log(`\n========================================`);
  console.log(`✅ Vector Store created successfully!`);
  console.log(`Vector Store ID: ${vectorStoreId}`);
  console.log(`========================================\n`);

  let successCount = 0;
  let failCount = 0;

  // 2. Upload and attach files
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = join(dataDir, filename);
    console.log(`[${i+1}/${files.length}] Uploading ${filename}...`);
    
    try {
      // Read file as a Buffer and wrap in a Blob to avoid Unicode path issues
      const buffer = readFileSync(filePath);
      const mimeType = getMimeType(filename);
      const blob = new Blob([buffer], { type: mimeType });

      // Step A: Upload to general Gemini file storage as a Blob
      const uploadedFile = await ai.files.upload({
        file: blob,
        config: { 
          displayName: filename,
          mimeType: mimeType,
        },
      });
      console.log(`   -> Uploaded as ${uploadedFile.name}. Waiting for ACTIVE state...`);
      
      // Step B: Poll until file is ACTIVE
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 20) {
        const fileInfo = await ai.files.get({ name: uploadedFile.name! });
        if (fileInfo.state === 'ACTIVE') {
          isReady = true;
        } else if (fileInfo.state === 'FAILED') {
          throw new Error(`File processing failed on Gemini's end.`);
        } else {
          await delay(3000);
          attempts++;
        }
      }

      if (!isReady) {
        throw new Error("File processing timed out after 60s.");
      }

      console.log(`   -> File is ACTIVE! Importing to Vector Store...`);

      // Step C: Attach to Vector Store
      await ai.fileSearchStores.importFile({
        fileSearchStoreName: vectorStoreId,
        fileName: uploadedFile.name!,
      });
      console.log(`   -> ✅ Success\n`);
      successCount++;
      
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`   -> ❌ Failed: ${msg}\n`);
      failCount++;
    }
  }

  console.log(`\n🎉 Upload complete!`);
  console.log(`   ✅ Success: ${successCount}/${files.length}`);
  console.log(`   ❌ Failed: ${failCount}/${files.length}`);
  console.log(`\n📋 Vector Store ID: ${vectorStoreId}`);
  console.log(`   Use this ID in your chatbot to query all uploaded documents.\n`);
}

main().catch(console.error);
