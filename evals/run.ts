/**
 * Runner eval M2.7.
 *
 * Pemakaian:
 *   bun run evals            → OFFLINE: cek level-prompt + integritas dataset,
 *                              tanpa API, tanpa biaya. Cocok untuk CI.
 *   bun run evals:live       → LIVE: tiap skenario dikirim ke provider (model
 *                              chat produksi), balasan dinilai penuh.
 *   --category=memory        → hanya satu kategori.
 *   --id=memory.nickname     → hanya satu skenario.
 *
 * Lulus (DoD): semua cek hard lulus (100%). Untuk mode live, hit-rate
 * skenario yang lulus cek persona (soft) juga diukur — target >= 85%.
 * Hasil live ditulis ke evals/last-report.json.
 */
import fs from 'fs';
import path from 'path';

// Bun hanya memuat `.env`; Next yang memuat `.env.local`. Eval ini berjalan
// di atas bun, jadi ikuti pembacaan .env.local agar key server ikut.
import dotenv from 'dotenv';
for (const file of ['.env.local', '.env']) {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

import { DATASET, CATEGORIES, type ScenarioSpec } from './dataset';
import { CHECKS, isReplyCheck, type EvalArtifact } from './checks';
import { buildChatPrompt } from '@/lib/gemini';
import { liviaReplyResponseSchema, liviaReplyValidator } from '@/lib/ai/schemas';
import { getProvider } from '@/lib/ai';
import type { LLMProvider } from '@/lib/ai/types';

interface ScenarioResult {
  id: string;
  category: string;
  /** Semua cek hard lulus. */
  passed: boolean;
  /** Semua cek soft (persona) lulus. */
  softPassed: boolean;
  failures: string[];
  softFailures: string[];
  blocked: boolean;
  /** Punya isi kalau diblok/error — untuk diagnosis (bukan nilai asertif). */
  note?: string;
  latencyMs: number;
}

const args = process.argv.slice(2);
const live = args.includes('--live') || args.includes('--live=true');
const categoryArg = args.find((a) => a.startsWith('--category='))?.slice(11);
const idArg = args.find((a) => a.startsWith('--id='))?.slice(5);

const SOFT_PASS_RATE = 0.85;

function filterDataset(): ScenarioSpec[] {
  return DATASET.filter(
    (s) => (!categoryArg || s.category === categoryArg) && (!idArg || s.id === idArg)
  );
}

function buildArtifact(spec: ScenarioSpec): EvalArtifact {
  const systemPrompt = buildChatPrompt({
    affectionLevel: spec.affection,
    itemsBrought: spec.itemsBrought ?? [],
    stats: spec.stats,
    isVoiceCall: spec.isVoiceCall,
    longTermMemory: spec.longTermMemory,
    language: spec.language,
    highestChapter: spec.highestChapter ?? 0,
    earlierSummary: spec.earlierSummary,
  });

  return { scenario: spec, systemPrompt };
}

/** Nilai semua cek; cek reply tanpa output model dihitung gagal. */
function gradeChecks(artifact: EvalArtifact): {
  hardFailures: string[];
  softFailures: string[];
  evaluated: number;
} {
  const hardFailures: string[] = [];
  const softFailures: string[] = [];
  let evaluated = 0;

  for (const name of artifact.scenario.checks) {
    const check = CHECKS[name];
    if (!check) continue; // nama tak dikenal ditangkap oleh test integritas

    let ok: boolean;
    if (isReplyCheck(name) && !artifact.out) {
      if (artifact.noOutput) {
        ok = false; // ada panggilan tapi gagal/blok → cek reply jatuh
      } else {
        continue; // mode offline: hanya cek prompt yang dinilai
      }
    } else {
      try {
        ok = check.fn(artifact);
      } catch (error) {
        console.warn(
          `  cek ${name} lempar:`,
          error instanceof Error ? error.message : error
        );
        ok = false;
      }
    }

    evaluated += 1;
    if (check.kind === 'hard') {
      if (!ok) hardFailures.push(name);
    } else if (!ok) {
      softFailures.push(name);
    }
  }

  return { hardFailures, softFailures, evaluated };
}

async function callModel(provider: LLMProvider, artifact: EvalArtifact): Promise<void> {
  const spec = artifact.scenario;
  const turns = [
    ...(spec.history ?? []).map((m) => ({
      role: m.role === 'livia' ? ('model' as const) : ('user' as const),
      text: m.content,
    })),
    { role: 'user' as const, text: spec.message },
  ];

  // Key khusus eval (menimpa key server) — berguna saat kuota key utama
  // habis: AI_EVAL_API_KEY=... bun run evals:live
  const apiKey = process.env.AI_EVAL_API_KEY || undefined;

  const t0 = Date.now();
  try {
    const result = await provider.generate({
      operation: 'eval.chat',
      systemInstruction: artifact.systemPrompt,
      turns,
      responseSchema: liviaReplyResponseSchema,
      outputSchema: liviaReplyValidator,
      temperature: 0.8,
      maxOutputTokens: 1024,
      apiKey,
    });

    if (result.blocked || !result.data) {
      artifact.noOutput = `blocked: ${result.blockReason ?? 'tanpa alasan'}`;
    } else {
      artifact.out = {
        reply: result.data.reply,
        affectionDelta: result.data.affectionDelta,
        expression: result.data.expression,
        memoryUpdate: result.data.memoryUpdate ?? '',
      };
    }
  } catch (error) {
    artifact.noOutput = `error: ${error instanceof Error ? error.message : String(error)}`;
  }
  artifact.latencyMs = Date.now() - t0;
}

async function runScenario(provider: LLMProvider, spec: ScenarioSpec): Promise<ScenarioResult> {
  const artifact = buildArtifact(spec);
  if (live) await callModel(provider, artifact);

  const grade = gradeChecks(artifact);

  return {
    id: spec.id,
    category: spec.category,
    passed: grade.hardFailures.length === 0,
    softPassed: grade.softFailures.length === 0,
    failures: grade.hardFailures,
    softFailures: grade.softFailures,
    blocked: !!artifact.noOutput,
    note: artifact.noOutput,
    latencyMs: artifact.latencyMs ?? 0,
  };
}

function printSummary(results: ScenarioResult[]): boolean {
  console.log('\nRingkasan:');
  for (const cat of CATEGORIES) {
    const arr = results.filter((r) => r.category === cat);
    if (arr.length === 0) continue;

    const hardOk = arr.filter((r) => r.passed).length;
    const softOk = arr.filter((r) => r.passed && r.softPassed).length;
    const softEligible = arr.filter((r) => r.passed).length;
    const softRate = softEligible > 0 ? softOk / softEligible : 1;
    const flag = softRate >= SOFT_PASS_RATE ? '' : '   <-- soft di bawah 85%';

    console.log(
      `  ${cat.padEnd(10)} hard ${hardOk}/${arr.length}  ` +
        `soft ${softOk}/${softEligible} (${(softRate * 100).toFixed(0)}%)${flag}`
    );
  }

  const hardOk = results.filter((r) => r.passed).length;
  const blocked = results.filter((r) => r.blocked).length;
  const avgLatency = results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length;
  console.log(
    `\nHARD ${hardOk}/${results.length}, BLOCKED ${blocked}, latensi rata-rata ${Math.round(
      avgLatency
    )}ms`
  );

  for (const r of results) {
    if (!r.passed) {
      console.log(`  GAGAL ${r.id}: ${r.failures.join(', ')}`);
    }
  }

  const softEligible = results.filter((r) => r.passed).length;
  const softOk = results.filter((r) => r.passed && r.softPassed).length;
  const softRateAll = softEligible > 0 ? softOk / softEligible : 1;

  return hardOk === results.length && softRateAll >= SOFT_PASS_RATE;
}

async function main() {
  const specs = filterDataset();
  if (specs.length === 0) {
    console.error('Tidak ada skenario yang cocok dengan filter.');
    process.exit(2);
  }

  console.log(`\n[EVAL M2.7] mode=${live ? 'LIVE' : 'OFFLINE'} jumlah=${specs.length}\n`);

  let provider: LLMProvider | null = null;
  if (live) {
    try {
      provider = getProvider();
    } catch (error) {
      console.error(
        'Provider gagal dibuat. Cek API key server di .env.local.',
        error instanceof Error ? error.message : error
      );
      process.exit(2);
    }
  }

  const results: ScenarioResult[] = [];
  const delayMs = Number(process.env.AI_EVAL_DELAY_MS ?? 7_000);

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const r = await runScenario(provider!, spec);
    results.push(r);

    const hardFlag = r.passed ? 'PASS' : 'FAIL';
    const blockedNote = r.blocked ? ` [BLOCKED] ${r.note ?? ''}` : '';
    const softNote =
      r.passed && r.softFailures.length > 0 ? `  ~ soft: ${r.softFailures.join(', ')}` : '';
    console.log(`${hardFlag}  ${r.id}${blockedNote}${softNote}`);

    // Pacing: free-tier API membatasi request per menit; 50 call beruntun
    // langsung 429. Jeda default 7s (±8 call/menit, termasuk retry).
    if (i < specs.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const allPass = printSummary(results);

  if (live) {
    try {
      fs.writeFileSync(
        path.resolve('evals/last-report.json'),
        JSON.stringify({ mode: 'live', date: new Date().toISOString(), results }, null, 2)
      );
      console.log('Report: evals/last-report.json');
    } catch (e) {
      console.warn('report gagal ditulis:', e);
    }
  }

  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
