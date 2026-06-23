'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Check, Trash2, CalendarHeart, PenTool } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const INITIAL_TASKS: Task[] = [
  { id: '1', text: 'Beli galon air (jangan lupa kembaliannya!)', completed: false },
  { id: '2', text: 'Nugas kelompok bareng si A', completed: false },
  { id: '3', text: 'Kerja part-time jam 4', completed: true },
  { id: '4', text: 'Temenin Livia ke minimarket', completed: false },
];

const LIVIA_REACTIONS = [
  "Wah, udah kelar? Tumben rajin.",
  "Bagus deh. Jangan lupa istirahat ya.",
  "Akhirnya beres juga... sini aku buatin teh.",
  "Hebat! Nanti aku kasih hadiah deh... eh, bohong deng.",
  "Rajin banget. Kayaknya lagi ada maunya nih?",
  "Udah selesai semua? Ya udah, ntar malam kita makan di luar."
];

export default function SchedulePage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTask, setNewTask] = useState('');
  const [liviaComment, setLiviaComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const isNowCompleted = !t.completed;
        if (isNowCompleted) {
          triggerLiviaReaction();
        }
        return { ...t, completed: isNowCompleted };
      }
      return t;
    }));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const t: Task = {
      id: Date.now().toString(),
      text: newTask,
      completed: false
    };
    setTasks([...tasks, t]);
    setNewTask('');
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const triggerLiviaReaction = () => {
    const randomComment = LIVIA_REACTIONS[Math.floor(Math.random() * LIVIA_REACTIONS.length)];
    setLiviaComment(randomComment);
    setShowComment(true);
    setTimeout(() => setShowComment(false), 4000);
  };

  const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col font-sans select-none overflow-hidden" 
      style={{ 
        backgroundColor: '#e6d0b3', // Corkboard base color
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")` 
      }}
    >
      
      {/* Top Header */}
      <div className="w-full p-6 md:p-10 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-6">
          <Link 
            href="/home" 
            className="bg-[#fffdfa] border border-[#c4a985] w-12 h-12 rounded-full flex items-center justify-center text-[#5c4d47] shadow-md hover:scale-105 hover:bg-orange-50 transition-all group shrink-0"
          >
            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-display font-black text-2xl md:text-4xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] tracking-tight flex items-center gap-2">
              Jadwal Kosan 📝
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-10 relative z-10 flex flex-col md:flex-row gap-8 mb-32 items-start justify-center">
        
        {/* Left Side: The Planner Notebook */}
        <div className="w-full md:w-[60%] relative">
          
          {/* Aesthetic Tape */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-10 bg-white/40 backdrop-blur-sm z-30 -rotate-2" style={{ clipPath: 'polygon(0% 10%, 100% 0%, 95% 90%, 5% 100%)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
          
          {/* The Paper */}
          <div className="bg-[#fffdfa] w-full rounded-md shadow-[10px_20px_40px_rgba(0,0,0,0.15)] relative min-h-[500px] flex flex-col rotate-1 overflow-hidden">
            
            {/* Red Margin Line */}
            <div className="absolute top-0 bottom-0 left-[3rem] w-[2px] bg-red-400/50" />
            
            {/* Blue Horizontal Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #3b82f6 40px)', marginTop: '60px' }} />

            {/* Paper Header */}
            <div className="h-[60px] border-b-2 border-red-400/30 w-full flex items-end px-4 pb-2 justify-between">
              <span className="font-serif italic font-bold text-gray-400 pl-12 text-xl">To-Do List Hari Ini</span>
              <span className="font-display font-black text-pink-400 text-2xl pr-4">{progress}%</span>
            </div>

            {/* Tasks Area */}
            <div className="flex-1 w-full relative z-10 pl-14 pr-6 py-2 flex flex-col">
              {tasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center opacity-40">
                  <p className="font-serif italic text-gray-400 text-xl rotate-[-2deg]">Duh, kosong nih... rebahan aja?</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between w-full h-[40px] group relative"
                  >
                    <label className="flex items-center gap-4 cursor-pointer flex-1 h-full relative z-10">
                      
                      {/* Messy Checkbox */}
                      <div className="relative flex items-center justify-center shrink-0 w-6 h-6">
                        <input 
                          type="checkbox" 
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-[#5c4d47] rounded-[4px] rotate-[-3deg] group-hover:scale-110 transition-transform flex items-center justify-center bg-transparent">
                          {/* Hand-drawn checkmark */}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 opacity-0 peer-checked:opacity-100 w-8 h-8 absolute -top-2 -right-1 pointer-events-none transition-all duration-200">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Task Text */}
                      <span className={`font-serif text-lg transition-all duration-300 w-[85%] ${
                        task.completed ? 'text-gray-400 line-through decoration-red-400 decoration-2 opacity-60' : 'text-[#3b2f2b]'
                      }`} style={{ transform: `rotate(${Math.random() * 2 - 1}deg)` }}>
                        {task.text}
                      </span>
                    </label>

                    {/* Delete scribble */}
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all relative z-10"
                      title="Hapus"
                    >
                      <Trash2 size={18} className="rotate-12" />
                    </button>
                  </div>
                ))
              )}

              {/* 100% Completion Stamp */}
              {progress === 100 && tasks.length > 0 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                  <div className="w-48 h-24 border-4 border-red-500/80 rounded-lg flex items-center justify-center -rotate-12 scale-150 opacity-0 animate-[stamp_0.3s_ease-out_forwards]">
                    <span className="font-black text-red-500/80 text-4xl tracking-widest uppercase">LUNAS!</span>
                  </div>
                </div>
              )}
            </div>
            
          </div>
          
          {/* Aesthetic Doodles / Items on board */}
          <div className="absolute -bottom-8 -left-8 text-4xl drop-shadow-md rotate-[-15deg] pointer-events-none">☕</div>
        </div>

        {/* Right Side: Sticky Note Input */}
        <div className="w-full md:w-[35%] relative mt-10 md:mt-0">
          
          <div className="bg-[#fef08a] w-full p-6 pb-10 rounded-sm shadow-[5px_5px_15px_rgba(0,0,0,0.1)] rotate-3 transform hover:rotate-2 transition-transform duration-300 relative border border-[#eab308]/20">
            {/* Sticky pin */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-400 shadow-md flex items-center justify-center">
              <div className="w-1 h-1 bg-white/50 rounded-full absolute top-1 left-1" />
            </div>

            <h3 className="font-serif italic font-bold text-gray-700 text-xl mb-4 border-b border-gray-700/20 pb-2">Tambah Jadwal:</h3>
            
            <form onSubmit={addTask} className="w-full flex flex-col gap-4">
              <textarea 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Nanti mau ngapain lagi?"
                className="w-full bg-transparent border-none text-[#5c4d47] font-serif text-lg placeholder-gray-500/50 focus:outline-none resize-none min-h-[100px]"
                rows={3}
              />
              <button 
                type="submit"
                className="self-end bg-transparent text-gray-700 hover:text-red-500 font-bold flex items-center gap-2 group transition-colors"
              >
                <span className="font-serif italic text-lg border-b border-transparent group-hover:border-red-500">Tulis!</span>
                <PenTool size={18} className="group-hover:animate-bounce" />
              </button>
            </form>
          </div>

          <div className="absolute bottom-[-60px] right-[-20px] text-5xl drop-shadow-lg rotate-[25deg] pointer-events-none">🪴</div>
        </div>

      </div>

      {/* Livia Reaction Dialogue */}
      <div className={`fixed bottom-0 right-4 md:right-12 z-[100] transition-all duration-500 flex items-end gap-2 ${showComment ? 'translate-y-0 opacity-100' : 'translate-y-48 opacity-0 pointer-events-none'}`}>
        
        {/* Chat Bubble */}
        <div className="bg-white px-6 py-4 rounded-3xl rounded-br-sm shadow-[0_10px_25px_rgba(0,0,0,0.15)] border-2 border-pink-100 mb-20 max-w-[250px] animate-[pulse_3s_infinite]">
          <p className="font-bold text-[#5c4d47] text-[15px] leading-snug">"{liviaComment}"</p>
        </div>
        
        {/* Livia Peeking Head */}
        <div className="w-32 h-40 bg-transparent relative overflow-hidden rounded-t-full">
           <img 
             src="/livia/home-screen/default/blushing.webp" 
             alt="Livia" 
             className="w-[200%] max-w-none h-auto absolute top-0 left-1/2 -translate-x-1/2 object-top"
           />
        </div>
      </div>

    </div>
  );
}
