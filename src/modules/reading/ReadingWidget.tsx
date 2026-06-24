import React from "react";
import { BookOpen, AlertTriangle, ArrowRight, RefreshCw, Sparkles, Compass, CheckCircle2 } from "lucide-react";
import { Child } from "../../types";

const READING_TOPICS = [
  { id: "spatiu", name: "🛸 Spațiul și Sistemul Solar", desc: "Descopere secretele planetelor și ale găurilor negre." },
  { id: "animale", name: "🦁 Animale din Junglă", desc: "Află lucruri incredibile despre feline, elefanți și reptile." },
  { id: "gaming", name: "🎮 Istoria Jocurilor Video", desc: "Cum s-au dezvoltat primele console și recorduri istorice." },
  { id: "programare", name: "💻 Cum funcționează un Robot?", desc: "Învață bazele codului și cum gândesc mașinile inteligente." },
  { id: "ocean", name: "🐙 Creaturi din Adâncuri", desc: "Fă o scufundare în cel mai adânc loc de pe Pământ." },
  { id: "history", name: "🏛️ Imperiul Roman", desc: "Despre gladiatori, invenții și cel mai mare imperiu din antichitate." }
];

interface ReadingWidgetProps {
  child: Child;
  activeReadingTask: any;
  isGenerating: boolean;
  isReadingForced: boolean;
  customTopic: string;
  setCustomTopic: (val: string) => void;
  quizError: string | null;
  quizAnswers: Record<number, number>;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  isSubmittingAnswers: boolean;
  handleGenerateReading: (topic: string) => void;
  onAbandonConfirm: () => void;
  handleSubmitQuiz: () => void;
}

