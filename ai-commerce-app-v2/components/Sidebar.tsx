'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, Image as ImageIcon, Loader2, Paperclip } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from '@/lib/vector-store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, image?: string, products?: Product[] }[]>([
    { role: 'assistant', content: 'Hi! I am your Blinkit Shopping Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return;

    const currentInput = input;
    const currentImage = pendingImage;
    
    const userMsg = { role: 'user' as const, content: currentInput || 'Image Search', image: currentImage || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          image: currentImage,
          history: messages.slice(-5)
        })
      });

      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.reply,
        products: data.products 
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-6 right-6 p-4 bg-[#0c831f] text-white rounded-full shadow-lg hover:scale-110 transition-transform z-40"
      >
        <MessageSquare size={24} />
      </button>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />

            {/* Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-50 flex flex-direction-column"
            >
              {/* Header */}
              <div className="p-6 border-bottom flex justify-between items-center bg-[#0c831f] text-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">B</div>
                  <h3 className="font-semibold">AI Shopping Concierge</h3>
                </div>
                <button onClick={toggleSidebar} className="hover:rotate-90 transition-transform">
                  <X size={24} />
                </button>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] space-y-3",
                      msg.role === 'user' ? "ml-auto" : "mr-auto"
                    )}
                  >
                    {msg.image && (
                      <img src={msg.image} className="w-full h-40 object-cover rounded-xl border mb-2" alt="Uploaded" />
                    )}
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-[#0c831f] text-white rounded-br-none" 
                        : "bg-white text-slate-800 border rounded-bl-none"
                    )}>
                      {msg.content}
                    </div>

                    {msg.products && msg.products.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {msg.products.map(p => (
                          <ProductCard key={p.id} product={p} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-white text-slate-800 shadow-sm border p-4 rounded-2xl rounded-bl-none w-fit">
                    <Loader2 className="animate-spin text-[#0c831f]" size={20} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 border-top bg-white">
                {pendingImage && (
                  <div className="mb-4 relative w-20 h-20 group">
                    <img src={pendingImage} className="w-full h-full object-cover rounded-lg border" />
                    <button 
                      onClick={() => setPendingImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-xl border focus-within:border-[#0c831f] transition-colors">
                  <label className="p-2 text-slate-400 hover:text-[#0c831f] cursor-pointer">
                    <ImageIcon size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 py-2"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-[#0c831f] text-white rounded-lg disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
