import React from "react";
import { Gamepad2, Tv, Share2, Clock, Sparkles } from "lucide-react";
import { AppState } from "../../types";

interface RewardsWidgetProps {
  state: AppState;
  isReadingForced: boolean;
  cashoutPoints: number | "";
  setCashoutPoints: (val: number | "") => void;
  cashoutMessage: { text: string; type: "success" | "error" } | null;
  isSubmittingCashout: boolean;
  handleBuyReward: (id: string, name: string, costPoints: number) => void;
  handleCashoutPoints: (e: React.FormEvent) => void;
}

export default function RewardsWidget({
  state,
  isReadingForced,
  cashoutPoints,
  setCashoutPoints,
  cashoutMessage,
  isSubmittingCashout,
  handleBuyReward,
  handleCashoutPoints
}: RewardsWidgetProps) {
  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-slate-900 shadow-[6px_6px_0_0_#1e293b] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_#1e293b] transition-all" id="digital-store-widget">
      <div className="flex items-center gap-2.5 border-b-3 border-slate-100 pb-4 mb-6">
        <Gamepad2 className="w-7 h-7 text-[#58cc02] animate-bounce" />
        <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">
          Super Magazinul Nintendo de Recompense 🎮
        </h3>
      </div>

      <p className="text-sm text-slate-600 mb-6 font-bold leading-relaxed">
        La cumpărare, serverul va lansa un cronometru de vacanță dedicat. Dacă integrarea este pornită, se va deschide automat alimentarea consolei sau TV-ului prin **Home Assistant**, iar când timpul expiră, se va opri automat!
      </p>

      {/* Catalog Store rewards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* TV */}
        <div className="p-5 rounded-3xl border-3 border-slate-900 bg-[#ebf8ff] flex flex-col justify-between shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1e293b] transition-all">
          <div>
            <div className="p-3.5 bg-cyan-150 text-cyan-600 rounded-2xl w-fit border-2 border-slate-900 shadow-[2px_2px_0_0_#1e293b]">
              <Tv className="w-6 h-6 text-cyan-500" />
            </div>
            <h4 className="font-display font-black text-slate-900 text-[15px] mt-4 uppercase leading-none">1 Oră la Smart TV</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">Primești permisiunea să pornești televizorul pentru exact un ceas de desene sau documentare.</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Cost Recompensă</span>
              <span className="font-mono font-black text-amber-600">100 Pcts</span>
            </div>
            <button
              onClick={() => handleBuyReward("tv", "1 Oră la Smart TV", 100)}
              disabled={isReadingForced}
              className={`w-full py-2.5 text-xs font-black rounded-xl text-center border-3 border-slate-900 transition duration-150 cursor-pointer shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none ${
                isReadingForced 
                  ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-cyan-500 hover:bg-cyan-600 text-white"
              }`}
            >
              {isReadingForced ? "Limitat: Citește întâi" : "Cumpără Timp TV"}
            </button>
          </div>
        </div>

        {/* Xbox */}
        <div className="p-5 rounded-3xl border-3 border-slate-900 bg-[#eefcf2] flex flex-col justify-between shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1e293b] transition-all">
          <div>
            <div className="p-3.5 bg-[#e2f9eb] text-emerald-600 rounded-2xl w-fit border-2 border-slate-900 shadow-[2px_2px_0_0_#1e293b]">
              <Gamepad2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="font-display font-black text-slate-900 text-[15px] mt-4 uppercase leading-none">1 Oră la Xbox Series</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">Sesiune de distracție Minecraft sau jocul preferat. Declanșează switch-ul de la consolă.</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Cost Recompensă</span>
              <span className="font-mono font-black text-amber-600">120 Pcts</span>
            </div>
            <button
              onClick={() => handleBuyReward("xbox", "1 Oră pe Console (Xbox)", 125)}
              disabled={isReadingForced}
              className={`w-full py-2.5 text-xs font-black rounded-xl text-center border-3 border-slate-900 transition duration-150 cursor-pointer shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none ${
                isReadingForced 
                  ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
            >
              {isReadingForced ? "Limitat: Citește întâi" : "Cumpără Timp Xbox"}
            </button>
          </div>
        </div>

        {/* TikTok & Instagram */}
        <div className="p-5 rounded-3xl border-3 border-slate-900 bg-[#fdf2f8] flex flex-col justify-between shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1e293b] transition-all">
          <div>
            <div className="p-3.5 bg-fuchsia-100 text-fuchsia-600 rounded-2xl w-fit border-2 border-slate-900 shadow-[2px_2px_0_0_#1e293b]">
              <Share2 className="w-6 h-6 text-fuchsia-500" />
            </div>
            <h4 className="font-display font-black text-slate-900 text-[15px] mt-4 uppercase leading-none">30 min Social Media</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">Timp pentru TikTok sau feed-ul de Instagram. Distrează-te descoperind videoclipuri din vacanță.</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Cost Recompensă</span>
              <span className="font-mono font-black text-amber-600">50 Pcts</span>
            </div>
            <button
              onClick={() => handleBuyReward("tiktok", "30 min pe Social Media (TikTok/Insta)", 50)}
              disabled={isReadingForced}
              className={`w-full py-2.5 text-xs font-black rounded-xl text-center border-3 border-slate-900 transition duration-150 cursor-pointer shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none ${
                isReadingForced 
                  ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
              }`}
            >
              {isReadingForced ? "Limitat: Citește întâi" : "Cumpără Social Media"}
            </button>
          </div>
        </div>

        {/* Culcare mai târziu */}
        <div className="p-5 rounded-3xl border-3 border-slate-900 bg-[#ebf8ff] flex flex-col justify-between shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1e293b] transition-all">
          <div>
            <div className="p-3.5 bg-indigo-100 text-indigo-600 rounded-2xl w-fit border-2 border-slate-900 shadow-[2px_2px_0_0_#1e293b]">
              <Clock className="w-6 h-6 text-indigo-500" />
            </div>
            <h4 className="font-display font-black text-slate-900 text-[15px] mt-4 uppercase leading-none">Somn târziu 30 min</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">Dreptul special de a sta mai târziu cu 30 de minute seara pentru povești sau un film cu părinții.</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold font-mono">
              <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Cost Recompensă</span>
              <span className="font-mono font-black text-amber-600">50 Pcts</span>
            </div>
            <button
              onClick={() => handleBuyReward("extra_sleep", "Somn mai târziu cu 30 min", 50)}
              disabled={isReadingForced}
              className={`w-full py-2.5 text-xs font-black rounded-xl text-center border-3 border-slate-900 transition duration-150 cursor-pointer shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none ${
                isReadingForced 
                  ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {isReadingForced ? "Limitat: Citește întâi" : "Schimbă Puncte"}
            </button>
          </div>
        </div>

        {/* Approved Custom Rewards shelf dynamically integrated */}
        {state.customRewards && state.customRewards.map((reward) => (
          <div 
            key={reward.id} 
            className="p-5 rounded-3xl border-3 border-slate-900 bg-amber-50 flex flex-col justify-between shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1e293b] transition-all"
          >
            <div>
              <div className="p-3.5 bg-yellow-100 text-yellow-700 rounded-2xl w-fit border-2 border-slate-900 shadow-[2px_2px_0_0_#1e293b] text-xl font-bold">
                {reward.icon || "🎁"}
              </div>
              <h4 className="font-display font-black text-slate-900 text-[15px] mt-4 uppercase leading-none">{reward.name}</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">
                Această recompensă a fost propusă de voi și aprobată de părinți!
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold font-sans">
                <span className="text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">Cost Recompensă</span>
                <span className="font-mono font-black text-amber-600">{reward.costPoints} Pcts</span>
              </div>
              <button
                onClick={() => handleBuyReward(reward.id, reward.name, reward.costPoints)}
                disabled={isReadingForced}
                className={`w-full py-2.5 text-xs font-black rounded-xl text-center border-3 border-slate-900 transition duration-150 cursor-pointer shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none ${
                  isReadingForced 
                    ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {isReadingForced ? "Limitat: Citește întâi" : "Cumpără Acum"}
              </button>
            </div>
          </div>
        ))}

        {/* CASH OUT TO REAL MONEY TERMINAL */}
        <div className="p-5 rounded-3xl border-3 border-emerald-500 bg-[#eefcf2] flex flex-col justify-between shadow-[3px_3px_0_0_#10b981]" id="points-to-money-terminal">
          <div>
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl w-fit border-2 border-emerald-500 text-sm font-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#10b981] font-display uppercase">
              Euro / RON Terminal 💶
            </div>
            <h4 className="font-display font-black text-slate-900 text-[15px] mt-4 uppercase leading-none">Bani Reali (RON)</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">
              Transformă punctele de vacanță în bani reali! Părinții îzi vor plăti banii în mână după aprobare instantă.
            </p>
            <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border-2 border-emerald-200 text-[10px] text-emerald-800 font-extrabold leading-normal">
              Rată de schimb oficială: 10 puncte = 1 RON. Te rugăm să retragi la multiplu de 10 puncte!
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <form onSubmit={handleCashoutPoints} className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  step="10"
                  min="10"
                  value={cashoutPoints}
                  onChange={(e) => setCashoutPoints(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Nr. puncte (ex: 100)"
                  disabled={isReadingForced || isSubmittingCashout}
                  className="w-full pl-3 pr-20 py-2.5 border-3 border-slate-900 rounded-xl text-xs font-black focus:outline-none focus:border-emerald-500 transition-colors bg-white font-mono text-emerald-900 shadow-[1.5px_1.5px_0_0_#1e293b]"
                />
                <div className="absolute right-2 top-2 text-[9px] bg-emerald-600 text-white font-black px-1.5 py-1 rounded border border-slate-950 shadow-2xs">
                  = {cashoutPoints ? Math.round(Number(cashoutPoints) / 10) : 0} RON
                </div>
              </div>

              {cashoutMessage && (
                <div className={`p-3 rounded-2xl text-[10px] leading-normal font-black border-2 ${
                  cashoutMessage.type === "success" 
                    ? "bg-emerald-50 border-emerald-400 text-emerald-850 animate-bounce" 
                    : "bg-rose-50 border-rose-400 text-rose-850"
                }`}>
                  {cashoutMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isReadingForced || isSubmittingCashout || !cashoutPoints}
                className={`w-full py-2.5 text-xs font-black rounded-xl text-center border-3 border-slate-900 transition duration-150 cursor-pointer shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none uppercase tracking-wider ${
                  isReadingForced 
                    ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
              >
                {isSubmittingCashout ? "Se trimite..." : (isReadingForced ? "Citește întâi" : "Schimbă în RON 🚀")}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
