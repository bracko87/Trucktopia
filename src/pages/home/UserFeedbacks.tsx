
/**
 * UserFeedbacks.tsx
 *
 * Testimonials section for the landing page.
 * Features:
 * - Horizontal carousel for reviews.
 * - High-end popup modal for leaving feedback.
 * - Silent submission using Formspree.io (no mail client needed).
 */

import React, { useState, useRef } from 'react';
import { Star, Globe, MessageSquare, ChevronLeft, ChevronRight, Send, X, CheckCircle2, Loader2 } from 'lucide-react';

// IMPORTANT: Replace 'xbjnkyoz' with your actual Formspree ID from your Formspree dashboard
const FORMSPREE_ID = 'mdanddjn'; 

interface Testimonial {
  name: string;
  country: string;
  date: string;
  rating: number;
  feedback: string;
}

const FEEDBACK_DATA: Testimonial[] = [
  { name: 'Mark L.', country: 'Germany', date: '08.11.2025', rating: 5, feedback: 'Trucktopia is honestly one of the best browser-based truck simulators I’ve played so far. The multiplayer aspect makes deliveries feel alive, and the economy system is very engaging.' },
  { name: 'Diego', country: 'Spain', date: '14.11.2025', rating: 4, feedback: 'Really fun and relaxing game. The truck customization is solid already. Looking forward to future updates!' },
  { name: 'Vhalu Point', country: 'Sweden', date: '21.11.2025', rating: 5, feedback: 'Trucktopia surprised me in a very positive way. For a browser game, the depth is impressive.' },
  { name: 'Lucas', country: 'Brazil', date: '26.11.2025', rating: 4, feedback: 'Great multiplayer truck sim with a strong community. The UI is clean and easy to understand.' },
  { name: 'Tom', country: 'United Kingdom', date: '02.12.2025', rating: 5, feedback: 'Trucktopia game is already top-tier.' },
  { name: 'Sofia', country: 'Italy', date: '05.01.2026', rating: 5, feedback: 'Beautifully designed and very engaging. The community feels friendly.' }
];

const UserFeedbacks: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  /**
   * scroll
   * @description Handles horizontal scrolling
   */
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  /**
   * handleFormSubmit
   * @description Sends feedback "silently" via fetch to Formspree.
   */
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send');
      }
    } catch (error) {
      console.error('Failed to send feedback', error);
      alert('Error: Could not send feedback. Please check your connection or try again later.');
    } finally {
      setIsSending(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Reset states after animation
    setTimeout(() => {
      setIsSubmitted(false);
      setIsSending(false);
    }, 300);
  };

  return (
    <section className="mb-10 px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">User Feedbacks</h2>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="p-2 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
      >
        {FEEDBACK_DATA.map((item, idx) => (
          <article 
            key={idx}
            className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start bg-slate-800/60 border border-slate-700 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < item.rating ? 'fill-current' : 'text-slate-600'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 font-medium bg-slate-900/50 px-2 py-0.5 rounded">{item.date}</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-4 italic">"{item.feedback}"</p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm">{item.name}</span>
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {item.country}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
        >
          <MessageSquare className="w-5 h-5" />
          Leave Feedback
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={isSending ? undefined : closeModal} />
          
          <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            {!isSending && (
              <button onClick={closeModal} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all z-10">
                <X className="w-5 h-5" />
              </button>
            )}

            {!isSubmitted ? (
              <div className="p-8">
                <h3 className="text-2xl font-bold text-white mb-2">Share Your Experience</h3>
                <p className="text-slate-400 text-sm mb-6">Your feedback helps us make Trucktopia better for everyone.</p>
                
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                      <input name="name" required disabled={isSending} placeholder="John Doe" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Country</label>
                      <input name="country" required disabled={isSending} placeholder="Germany" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rating</label>
                    <select name="rating" required disabled={isSending} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50">
                      <option value="5">⭐⭐⭐⭐⭐ 5 Stars - Perfect</option>
                      <option value="4">⭐⭐⭐⭐☆ 4 Stars - Very Good</option>
                      <option value="3">⭐⭐⭐☆☆ 3 Stars - Good</option>
                      <option value="2">⭐⭐☆☆☆ 2 Stars - Fair</option>
                      <option value="1">⭐☆☆☆☆ 1 Star - Poor</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Message</label>
                    <textarea name="feedback" required disabled={isSending} rows={4} placeholder="What do you think about the game?" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none placeholder:text-slate-600 disabled:opacity-50" />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isSending}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Feedback
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-12 text-center animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Feedback Sent!</h3>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Thank you for your review.<br />
                  Your message has been delivered to our team.
                </p>
                <button 
                  onClick={closeModal}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-3 rounded-xl transition-all"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default UserFeedbacks;
