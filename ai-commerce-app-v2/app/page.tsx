import Sidebar from '@/components/Sidebar';
import { Search } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans selection:bg-[#0c831f] selection:text-white">
      {/* Header */}
      <header className="h-20 border-b flex items-center px-8 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <img 
          src="https://webcdn.grofers.com/assets/blinkit-logo-d85c345.svg" 
          alt="Blinkit" 
          className="h-8"
        />
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto pt-32 px-6 text-center">
        <h1 className="text-5xl font-bold text-slate-900 mb-6 tracking-tight">
          Groceries delivered in <span className="text-[#0c831f]">minutes</span>
        </h1>
        <p className="text-xl text-slate-500 mb-12">
          Experience the future of shopping with our new AI Shopping Concierge.
        </p>

        {/* Central Search Bar */}
        <div className="relative max-w-2xl mx-auto group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0c831f] transition-colors">
            <Search size={24} />
          </div>
          <input 
            type="text" 
            placeholder="Search 'spicy chips' or 'healthy dinner ideas'..."
            className="w-full py-5 pl-14 pr-6 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-[#0c831f] focus:bg-white transition-all text-lg text-slate-800 shadow-sm"
          />
          <div className="absolute top-1/2 -translate-y-1/2 right-4 px-3 py-1 bg-[#0c831f]/10 text-[#0c831f] text-xs font-bold rounded-lg uppercase tracking-wider">
            Powered by AI
          </div>
        </div>

        {/* Example Chips */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {['🌶️ Spicy Food', '🥗 Healthy Snacks', '🥛 Late Night Dairy', '🍫 Sweets'].map((tag) => (
            <button 
              key={tag}
              className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-sm hover:border-[#0c831f] hover:text-[#0c831f] hover:bg-[#0c831f]/5 transition-all"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Sidebar Integration */}
      <Sidebar />
    </main>
  );
}
