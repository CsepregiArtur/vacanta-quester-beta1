import React, { useState } from "react";
import { Lightbulb, Award, Send, RefreshCw, Sparkles, Bot } from "lucide-react";
import { AppState, Child } from "../../types";

interface HomeAssistantWidgetProps {
  child: Child;
  state: AppState;
  sugType: "activity" | "reward" | "other";
  setSugType: (val: "activity" | "reward" | "other") => void;
  sugTitle: string;
  setSugTitle: (val: string) => void;
  sugPoints: number | "";
  setSugPoints: (val: number | "") => void;
  sugDuration: number | "";
  setSugDuration: (val: number | "") => void;
  sugDescription: string;
  setSugDescription: (val: string) => void;
  sugMessage: { text: string; type: "success" | "error" } | null;
  isSubmittingSug: boolean;
  handleSubmitSuggestion: (e: React.FormEvent) => void;
}

const COMPANION_QUOTES = [
  "„Fiecare pagină citită îți aduce super-puteri noi! 📖✨”",
  "„Câinele tău te consideră cel mai bun prieten când ai grijă de el! 🐾❤️”",
  "„Fă-te mândru de munca ta! O cameră curată înseamnă o minte de geniu! 🌟🧠”",
  "„Strânge puncte pentru a debloca recompensele magice Xbox sau TV! 🎮📺”",
  "„Continuă streak-ul tău de aur pentru bonusuri speciale! Ești o legendă! 🔥💎”"
];

