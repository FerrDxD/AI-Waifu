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
  const m = text.toLowerCase().match(/(?:besok|lusa)?\s*jam\s*(\d{1,2})(?::(\d{2}))?\s*(pagi|siang|sore|malam)?/);
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
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
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
      setError(language === 'en' ? 'Failed to load reminders.' : 'Gagal memuat pengingat.');
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
        body: JSON.stringify({ content: note, remindAt: when ? new Date(when).toISOString() : undefined }),
      });
      if (!res.ok) throw new Error();
      playSfx('chime');
      setText('');
      setTime('');
      await load();
    } catch {
      setError(language === 'en' ? 'Failed to save reminder.' : 'Gagal menyimpan pengingat.');
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
    <div className="bg-white/95 backdrop-blur-md border border-pink-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg md:text-xl text-[#5c4d47] flex items-center gap-2">
            <Bell className="text-pink-500" size={20} />
            {language === 'en' ? 'Reminders' : 'Pengingat'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {language === 'en'
              ? 'Also can be created via chat: "Livia, ingetin aku jam 7".'
              : 'Bisa juga dibuat lewat chat: "Livia, ingetin aku jam 7".'}
          </p>
        </div>
        <span className="text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100">
          {active.length} {language === 'en' ? 'ACTIVE' : 'AKTIF'}
        </span>
      </div>

      {/* Form tambah */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={language === 'en' ? 'Reminder text…' : 'Isi pengingat…'}
          className="flex-1 bg-white border border-pink-200 focus:border-pink-400 rounded-xl px-4 py-2.5 text-sm text-[#5c4d47] outline-none"
        />
        <div className="flex gap-2">
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            type="datetime-local"
            className="bg-white border border-pink-200 focus:border-pink-400 rounded-xl px-3 py-2.5 text-sm text-[#5c4d47] outline-none w-44"
          />
          <button
            onClick={add}
            disabled={saving || !text.trim()}
            className="bg-gradient-to-r from-[#ff758c] to-amber-500 hover:from-[#ff6078] hover:to-amber-600 text-white font-black text-sm px-4 py-2.5 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> {language === 'en' ? 'Add' : 'Tambah'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">{language === 'en' ? 'Loading…' : 'Memuat…'}</p>
      ) : active.length === 0 && done.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          {language === 'en' ? 'No reminders yet.' : 'Belum ada pengingat.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-pink-100 bg-pink-50/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#5c4d47] truncate">{r.content}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} /> {formatLocal(r.remindAt)}
                </p>
              </div>
              <button
                onClick={() => setStatus(r.id, 'done')}
                className="shrink-0 bg-white border border-pink-200 hover:border-pink-400 rounded-xl w-9 h-9 flex items-center justify-center text-pink-500 hover:bg-pink-50 transition-all cursor-pointer"
                title={language === 'en' ? 'Mark done' : 'Tandai selesai'}
              >
                <Check size={16} />
              </button>
            </li>
          ))}
          {done.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-200 bg-gray-50 opacity-70"
            >
              <p className="text-sm text-gray-400 line-through truncate">{r.content}</p>
              <button
                onClick={() => setStatus(r.id, 'active')}
                className="shrink-0 text-gray-400 hover:text-pink-500 text-xs font-bold cursor-pointer"
              >
                {language === 'en' ? 'Undo' : 'Urungkan'}
              </button>
            </li>
          ))}
        </ul>
      )}
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
      setError(language === 'en' ? 'Failed to load shopping list.' : 'Gagal memuat daftar belanja.');
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
      setError(language === 'en' ? 'Failed to save item.' : 'Gagal menyimpan barang.');
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
    <div className="bg-white/95 backdrop-blur-md border border-pink-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-lg md:text-xl text-[#5c4d47] flex items-center gap-2">
            <ShoppingCart className="text-pink-500" size={20} />
            {language === 'en' ? 'Shopping List' : 'Daftar Belanja'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {language === 'en'
              ? 'Also can be created via chat: "Livia, catat belanja telur & susu".'
              : 'Bisa juga dibuat lewat chat: "Livia, catat belanja telur & susu".'}
          </p>
        </div>
        <span className="text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100">
          {items.filter((i) => !i.checked).length} {language === 'en' ? 'LEFT' : 'TERSISA'}
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={language === 'en' ? 'Item name…' : 'Nama barang…'}
          className="flex-1 bg-white border border-pink-200 focus:border-pink-400 rounded-xl px-4 py-2.5 text-sm text-[#5c4d47] outline-none"
        />
        <button
          onClick={add}
          disabled={saving || !name.trim()}
          className="bg-gradient-to-r from-[#ff758c] to-amber-500 hover:from-[#ff6078] hover:to-amber-600 text-white font-black text-sm px-4 py-2.5 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> {language === 'en' ? 'Add' : 'Tambah'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">{language === 'en' ? 'Loading…' : 'Memuat…'}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          {language === 'en' ? 'No items yet.' : 'Belum ada barang.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-pink-100 bg-pink-50/40"
            >
              <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggle(item.id, !item.checked)}
                  className="w-4 h-4 accent-[#ff758c]"
                />
                <span className={`text-sm truncate ${item.checked ? 'line-through text-gray-400' : 'font-semibold text-[#5c4d47]'}`}>
                  {item.name}
                </span>
              </label>
              {item.checked && (
                <Trash2
                  size={14}
                  className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0"
                  onClick={() => toggle(item.id, false)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
