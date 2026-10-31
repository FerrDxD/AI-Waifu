'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Plus, ShoppingCart, Trash2, Clock } from 'lucide-react';
import { playSfx } from '@/lib/sfx';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Reminder {
  id: string;
  content: string;
  remindAt: string;
  status: 'active' | 'done' | 'cancelled';
}

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

/** Format waktu lokal untuk ditampilkan. */
function formatLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  return d.toLocaleString('id-ID', opts);
}

/** Mengubah "besok jam 7" / "jam 7" menjadi input datetime-local (kasar). */
function toDatetimeLocal(text: string): string {
  const now = new Date();
  const m = text
    .toLowerCase()
    .match(
      /(?:besok|lusa)?\s*jam\s*(\d{1,2})(?::(\d{2}))?\s*(pagi|siang|sore|malam)?/
    );
  if (!m) return '';

  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const q = m[3];
  if (q === 'siang' || q === 'sore' || q === 'malam') {
    if (hour < 12) hour += 12;
  } else if (hour === 12 && q === 'pagi') {
    hour = 0;
  }

  const target = new Date(now);
  if (text.toLowerCase().includes('besok')) target.setDate(target.getDate() + 1);
  if (text.toLowerCase().includes('lusa')) target.setDate(target.getDate() + 2);
  target.setHours(hour, minute, 0, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(
    target.getDate()
  )}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
}

