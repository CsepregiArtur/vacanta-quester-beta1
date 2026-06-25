/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CameraWidget — Modal overlay for uploading photo evidence (chores, dog walks, etc.)
 */

import React from "react";
import { Upload, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface CameraWidgetProps {
  title: string;
  imagePreview: string | null;
  dragOver: boolean;
  isEvaluating: boolean;
  evalResult: { success: boolean; feedback: string } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
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
}: CameraWidgetProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-3xl p-6 max-w-lg w-full border-2 border-slate-200 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-500" />
            {title}
          </h3>
          <button
            aria-label="Închide"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition cursor-pointer"
            disabled={isEvaluating}
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Drag-and-drop zone */}
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
            dragOver
              ? "border-indigo-500 bg-indigo-50"
              : imagePreview
              ? "border-emerald-300 bg-emerald-50/30"
              : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30"
          }`}
        >
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-xl object-contain"
              />
              <p className="text-[10px] text-slate-500 mt-2 font-medium">
                Apasă sau trage pentru a schimba imaginea
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs text-slate-500 font-semibold">
                Trage o imagine aici sau apasă pentru a selecta
              </p>
              <p className="text-[10px] text-slate-400">
                Se acceptă doar fișiere imagine
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {/* Evaluation result feedback */}
        {evalResult && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-start gap-2 ${
              evalResult.success
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {evalResult.success ? (
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
            )}
            <span>{evalResult.feedback}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            disabled={isEvaluating}
          >
            Anulează
          </button>
          <button
            onClick={onSubmit}
            disabled={!imagePreview || isEvaluating}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Se analizează...
              </>
            ) : (
              "Trimite Dovadă"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
