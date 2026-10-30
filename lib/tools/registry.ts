/**
 * Registry tool Livia (M8.3).
 *
 * Mekanisme: Livia mengembalikan field opsional `tools: [{name, args}]` di
 * JSON balasannya. Server memvalidasi tiap panggilan terhadap skema zod di
 * sini, mengeksekusi (lihat `lib/tools/execute.ts`), lalu menambahkan baris
 * konfirmasi faktual ke reply. Satu putaran LLM — tanpa native function
 * calling / loop, tanpa menyentuh adapter provider.
 */
import { z } from 'zod';

export const TOOL_NAMES = [
  'create_reminder',
  'add_shopping_item',
  'list_shopping_items',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const TOOL_NAME_SET: ReadonlySet<string> = new Set(TOOL_NAMES);

export interface ToolDefinition {
  name: ToolName;
  /** Deskripsi singkat untuk dokumentasi/log. */
  description: string;
  argsSchema: z.ZodTypeAny;
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: 'create_reminder',
    description: 'Buat pengingat untuk user ("ingetin aku jam 7").',
    argsSchema: z.object({
      text: z.string().trim().min(1).max(200),
      time: z.string().trim().min(1).max(60),
    }),
  },
  {
    name: 'add_shopping_item',
    description: 'Tambahkan barang ke daftar belanja user.',
    argsSchema: z.object({
      item: z.string().trim().min(1).max(100),
    }),
  },
  {
    name: 'list_shopping_items',
    description: 'Ambil daftar belanja user saat ini.',
    argsSchema: z.object({}).strict(),
  },
];
