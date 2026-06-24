/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de temă vizuală — reutilizabil în KidDashboard și ParentDashboard
 */

import React from "react";
import type { ThemeName } from "../styles/themes";

interface ThemeSelectorProps {
  theme: ThemeName;
  onChangeTheme: (theme: ThemeName) => void;
  compact?: boolean;
}

const themeIcons: Record<ThemeName, string> = {
  nintendo: "🎮",
  duolingo: "🦉",
  pokemon: "⚡",
  minecraft: "⛏️"
};

const themeLabels: Record<ThemeName, string> = {
  nintendo: "Nintendo",
  duolingo: "Duolingo",
  pokemon: "Pokémon",
  minecraft: "Minecraft"
};

export default function ThemeSelector({ theme, onChangeTheme, compact }: ThemeSelectorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {(["nintendo", "duolingo", "pokemon", "minecraft"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChangeTheme(t)}
            className={`w-8 h-8 flex items-center justify-center text-sm rounded-xl border-2 transition-all cursor-pointer ${
              theme === t
                ? "bg-indigo-500 text-white border-indigo-600 shadow-[2px_2px_0_0_#4338ca] scale-105"
                : "bg-white/80 text-slate-500 border-slate-300 hover:border-slate-400 hover:bg-white"
            }`}
            title={themeLabels[t]}
          >
            {themeIcons[t]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-display font-black text-slate-400 uppercase tracking-widest">Temă:</span>
      <div className="flex gap-1">
        {(["nintendo", "duolingo", "pokemon", "minecraft"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChangeTheme(t)}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl border-2 transition-all cursor-pointer ${
              theme === t
                ? "bg-indigo-500 text-white border-indigo-600 shadow-[2px_2px_0_0_#4338ca]"
                : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
            }`}
          >
            {themeIcons[t]} {themeLabels[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
