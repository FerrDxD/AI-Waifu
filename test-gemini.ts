import { generateLiviaResponse } from './lib/gemini';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function test() {
  try {
    console.log("Testing Livia API...");
    const result = await generateLiviaResponse(
      "Halo Livia", 
      [], 
      "Kamu tsundere", 
      50, 
      []
    );
    console.log("SUCCESS:", result);
  } catch(e) {
    console.error("ERROR CAUGHT IN SCRIPT:", e);
  }
}

test();
