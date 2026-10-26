import type { LLMProvider, AIProviderName } from './types';
import { GeminiProvider } from './providers/gemini';
import { getAIConfig } from './config';

/**
 * Registry provider (M2.2).
 *
 * Satu-satunya pintu masuk ke mesin AI dari domain. Baris ini yang harus
 * berubah kalau nanti mau tambah OpenAI/Anthropic/Ollama — cukup daftarkan
 * adapter baru di `PROVIDERS` dan set `AI_PROVIDER` di env.
 */

const PROVIDERS: Record<AIProviderName, () => LLMProvider> = {
  gemini: () => new GeminiProvider(),
};

let cached: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (cached) return cached;
  cached = PROVIDERS[getAIConfig().provider]();
  return cached;
}

export function __resetProviderForTests(): void {
  cached = null;
}

export type { LLMProvider, GenerateOptions, GenerateResult, LlmTurn } from './types';
