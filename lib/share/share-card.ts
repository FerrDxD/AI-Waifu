/**
 * M8.6 — Sharing & komunitas: ekspor momen chat sebagai card gambar.
 *
 * Pure logic (wrap text, layout) terpisah dari canvas/DOM supaya bisa
 * di-test tanpa browser. Fungsi render canvas ada di `renderShareCard`.
 */

export interface ShareCardData {
  /** Pesan user. */
  userText: string;
  /** Balasan Livia. */
  liviaText: string;
  /** Nama pengirim (default 'Kamu'). */
  userName?: string;
  /** Judul card (default 'Teman Kos'). */
  title?: string;
  /** URL branding bawah (default 'livia.qzz.io'). */
  brandUrl?: string;
}

export interface CardLayout {
  width: number;
  height: number;
  avatarDiameter: number;
  padding: number;
  bubbleMaxWidth: number;
}

export const DEFAULT_LAYOUT: CardLayout = {
  width: 1080,
  height: 1350,
  avatarDiameter: 160,
  padding: 72,
  bubbleMaxWidth: 936,
};

/** Warna tema (selaras dengan app). */
export const THEME = {
  bgTop: '#fff5f6',
  bgBottom: '#ffe3e3',
  accent: '#ff758c',
  accentDark: '#ff0844',
  text: '#5c4d47',
  muted: '#8c7a70',
  bubbleUserFrom: '#ff758c',
  bubbleUserTo: '#ff0844',
  bubbleLivia: '#ffffff',
  brand: '#ff758c',
} as const;

/**
 * Pecah teks menjadi baris sesuai lebar maksimum canvas.
 * Murni (tidak menyentuh DOM) — dipakai render & test.
 */
