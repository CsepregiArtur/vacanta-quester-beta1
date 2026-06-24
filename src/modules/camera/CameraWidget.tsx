import React from "react";
import { motion } from "motion/react";
import { X, Upload, RefreshCw } from "lucide-react";

interface CameraWidgetProps {
  title: string;
  imagePreview: string | null;
  dragOver: boolean;
  isEvaluating: boolean;
  evalResult: { success: boolean; feedback: string } | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  submitButtonText?: string;
}

export default function CameraWidget({
  title,
  imagePreview,
  dragOver,
  isEvaluating,
  evalResult,
  fileInputRef,
  onClose,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onSubmit,
  submitButtonText = "Trimite spre Evaluare AI 🤖"
}: CameraWidgetProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-[8px_8px_0_0_#1e293b] border-4 border-slate-900"
      >
        <div className="flex items-center justify-between border-b-3 border-slate-100 pb-3">
          <h4 className="font-display font-black text-slate-900 text-sm uppercase tracking-wider">
            {title}
          </h4>
          <button 
            onClick={onClose}
            className="p-1 rounded-xl border-2 border-slate-900 hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer shadow-[2px_2px_0_0_#1e293b] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zona upload drag and drop */}
        <div 
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-4 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 ${
            dragOver 
              ? "border-indigo-500 bg-indigo-50/50 scale-102" 
              : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept="image/*"
            className="hidden"
          />
          
          {imagePreview ? (
            <div className="space-y-4">
              <img 
                src={imagePreview} 
                alt="File preview camera"
                referrerPolicy="no-referrer"
                className="max-h-48 mx-auto rounded-xl border-3 border-slate-900 shadow-[3px_3px_0_0_#1e293b] object-cover" 
              />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Fă click pe poză pentru a schimba camera sau fișierul.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-10 h-10 text-[#1cb0f6] mx-auto animate-bounce" />
              <div>
                <p className="text-sm font-black text-slate-900 uppercase">Trage poza aici sau dă click</p>
                <p className="text-xs text-slate-400 mt-1 font-bold">Poți folosi camera foto în timp real sau o imagine din galerie.</p>
              </div>
            </div>
          )}
        </div>

        {isEvaluating && (
          <div className="flex flex-col items-center justify-center p-6 space-y-3 text-center bg-indigo-50/50 border-3 border-indigo-200 rounded-2xl">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <div>
              <p className="text-sm font-black text-indigo-950 uppercase">Se trimite la inspectat...</p>
              <p className="text-xs text-indigo-700 max-w-sm mt-0.5 font-bold">Gemini Vision analizează dovada foto în câteva momente.</p>
            </div>
          </div>
        )}

        {evalResult && (
          <div className={`p-4 rounded-2xl border-3 leading-normal text-xs font-bold ${
            evalResult.success 
              ? "bg-emerald-50 border-emerald-400 text-emerald-900 animate-pulse" 
              : "bg-rose-50 border-rose-400 text-rose-900"
          }`}>
            <p className="font-black uppercase text-sm mb-1">{evalResult.success ? "🎉 Treabă aprobată!" : "⚠️ Mai trebuie lucrat"}</p>
            <p>{evalResult.feedback}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end border-t-3 border-slate-100 pt-4">
          <button
            onClick={onClose}
            disabled={isEvaluating}
            className="px-4 py-2 border-3 border-slate-900 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-50 cursor-pointer"
          >
            Anulează
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSubmit();
            }}
            disabled={isEvaluating || !imagePreview}
            className={`px-6 py-2.5 bg-[#58cc02] hover:bg-[#46a302] text-white rounded-xl text-xs font-black border-3 border-slate-900 transition duration-150 uppercase tracking-wide cursor-pointer shadow-[2px_2px_0_0_#1e293b] active:translate-y-[1.5px] active:shadow-none ${
              !imagePreview ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
            }`}
          >
            {submitButtonText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
