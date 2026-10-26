import { vi } from 'vitest';

/**
 * Mock `@google/generative-ai` yang dipakai BERSAMA oleh test provider
 * (tests/ai-provider.test.ts) dan test streaming (tests/ai-stream.test.ts).
 *
 * Kenapa satu helper, bukan mock terpisah: vitest dijalankan dengan
 * `isolate: false` (keputusan M0 karena lambat di Windows), jadi registry
 * modul dibagikan antar file. Mock pertama yang terdaftar menang, dan file
 * kedua mendapat bentuk mock yang tidak lengkap — kegagalan yang bergantung
 * pada URUTAN file, bukan pada kode. Dengan satu factory, urutan tidak lagi
 * berpengaruh.
 *
 * Bentuknya: `getGenerativeModel()` mengembalikan model yang menyediakan
 * KEDUA metode (`generateContent` untuk test non-streaming, dan
 * `generateContentStream` untuk test streaming). Test yang tidak memakai
 * salah satunya hanya tidak menghasilkan panggilan — aman.
 */

export const mockGenerateContent = vi.fn();
export const mockGenerateContentStream = vi.fn();

export function sdkModuleMock() {
  class GoogleGenerativeAI {
    constructor(public readonly apiKey: string) {}
    getGenerativeModel(config: unknown) {
      return {
        // Bentuk SDK asli: argumen kedua adalah opsi level-request
        // (SingleRequestOptions: { timeout }) — istimewa dari body.
        generateContent: (request: unknown, requestOptions?: unknown) =>
          mockGenerateContent(config, request, requestOptions),
        generateContentStream: (request: unknown, requestOptions?: unknown) =>
          mockGenerateContentStream(config, request, requestOptions),
      };
    }
  }

  return {
    GoogleGenerativeAI,
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
      BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
    },
    SchemaType: {
      OBJECT: 'object',
      STRING: 'string',
      INTEGER: 'integer',
      ARRAY: 'array',
      NUMBER: 'number',
      BOOLEAN: 'boolean',
    },
  };
}
