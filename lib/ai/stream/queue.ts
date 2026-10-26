/**
 * Antrean delta untuk streaming (M2.1).
 *
 * Provider memproduksi potongan teks dari goroutine pemalu SDK (callback
 * chunk), sementara route mengonsumsinya lewat `for await`. Antrean async
 *-ini yang menyatukan keduanya:
 *
 *  - konsumen lebih dulu → menunggu di `next()` sampai produksi datang,
 *  - produksi lebih dulu → tertampung di buffer,
 *  - `close()` → iterasi selesai yang bersih,
 *  - `fail()` → iterasi selesai (konsumen diarahkan ke `final`, bukan override
 *    di aliran delta).
 */

export interface DeltaQueue extends AsyncIterableIterator<string> {
  push(delta: string): void;
  close(): void;
  fail(): void;
}

export function createDeltaQueue(): DeltaQueue {
  const buffer: string[] = [];
  let closed = false;
  const waiters: Array<(result: IteratorResult<string>) => void> = [];

  const flush = () => {
    while (buffer.length > 0 && waiters.length > 0) {
      const waiter = waiters.shift()!;
      waiter({ done: false, value: buffer.shift()! });
    }
    while (closed && buffer.length === 0 && waiters.length > 0) {
      const waiter = waiters.shift()!;
      waiter({ done: true, value: undefined as never });
    }
  };

  return {
    push(delta: string): void {
      if (closed || !delta) return;
      buffer.push(delta);
      flush();
    },
    close(): void {
      closed = true;
      flush();
    },
    fail(): void {
      closed = true;
      flush();
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    next(): Promise<IteratorResult<string>> {
      if (buffer.length > 0) {
        return Promise.resolve({ done: false, value: buffer.shift()! });
      }
      if (closed) {
        return Promise.resolve({ done: true, value: undefined as never });
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
  };
}
