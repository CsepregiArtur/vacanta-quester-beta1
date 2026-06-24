/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Teme vizuale partajate — Vacanta Quester
 * Folosite de KidDashboard, ParentDashboard și orice alt component
 */

export type ThemeName = "nintendo" | "duolingo" | "pokemon" | "minecraft";

export interface DashboardTheme {
  card: string;
  subCard: string;
  heading: string;
  subheading: string;
  button: string;
  buttonRed: string;
  buttonGreen: string;
  tag: string;
  label: string;
  text: string;
  header: string;
  input: string;
  select: string;
}

export const dashboardThemes: Record<ThemeName, DashboardTheme> = {
  nintendo: {
    card: "bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0_0_#1e293b] hover:translate-y-[-2px] transition-all",
    subCard: "bg-amber-50 border-3 border-slate-900 rounded-2xl p-4 shadow-[2px_2px_0_0_#1e293b]",
    heading: "font-display font-black text-2xl text-slate-900",
    subheading: "font-display font-black text-xs text-[#ff4b4b] uppercase tracking-wider",
    button: "px-4 py-2 bg-[#ffc000] hover:bg-[#e6ad00] text-slate-950 border-3 border-slate-900 font-display font-black rounded-xl text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    buttonRed: "px-4 py-2 bg-[#ff4b4b] hover:bg-[#e62b2b] text-white border-3 border-slate-900 font-display font-black rounded-xl text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    buttonGreen: "px-4 py-2 bg-[#58cc02] hover:bg-[#46a302] text-white border-3 border-slate-900 font-display font-black rounded-xl text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    tag: "bg-slate-100 border-2 border-slate-900 text-slate-850 px-2.5 py-1 rounded-full text-xs font-black",
    label: "text-[10px] font-display font-black text-slate-400 uppercase tracking-widest",
    text: "text-slate-600 font-medium text-xs md:text-sm",
    header: "bg-slate-900 text-white rounded-3xl p-6 border-2 border-slate-950",
    input: "w-full px-3 py-2.5 border-3 border-slate-900 rounded-xl focus:outline-none focus:border-indigo-600 text-xs",
    select: "px-3 py-2.5 border-3 border-slate-900 rounded-xl bg-white text-xs font-black"
  },
  duolingo: {
    card: "bg-white border-3 border-slate-200 rounded-3xl p-6 shadow-[0_5px_0_0_#cbd5e1] hover:shadow-[0_2px_0_0_#cbd5e1] hover:translate-y-[1px] transition-all",
    subCard: "bg-emerald-50/50 border-3 border-emerald-100 rounded-2xl p-4 shadow-[0_3px_0_0_#dcfce7]",
    heading: "font-display font-black text-2.5xl text-[#3c3c3c]",
    subheading: "font-display font-black text-xs text-[#1cb0f6] uppercase tracking-wider",
    button: "px-4 py-2 bg-[#ffc000] hover:bg-[#ffa700] text-[#1e293b] border-2 border-[#e0a200] font-display font-black rounded-2xl text-xs uppercase tracking-wider shadow-[0_4px_0_0_#cbd5e1] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer",
    buttonRed: "px-4 py-2 bg-[#ff4b4b] hover:bg-[#ef3b3b] text-white border-2 border-[#ea2b2b] font-display font-black rounded-2xl text-xs uppercase tracking-wider shadow-[0_4px_0_0_#cb3535] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer",
    buttonGreen: "px-4 py-2 bg-[#58cc02] hover:bg-[#4ea602] text-white border-2 border-[#3e9e00] font-display font-black rounded-2xl text-xs uppercase tracking-wider shadow-[0_4px_0_0_#cbd5e1] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer",
    tag: "bg-sky-50 border-2 border-sky-100 text-sky-600 px-2.5 py-1 rounded-full text-xs font-black",
    label: "text-[10px] font-sans font-black text-slate-400 uppercase tracking-wider",
    text: "text-slate-600 font-sans text-xs md:text-sm",
    header: "bg-gradient-to-r from-[#1cb0f6] to-[#58cc02] text-white rounded-3xl p-6 border-2 border-slate-200 shadow-[0_4px_0_0_#cbd5e1]",
    input: "w-full px-3 py-2.5 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-[#1cb0f6] text-xs",
    select: "px-3 py-2.5 border-2 border-slate-300 rounded-2xl bg-white text-xs font-black"
  },
  pokemon: {
    card: "bg-white border-3 border-[#3b4cca] rounded-3xl p-6 shadow-[4px_4px_0_0_#3b4cca] hover:translate-y-[-2px] transition-all",
    subCard: "bg-gradient-to-br from-indigo-50 to-blue-50 border-3 border-blue-200 rounded-2xl p-4 shadow-[2px_2px_0_0_#ffcb05]",
    heading: "font-display font-black text-2.5xl text-slate-900 drop-shadow-xs",
    subheading: "font-display font-black text-xs text-[#3b4cca] uppercase tracking-wider",
    button: "px-4 py-2 bg-[#ffcb05] hover:bg-[#ffde59] text-[#2a3c5a] border-3 border-[#3b4cca] font-display font-black rounded-xl text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#3b4cca] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    buttonRed: "px-4 py-2 bg-[#ee1515] hover:bg-[#f03b3b] text-white border-3 border-[#3b4cca] font-display font-black rounded-xl text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#3b4cca] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    buttonGreen: "px-4 py-2 bg-[#4dad5b] hover:bg-[#5dbd6c] text-white border-3 border-[#3cb254] font-display font-black rounded-xl text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#4dad5b] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    tag: "bg-yellow-50 border-2 border-[#ffcb05] text-amber-700 px-2.5 py-1 rounded-full text-xs font-black",
    label: "text-[10px] font-sans font-black text-[#3d7dca] uppercase tracking-widest",
    text: "text-slate-600 font-sans text-xs md:text-sm",
    header: "bg-gradient-to-r from-[#dc0a2d] to-[#f03b3b] text-white rounded-3xl p-6 border-3 border-[#3b4cca]",
    input: "w-full px-3 py-2.5 border-3 border-[#3b4cca] rounded-xl focus:outline-none focus:border-[#ffcb05] text-xs",
    select: "px-3 py-2.5 border-3 border-[#3b4cca] rounded-xl bg-white text-xs font-black"
  },
  minecraft: {
    card: "bg-[#212121] border-3 border-[#3c3c3c] rounded-none p-6 shadow-[4px_4px_0_0_#000000] hover:translate-y-[-2px] transition-all text-stone-200",
    subCard: "bg-[#181818] border-2 border-dashed border-stone-700 rounded-none p-4",
    heading: "font-mono font-bold text-xl text-[#55ff55] tracking-wide",
    subheading: "font-mono font-bold text-xs text-[#ffff55] uppercase tracking-widest",
    button: "px-4 py-2 bg-[#4a4a4a] hover:bg-[#5a5a5a] text-white border-2 border-[#8a8a8a] font-mono rounded-none text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    buttonRed: "px-4 py-2 bg-[#aa0000] hover:bg-[#ff5555] text-white border-2 border-[#550000] font-mono rounded-none text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    buttonGreen: "px-4 py-2 bg-[#00aa00] hover:bg-[#55ff55] text-white border-2 border-[#005500] font-mono rounded-none text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer",
    tag: "bg-stone-800 border border-stone-600 text-[#55ff55] px-2.5 py-1 rounded-none text-xs font-mono",
    label: "text-[10px] font-mono text-stone-500 uppercase tracking-widest",
    text: "text-stone-400 font-mono text-xs md:text-sm",
    header: "bg-[#212121] border-3 border-[#3c3c3c] rounded-none p-6 shadow-[4px_4px_0_0_#000] text-stone-200",
    input: "w-full px-3 py-2.5 border-3 border-[#3c3c3c] rounded-none focus:outline-none focus:border-[#55ff55] text-xs bg-[#1a1a1a] text-stone-200",
    select: "px-3 py-2.5 border-3 border-[#3c3c3c] rounded-none bg-[#1a1a1a] text-stone-200 text-xs font-mono"
  }
};
