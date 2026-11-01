/**
 * Teman Kos — contoh SDK klien minimal (tanpa dependency).
 *
 * Penggunaan:
 *   import { TemanKosClient } from './teman-kos-client.mjs';
 *   const client = new TemanKosClient({ baseUrl: 'https://livia.qzz.io', sessionCookie: '...' });
 *   const reply = await client.chat('Halo Livia!');
 *   const audio = await client.tts('Halo juga!');
 *
 * Catatan: endpoint memerlukan sesi NextAuth. Ambil cookie `next-auth.session-token`
 * setelah login manual, lalu kirim via header Cookie (Node) atau credentials:'include'
 * (browser).
 */
export class TemanKosClient {
  constructor({ baseUrl = 'https://livia.qzz.io', sessionCookie = '' } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.sessionCookie = sessionCookie;
  }

  _headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (this.sessionCookie) h.Cookie = this.sessionCookie;
    return h;
  }

  async chat(message, { isVoiceCall = false } = {}) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ message, isVoiceCall }),
    });
    if (!res.ok) throw new Error(`chat failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /**
   * Streaming chat (SSE). Callback `onDelta(text)` dipanggil per potongan;
   * mengembalikan balasan final saat event `done`.
   */
  async chatStream(message, { onDelta, isVoiceCall = false } = {}) {
    const res = await fetch(`${this.baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ message, isVoiceCall }),
    });
    if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let final = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        if (!chunk.startsWith('data: ')) continue;
        let ev;
        try { ev = JSON.parse(chunk.slice(6)); } catch { continue; }
        if (ev.type === 'delta' && typeof ev.text === 'string') onDelta?.(ev.text);
        else if (ev.type === 'done') final = ev;
        else if (ev.type === 'error') throw new Error(ev.message || ev.code);
      }
    }
    if (buffer.trim().startsWith('data: ')) {
      try {
        const ev = JSON.parse(buffer.trim().slice(6));
        if (ev.type === 'done') final = ev;
      } catch { /* ignore */ }
    }
    return final;
  }

  async tts(text) {
    const res = await fetch(`${this.baseUrl}/api/tts`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`tts failed: ${res.status} ${await res.text()}`);
    return res.arrayBuffer();
  }

  async health() {
    const res = await fetch(`${this.baseUrl}/api/health`);
    return res.json();
  }

  async listReminders() {
    const res = await fetch(`${this.baseUrl}/api/reminders`, { headers: this._headers() });
    if (!res.ok) throw new Error(`reminders failed: ${res.status}`);
    return res.json();
  }

  async createReminder(content, remindAt) {
    const res = await fetch(`${this.baseUrl}/api/reminders`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ content, remindAt }),
    });
    if (!res.ok) throw new Error(`create reminder failed: ${res.status}`);
    return res.json();
  }
}

// Contoh pemakaian (Node 18+):
// const c = new TemanKosClient({ baseUrl: 'http://localhost:3000', sessionCookie: process.env.SESSION_COOKIE });
// console.log(await c.chat('Halo Livia!'));
// await c.chatStream('Ceritain dong', { onDelta: (t) => process.stdout.write(t) });