export function ReminderPanel() {
  const { dict, language } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/reminders');
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { reminders: Reminder[] };
      setReminders(data.reminders);
    } catch {
      setError(
        language === 'en'
          ? 'Failed to load reminders.'
          : 'Gagal memuat pengingat.'
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const note = text.trim();
      const when = time || toDatetimeLocal(note);
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: note,
          remindAt: when ? new Date(when).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      playSfx('chime');
      setText('');
      setTime('');
      await load();
    } catch {
      setError(
        language === 'en'
          ? 'Failed to save reminder.'
          : 'Gagal menyimpan pengingat.'
      );
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: Reminder['status']) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      playSfx('pop');
      await load();
    } catch {
      /* diam */
    }
  };

  const active = reminders.filter((r) => r.status === 'active');
  const done = reminders.filter((r) => r.status === 'done');

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-pink-100/90 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(255,117,140,0.06)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-black text-lg md:text-xl text-[#5c4d47] flex items-center gap-2">
              <Bell className="text-pink-600" size={20} />
              <span>{language === 'en' ? 'Reminders' : 'Pengingat'}</span>
            </h3>
            <p className="text-xs text-[#7a7268] mt-1">
              {language === 'en'
                ? 'Also can be created via chat: "Livia, remind me at 7pm".'
                : 'Bisa juga dibuat lewat obrolan: "Livia, ingetin aku jam 7".'}
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-pink-700 bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
            {active.length} {language === 'en' ? 'ACTIVE' : 'AKTIF'}
          </span>
        </div>

        {/* Form Tambah */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={
              language === 'en' ? 'Reminder text…' : 'Catat pengingat baru…'
            }
            className="flex-1 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200/50 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-[#5c4d47] placeholder:text-[#a8a199] outline-none transition-all"
          />
          <div className="flex gap-2">
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              type="datetime-local"
              className="bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200/50 rounded-2xl px-3 py-2.5 text-xs text-[#5c4d47] outline-none w-44 font-mono transition-all"
            />
            <button
              onClick={add}
              disabled={saving || !text.trim()}
              className="bg-gradient-to-r from-[#ff758c] to-[#ff0844] hover:opacity-95 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Plus size={16} />{' '}
              <span>{language === 'en' ? 'Add' : 'Tambah'}</span>
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 mb-3 font-mono">{error}</p>}

        {loading ? (
          <p className="text-xs text-[#7a7268] font-mono">
            {language === 'en' ? 'Loading…' : 'Memuat pengingat…'}
          </p>
        ) : active.length === 0 && done.length === 0 ? (
          <p className="text-xs text-[#a8a199] italic py-2">
            {language === 'en' ? 'No reminders yet.' : 'Belum ada pengingat.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {active.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-pink-100 bg-pink-50/50"
              >
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-[#5c4d47] truncate">
                    {r.content}
                  </p>
                  <p className="text-[11px] text-[#7a7268] flex items-center gap-1 font-mono mt-0.5">
                    <Clock size={12} className="text-pink-500" />{' '}
                    <span>{formatLocal(r.remindAt)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setStatus(r.id, 'done')}
                  className="shrink-0 bg-white border border-pink-200 hover:border-pink-400 rounded-xl w-8 h-8 flex items-center justify-center text-pink-600 hover:bg-pink-50 transition-all cursor-pointer shadow-2xs"
                  title={language === 'en' ? 'Mark done' : 'Tandai selesai'}
                >
                  <Check size={15} />
                </button>
              </li>
            ))}
            {done.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-stone-200/80 bg-stone-50/80 opacity-70"
              >
                <p className="text-xs md:text-sm text-[#a8a199] line-through truncate">
                  {r.content}
                </p>
                <button
                  onClick={() => setStatus(r.id, 'active')}
                  className="shrink-0 text-[#7a7268] hover:text-pink-600 text-[11px] font-bold font-mono cursor-pointer"
                >
                  {language === 'en' ? 'Undo' : 'Urungkan'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ShoppingPanel() {
  const { language } = useLanguage();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/shopping');
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { items: ShoppingItem[] };
      setItems(data.items);
    } catch {
      setError(
        language === 'en'
          ? 'Failed to load shopping list.'
          : 'Gagal memuat daftar belanja.'
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      playSfx('chime');
      setName('');
      await load();
    } catch {
      setError(
        language === 'en'
          ? 'Failed to save item.'
          : 'Gagal menyimpan barang.'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, checked: boolean) => {
    try {
      const res = await fetch('/api/shopping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, checked }),
      });
      if (!res.ok) throw new Error();
      playSfx('pop');
      await load();
    } catch {
      /* diam */
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-pink-100/90 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(255,117,140,0.06)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-black text-lg md:text-xl text-[#5c4d47] flex items-center gap-2">
              <ShoppingCart className="text-pink-600" size={20} />
              <span>{language === 'en' ? 'Shopping List' : 'Daftar Belanja'}</span>
            </h3>
            <p className="text-xs text-[#7a7268] mt-1">
              {language === 'en'
                ? 'Also can be created via chat: "Livia, note groceries".'
                : 'Bisa juga dibuat lewat obrolan: "Livia, catat telur & susu".'}
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-pink-700 bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
            {items.filter((i) => !i.checked).length}{' '}
            {language === 'en' ? 'LEFT' : 'TERSISA'}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={
              language === 'en' ? 'Item name…' : 'Catat belanjaan baru…'
            }
            className="flex-1 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200/50 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-[#5c4d47] placeholder:text-[#a8a199] outline-none transition-all"
          />
          <button
            onClick={add}
            disabled={saving || !name.trim()}
            className="bg-gradient-to-r from-[#ff758c] to-[#ff0844] hover:opacity-95 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus size={16} />{' '}
            <span>{language === 'en' ? 'Add' : 'Tambah'}</span>
          </button>
        </div>

        {error && <p className="text-xs text-rose-500 mb-3 font-mono">{error}</p>}

        {loading ? (
          <p className="text-xs text-[#7a7268] font-mono">
            {language === 'en' ? 'Loading…' : 'Memuat daftar belanja…'}
          </p>
        ) : items.length === 0 ? (
          <p className="text-xs text-[#a8a199] italic py-2">
            {language === 'en' ? 'No items yet.' : 'Belum ada barang.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-pink-100 bg-pink-50/50"
              >
                <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggle(item.id, !item.checked)}
                    className="w-4 h-4 accent-pink-600 rounded-sm"
                  />
                  <span
                    className={`text-xs md:text-sm truncate ${
                      item.checked
                        ? 'line-through text-[#a8a199]'
                        : 'font-semibold text-[#5c4d47]'
                    }`}
                  >
                    {item.name}
                  </span>
                </label>
                {item.checked && (
                  <button
                    type="button"
                    onClick={() => toggle(item.id, false)}
                    className="text-stone-400 hover:text-rose-500 cursor-pointer shrink-0 p-1"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