export default function HomeAssistantWidget({
  child,
  state,
  sugType,
  setSugType,
  sugTitle,
  setSugTitle,
  sugPoints,
  setSugPoints,
  sugDuration,
  setSugDuration,
  sugDescription,
  setSugDescription,
  sugMessage,
  isSubmittingSug,
  handleSubmitSuggestion
}: HomeAssistantWidgetProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const rotateQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % COMPANION_QUOTES.length);
  };

  return (
    <div className="space-y-8" id="homeassistant-widget-container">
      {/* 🤖 DUOLINGO/NINTENDO STYLE VIRTUAL COMPANION BANNER */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 border-4 border-slate-900 shadow-[6px_6px_0_0_#1e293b] text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        
        {/* Cute Mascot Avatar */}
        <div className="relative shrink-0 flex items-center justify-center p-3 bg-white border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0_0_#1e293b] animate-bounce">
          <Bot className="w-12 h-12 text-indigo-600" />
          <span className="absolute -bottom-2 -right-2 bg-yellow-400 border-2 border-slate-900 text-slate-900 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[1px_1px_0_0_#1e293b]">
            DuoAI 🦉
          </span>
        </div>

        {/* Bubble dialog style */}
        <div className="flex-1 space-y-2.5">
          <div className="bg-white text-slate-900 p-4 rounded-2.5xl border-3 border-slate-900 shadow-[3px_3px_0_0_#1e293b] relative">
            {/* Speach bubble tip */}
            <div className="absolute left-1/2 md:left-0 top-[-10px] md:top-1/2 md:-left-[10px] transform -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 Rotate-45 md:rotate-135 w-5 h-5 bg-white border-t-3 border-l-3 border-slate-900 md:border-b-3 md:border-r-3 md:border-t-0 md:border-l-0"></div>
            
            <p className="text-xs font-black uppercase text-indigo-600 tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-500" /> Sfatul lui Duo pentru {child.name}:
            </p>
            <p className="text-sm font-bold text-slate-850 italic">
              {COMPANION_QUOTES[quoteIndex]}
            </p>
          </div>

          <button 
            type="button"
            onClick={rotateQuote}
            className="text-[10px] font-black uppercase bg-yellow-400 text-slate-900 border-2 border-slate-900 px-3 py-1.5 rounded-xl hover:bg-yellow-500 active:translate-y-[1px] transition-transform shadow-[2px_2px_0_0_#1e293b] cursor-pointer"
          >
            Alt Sfat Amuzant 🪄
          </button>
        </div>
      </div>

      {/* Grid containing Proposal creation form and Historical items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formular trimitere sugestie */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border-4 border-slate-900 shadow-[6px_6px_0_0_#1e293b]" id="kid-propose-widget">
          <div className="flex items-center gap-2 border-b-3 border-slate-100 pb-3 mb-4">
            <Lightbulb className="w-6 h-6 text-amber-500 animate-pulse" />
            <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">
              Propune Părinților 💡
            </h3>
          </div>

          <p className="text-xs text-slate-500 font-extrabold leading-relaxed mb-4">
            Ai o idee super de activitate cu care vrei să strângi puncte? Sau vrei să adăugăm o recompensă cool în magazin? Trimite ideea ta de mai jos spre aprobare!
          </p>

          <form onSubmit={handleSubmitSuggestion} className="space-y-4 font-black text-xs text-slate-700">
            <div>
              <label className="block text-slate-400 font-black uppercase tracking-wider text-[9px] mb-1">Tip Propunere</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["activity", "reward", "other"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSugType(t);
                      setSugPoints("");
                      setSugDuration("");
                    }}
                    className={`py-2 text-[10px] font-black rounded-xl border-2 transition uppercase cursor-pointer ${
                      sugType === t 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-black scale-102" 
                        : "border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50"
                    }`}
                  >
                    {t === "activity" ? "🏃‍♂️ Activitate" : t === "reward" ? "🎁 Cadou" : "💡 Altele"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-black uppercase tracking-wider text-[9px] mb-1">Titlu Propunere</label>
              <input
                type="text"
                required
                value={sugTitle}
                onChange={(e) => setSugTitle(e.target.value)}
                placeholder={sugType === "activity" ? "Ex: Spălat mașina din curte" : sugType === "reward" ? "Ex: O ciocolată caldă duminică" : "Ex: O seară de jocuri în familie"}
                className="w-full px-3 py-2.5 border-3 border-slate-900 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-850 shadow-[1.5px_1.5px_0_0_#1e293b]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-black uppercase tracking-wider text-[9px] mb-1">
                  {sugType === "activity" ? "Puncte propuse" : "Cost propus (pct)"}
                </label>
                <input
                  type="number"
                  required
                  value={sugPoints}
                  onChange={(e) => setSugPoints(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 40"
                  className="w-full px-3 py-2.5 border-3 border-slate-900 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-mono font-black text-slate-800 shadow-[1.5px_1.5px_0_0_#1e293b]"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-black uppercase tracking-wider text-[9px] mb-1">Timp ecran (min)</label>
                <input
                  type="number"
                  value={sugDuration}
                  onChange={(e) => setSugDuration(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 30 (opțional)"
                  className="w-full px-3 py-2.5 border-3 border-slate-900 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-mono font-black text-slate-800 shadow-[1.5px_1.5px_0_0_#1e293b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-black uppercase tracking-wider text-[9px] mb-1">Descriere / Detalii</label>
              <textarea
                value={sugDescription}
                onChange={(e) => setSugDescription(e.target.value)}
                placeholder="Explică părinților de ce este o idee bună și ce vei face exact!"
                className="w-full px-3 py-2 border-3 border-slate-900 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-800 h-20 resize-none font-sans shadow-[1.5px_1.5px_0_0_#1e293b]"
              />
            </div>

            {sugMessage && (
              <div className={`p-3 rounded-xl border-2 text-[10px] font-black ${
                sugMessage.type === "success" 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-400 animate-bounce" 
                  : "bg-rose-50 text-rose-800 border-rose-450"
              }`}>
                {sugMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingSug}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 border-3 border-slate-900 text-white font-extrabold uppercase tracking-wider cursor-pointer shadow-[3px_3px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none text-xs flex items-center justify-center gap-2"
            >
              {isSubmittingSug ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-slate-900" />}
              Trimite Propunerea
            </button>
          </form>
        </div>

        {/* Istoricul propunerilor mele */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border-4 border-slate-900 shadow-[6px_6px_0_0_#1e293b] flex flex-col justify-between" id="kid-suggestions-history">
          <div>
            <div className="flex items-center gap-2 border-b-3 border-slate-100 pb-3 mb-4">
              <Award className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">
                Istoricul Propunerilor Mele 📜
              </h3>
            </div>

            <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
              Verifică aici dacă ideile tale au fost acceptate sau refuzate de mami și tati, împreună cu recompensele stabilite și comentariile lor în timp real!
            </p>

            {!state.suggestions || state.suggestions.filter(s => s.childId === child.id).length === 0 ? (
              <div className="p-8 text-center border-4 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-xs my-auto">
                Nu ai trimis propuneri încă. Completează formularul din stânga pentru a trimite prima ta idee!
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {state.suggestions
                  .filter((sug) => sug.childId === child.id)
                  .map((sug) => {
                    const dateParsed = () => {
                      try {
                        return new Date(sug.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
                      } catch {
                        return "";
                      }
                    };
                    return (
                      <div 
                        key={sug.id} 
                        className={`p-4 rounded-2xl border-3 transition-all ${
                          sug.status === "approved" 
                            ? "border-emerald-500 bg-emerald-50/50 shadow-[2px_2px_0_0_#10b981]" 
                            : sug.status === "rejected" 
                              ? "border-rose-500 bg-rose-50/50 shadow-[2px_2px_0_0_#f43f5e]" 
                              : "border-slate-900 bg-white shadow-[2px_2px_0_0_#1e293b]"
                        } space-y-2`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded-lg border-2 border-slate-900 bg-indigo-100 text-[8px] font-black uppercase tracking-wider text-indigo-800">
                              {sug.type === "activity" ? "Activity" : sug.type === "reward" ? "Store reward" : "Other"}
                            </span>
                            <span className="font-display font-black text-[13px] text-slate-900 leading-none">{sug.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">{dateParsed()}</span>
                        </div>

                        <p className="text-xs text-slate-500 font-semibold leading-relaxed leading-normal">{sug.description}</p>

                        <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] font-bold mt-1 max-w-sm border-t border-slate-100/50">
                          {sug.proposedPointsOrCost !== undefined && (
                            <div>
                              <span className="text-slate-400 uppercase text-[8px] font-black tracking-wide">
                                {sug.type === "activity" ? "Punctaj propus:" : "Cost propus:"}
                              </span>
                              <p className="text-amber-600 font-mono font-black">{sug.proposedPointsOrCost} Pcts</p>
                            </div>
                          )}
                          {sug.proposedDurationMinutes !== undefined && (
                            <div>
                              <span className="text-slate-400 uppercase text-[8px] font-black tracking-wide">Timp ecran:</span>
                              <p className="text-indigo-600 font-mono font-black">{sug.proposedDurationMinutes} min</p>
                            </div>
                          )}
                        </div>

                        {sug.adminFeedback && (
                          <div className={`mt-3 p-3 rounded-xl border-2 text-[11px] leading-relaxed font-bold ${
                            sug.status === "approved" 
                              ? "bg-emerald-50 text-emerald-950 border-emerald-300" 
                              : "bg-rose-50 text-rose-950 border-rose-350"
                          }`}>
                            <span className="font-black text-[#881337] block text-[9.5px] uppercase tracking-wider mb-0.5">Comentariu Mami/Tati:</span>
                            "{sug.adminFeedback}"
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