export function wrapTextLines(
  measure: (s: string) => number,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const out: string[] = [];
  for (const rawPara of paragraphs) {
    const para = rawPara.replace(/\s+/g, ' ').trim();
    if (!para) continue;
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (measure(test) <= maxWidth) {
        line = test;
      } else {
        if (line) out.push(line);
        // Kata tunggal lebih panjang dari maxWidth: paksa potong.
        if (measure(word) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (measure(chunk + ch) <= maxWidth) {
              chunk += ch;
            } else {
              if (chunk) out.push(chunk);
              chunk = ch;
            }
          }
          if (chunk) {
            line = chunk;
          } else {
            line = '';
          }
        } else {
          line = word;
        }
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** Hitung tinggi bubble berdasarkan jumlah baris. */
export function bubbleHeight(lineCount: number, lineHeight: number, vPad: number): number {
  return lineCount * lineHeight + vPad * 2;
}

/** Bangun URL share yang menyimpan momen (query params). */
export function buildShareUrl(origin: string, data: ShareCardData): string {
  const params = new URLSearchParams();
  params.set('u', data.userText);
  params.set('l', data.liviaText);
  if (data.userName) params.set('n', data.userName);
  return `${origin.replace(/\/$/, '')}/share?${params.toString()}`;
}

/** Parse query params → ShareCardData (null kalau tidak lengkap). */
export function parseShareParams(params: URLSearchParams): ShareCardData | null {
  const u = params.get('u');
  const l = params.get('l');
  if (!u || !l) return null;
  return {
    userText: u,
    liviaText: l,
    userName: params.get('n') ?? undefined,
  };
}

/** Nama file unduhan. */
export function shareFileName(data: ShareCardData): string {
  const slug = (data.liviaText || 'moment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `teman-kos-${slug || 'moment'}.png`;
}

/**
 * Render card ke canvas. Async karena memuat avatar.
 * Mengembalikan canvas yang sudah digambar (caller bisa toBlob/toDataURL).
 */
export async function renderShareCard(
  canvas: HTMLCanvasElement,
  data: ShareCardData,
  layout: CardLayout = DEFAULT_LAYOUT
): Promise<HTMLCanvasElement> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia');

  canvas.width = layout.width;
  canvas.height = layout.height;

  const { width, height, padding, bubbleMaxWidth } = layout;

  // --- Background gradient ---
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, THEME.bgTop);
  bg.addColorStop(1, THEME.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // --- Dekorasi: lingkaran blur lembut ---
  ctx.save();
  ctx.globalAlpha = 0.35;
  const c1 = ctx.createRadialGradient(width * 0.15, height * 0.1, 40, width * 0.15, height * 0.1, 260);
  c1.addColorStop(0, THEME.accent);
  c1.addColorStop(1, 'transparent');
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // --- Avatar Livia (lingkaran) ---
  const avatarCx = width / 2;
  const avatarCy = padding + layout.avatarDiameter / 2;
  const avatarR = layout.avatarDiameter / 2;

  // Ring
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = THEME.accent;
  ctx.stroke();

  // Gambar avatar (clip)
  let avatarLoaded = false;
  try {
    const img = await loadImage('/livia/chibi-livia.webp');
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, avatarCx - avatarR, avatarCy - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
    avatarLoaded = true;
  } catch {
    // Fallback: inisial
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = THEME.accent;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', avatarCx, avatarCy);
    ctx.restore();
  }
  void avatarLoaded;

  // --- Nama & subtitle ---
  let y = avatarCy + avatarR + 28;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = THEME.text;
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Livia Einhart', width / 2, y);
  y += 30;
  ctx.fillStyle = THEME.muted;
  ctx.font = '500 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Teman Kos', width / 2, y);
  y += 48;

  // --- Divider ---
  ctx.strokeStyle = 'rgba(255,117,140,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 40;

  // --- Bubble user (kanan, pink) ---
  const userLines = wrapTextLines(
    (s) => ctx.measureText(s).width,
    data.userText,
    bubbleMaxWidth - 48
  );
  const userLineH = 40;
  const userBubbleH = bubbleHeight(userLines.length, userLineH, 24);
  const userBubbleW = Math.min(
    bubbleMaxWidth,
    Math.max(220, ...userLines.map((l) => ctx.measureText(l).width)) + 48
  );
  const userBubbleX = width - padding - userBubbleW;
  const userBubbleY = y;

  drawRoundedRect(ctx, userBubbleX, userBubbleY, userBubbleW, userBubbleH, 24, THEME.bubbleUserFrom, THEME.bubbleUserTo);
  ctx.fillStyle = '#ffffff';
  ctx.font = '500 30px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  userLines.forEach((line, i) => {
    ctx.fillText(line, userBubbleX + 24, userBubbleY + 24 + i * userLineH);
  });

  y += userBubbleH + 28;

  // --- Bubble Livia (kiri, putih) ---
  const liviaLines = wrapTextLines(
    (s) => ctx.measureText(s).width,
    data.liviaText,
    bubbleMaxWidth - 48
  );
  const liviaLineH = 40;
  const liviaBubbleH = bubbleHeight(liviaLines.length, liviaLineH, 24);
  const liviaBubbleW = Math.min(
    bubbleMaxWidth,
    Math.max(220, ...liviaLines.map((l) => ctx.measureText(l).width)) + 48
  );
  const liviaBubbleX = padding;
  const liviaBubbleY = y;

  drawRoundedRect(ctx, liviaBubbleX, liviaBubbleY, liviaBubbleW, liviaBubbleH, 24, THEME.bubbleLivia, THEME.bubbleLivia, true);
  ctx.fillStyle = THEME.text;
  ctx.font = '500 30px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  liviaLines.forEach((line, i) => {
    ctx.fillText(line, liviaBubbleX + 24, liviaBubbleY + 24 + i * liviaLineH);
  });

  y += liviaBubbleH + 48;

  // --- Footer branding ---
  const footerY = height - padding;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = THEME.brand;
  ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Teman Kos', width / 2, footerY - 8);
  ctx.fillStyle = THEME.muted;
  ctx.font = '400 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(data.brandUrl ?? 'livia.qzz.io', width / 2, footerY + 16);

  // Tanda tangan kecil
  ctx.fillStyle = 'rgba(92,77,71,0.5)';
  ctx.font = '400 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Momen bersama Livia 💕', width / 2, footerY - 40);

  return canvas;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillFrom: string,
  fillTo: string,
  outline = false
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillFrom === fillTo) {
    ctx.fillStyle = fillFrom;
    ctx.fill();
  } else {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, fillFrom);
    grad.addColorStop(1, fillTo);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  if (outline) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,117,140,0.18)';
    ctx.stroke();
  }
}

/** Muat gambar dari URL (same-origin). */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

/** Konversi canvas → Blob PNG. */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal membuat blob dari canvas'));
    }, 'image/png');
  });
}

/** Unduh blob sebagai file. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Bagikan card via Web Share API (file). Fallback: unduh + salin link.
 * @returns 'shared' | 'downloaded' | 'copied' | 'failed'
 */
export async function shareCard(
  blob: Blob,
  filename: string,
  shareUrl: string
): Promise<'shared' | 'downloaded' | 'copied' | 'failed'> {
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const canShareFiles =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: 'Teman Kos — Momen bersama Livia',
          text: 'Momen chatku dengan Livia 💕',
        });
        return 'shared';
      }
    }
  } catch (err) {
    // AbortError = user cancel, anggap gagal ringan.
    if ((err as Error)?.name === 'AbortError') return 'failed';
  }

  // Fallback 1: unduh gambar.
  try {
    downloadBlob(blob, filename);
    // Fallback 2: salin link (best-effort).
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        return 'copied';
      } catch {
        /* ignore */
      }
    }
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