export default function ReadingWidget({
  child,
  activeReadingTask,
  isGenerating,
  isReadingForced,
  customTopic,
  setCustomTopic,
  quizError,
  quizAnswers,
  setQuizAnswers,
  isSubmittingAnswers,
  handleGenerateReading,
  onAbandonConfirm,
  handleSubmitQuiz
}: ReadingWidgetProps) {
  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-slate-900 shadow-[6px_6px_0_0_#1e293b] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_#1e293b] transition-all" id="reading-activity-widget">
      <div className="flex items-center justify-between border-b-3 border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-indigo-600 animate-pulse" />
          <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">
            Activitate: Lectură Zilnică 📚
          </h3>
        </div>
        <span className={`text-[10px] uppercase font-black px-3 py-1.5 rounded-xl border-2 border-slate-950 shadow-[1.5px_1.5px_0_0_#1e293b] ${
          isReadingForced ? "bg-rose-500 text-white animate-bounce" : "bg-indigo-100 text-indigo-800"
        }`}>
          {isReadingForced ? "OBLIGATORIU ACUM ⚠️" : (
            activeReadingTask 
              ? `Nivel: ${activeReadingTask.difficultyClass || "Standard"} (+${activeReadingTask.points} Pcts)` 
              : "Opțional (+60 Pcts)"
          )}
        </span>
      </div>

      {/* Daca nu are o lectura inceputa */}
      {!activeReadingTask ? (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-650 font-black leading-relaxed">
              Alege ce vrei să citești astăzi. Gemini va compune un text unic, educativ și distractiv numai pentru tine, urmat de un minitest.
            </p>
            
            {isReadingForced && (
              <div className="p-4 bg-rose-50 border-3 border-slate-900 rounded-2xl mt-4 flex gap-3 text-rose-900 text-xs shadow-[3px_3px_0_0_#1e293b]">
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                <div>
                  <p className="font-black text-rose-950 uppercase tracking-wide">Lectură forțată de vacanță! 🚨</p>
                  <p className="mt-1 opacity-90 leading-relaxed font-bold">
                    Au trecut 3 zile fără citit. Pentru a debloca restul activităților (cum ar fi plimbatul câinelui pe bani sau cumpărarea din magazin), te rugăm să citești textul de astăzi! Primești și punctaj sporit la terminare (+100 de puncte!).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Grid Tematici */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {READING_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleGenerateReading(topic.name)}
                disabled={isGenerating}
                className="p-4 rounded-2xl border-3 border-slate-900 hover:border-indigo-600 hover:bg-[#ebf8ff] text-left transition-all duration-150 group flex justify-between items-start cursor-pointer shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1e293b] active:translate-y-[1px] active:shadow-none"
              >
                <div>
                  <h4 className="font-display font-black text-slate-900 group-hover:text-indigo-600 text-[14px] transition-colors">{topic.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-normal font-bold max-h-12 overflow-hidden">{topic.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-650 transition-colors shrink-0 mt-0.5" />
              </button>
            ))}
          </div>

          {/* Subiect personalizat */}
          <div className="pt-5 border-t-3 border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Sau scrie tema ta preferată:</h4>
            <div className="flex gap-2.5">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="De exemplu: Fotbalul modern și Messi, Legenda Regelui Arthur..."
                disabled={isGenerating}
                className="flex-1 px-4 py-3 text-sm border-3 border-slate-900 rounded-2xl focus:outline-none focus:border-indigo-600 transition-all bg-white font-black text-slate-800 shadow-[2px_2px_0_0_#1e293b]"
              />
              <button
                onClick={() => handleGenerateReading("")}
                disabled={isGenerating || !customTopic}
                className="px-5 py-3 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all duration-150 flex items-center gap-1 cursor-pointer uppercase tracking-wider border-3 border-slate-900 shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1.5px] active:translate-y-[1.5px] active:shadow-none"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-300" />}
                Creează
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="p-8 bg-indigo-50/50 rounded-2.5xl border-3 border-dashed border-indigo-200 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              <h4 className="font-display font-black text-indigo-950 mt-4 text-base">Generare text de vacanță personalizat...</h4>
              <p className="text-xs text-indigo-700 max-w-sm mt-1 leading-relaxed font-bold">
                AI pregătește un material captivant adaptat pentru vârsta ta de {child.age} ani și formulează întrebările quiz-ului.
              </p>
            </div>
          )}
        </div>
      ) : (
        // Lectură în curs de desfășurare
        <div className="space-y-6">
          <div className="bg-[#f0f9ff] p-5 rounded-2xl border-3 border-slate-900 max-h-[380px] overflow-y-auto shadow-[3px_3px_0_0_#1e293b]">
            <h4 className="font-display font-black text-lg text-indigo-950 mb-3 border-b-2 border-slate-200 pb-2">
              {activeReadingTask.readingTopic}
            </h4>
            <p className="text-neutral-800 leading-relaxed text-sm whitespace-pre-line font-sans font-medium">
              {activeReadingTask.readingPassage}
            </p>
          </div>

          {/* Chestionar (Quiz) */}
          <div className="pt-4 border-t-3 border-slate-100 space-y-6">
            <div>
              <h4 className="font-display font-black text-neutral-900 flex items-center gap-1.5 uppercase text-sm">
                <Compass className="w-5 h-5 text-indigo-500 animate-spin-pulse" />
                Test de verificare a lecturii:
              </h4>
              <p className="text-xs text-neutral-500 font-bold mt-0.5">Răspunde corect la toate cele 3 întrebări de mai jos pentru a primi punctele.</p>
            </div>

            {quizError && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                {quizError}
              </div>
            )}

            <div className="space-y-5">
              {activeReadingTask.readingQuestions?.map((q: any, qIndex: number) => {
                const hasFeedback = q.feedback && q.selectedAnswerIndex !== undefined;
                const isInteractiveReset = quizAnswers[qIndex] !== q.selectedAnswerIndex;
                const showFeedback = hasFeedback && !isInteractiveReset;

                return (
                  <div key={q.id || qIndex} className="space-y-3 p-4 rounded-2xl bg-neutral-50 border-3 border-slate-900 shadow-[2px_2px_0_0_#1e293b]">
                    <p className="text-sm font-black text-neutral-900">
                      {qIndex + 1}. {q.question}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {q.options.map((option: string, optIdx: number) => {
                        const isCurrentSelected = quizAnswers[qIndex] === optIdx;
                        
                        // Dynamic styling based on previous feedback
                        let btnClasses = "p-3 rounded-xl border-3 text-xs text-left transition-all flex items-center justify-between cursor-pointer ";
                        let labelSuffix = null;

                        if (showFeedback) {
                          if (optIdx === q.correctAnswerIndex) {
                            btnClasses += "border-emerald-500 bg-emerald-50 text-emerald-950 font-black shadow-[1.5px_1.5px_0_0_#10b981]";
                            labelSuffix = <span className="text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase shrink-0 border border-slate-950">✓ Corect</span>;
                          } else if (optIdx === q.selectedAnswerIndex) {
                            btnClasses += "border-rose-500 bg-rose-50 text-rose-950 font-black shadow-[1.5px_1.5px_0_0_#ef4444]";
                            labelSuffix = <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase shrink-0 border border-slate-950">✗ Greșit</span>;
                          } else {
                            btnClasses += "border-slate-300 text-slate-400 bg-white opacity-60";
                          }
                        } else {
                          // Standard interactive styling
                          if (isCurrentSelected) {
                            btnClasses += "border-indigo-600 bg-indigo-50 text-indigo-950 font-black shadow-[1.5px_1.5px_0_0_#4f46e5]";
                          } else {
                            btnClasses += "border-slate-900 hover:bg-[#fffcf0] text-neutral-800 bg-white shadow-[1.5px_1.5px_0_0_#1e293b]";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={showFeedback}
                            onClick={() => setQuizAnswers(prev => ({ ...prev, [qIndex]: optIdx }))}
                            className={btnClasses}
                          >
                            <span className="pr-1 leading-snug font-bold">{option}</span>
                            {labelSuffix}
                          </button>
                        );
                      })}
                    </div>
                    {showFeedback && (
                      <p className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl leading-relaxed mt-2.5">
                        💡 {q.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={onAbandonConfirm}
                className="px-4 py-2 border-3 border-slate-900 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 cursor-pointer transition-all duration-150"
              >
                Abandonează
              </button>
              <button
                onClick={handleSubmitQuiz}
                disabled={isSubmittingAnswers}
                className="px-6 py-2.5 bg-[#58cc02] hover:bg-[#46a302] text-white rounded-xl text-xs font-black border-3 border-slate-900 transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0_0_#1e293b] hover:translate-y-[-1.5px] active:translate-y-[1.5px] active:shadow-none"
              >
                {isSubmittingAnswers ? (
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                ) : activeReadingTask.status === "rejected" ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5" />
                    Revalidează răspunsurile corectate
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    Trimite răspunsurile testului
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
