/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Configurare Email SMTP — Panoul Părinte
 * Extras din ParentDashboard.tsx pentru modularizare
 */

import React, { useState } from "react";
import { Mail, Eye, Send, Server, CheckCircle2, AlertTriangle } from "lucide-react";
import type { DashboardTheme } from "../../styles/themes";

interface EmailConfigSectionProps {
  dashboardStyles: DashboardTheme;
  parentEmailInput: string;
  setParentEmailInput: (v: string) => void;
  smtpEnabled: boolean;
  setSmtpEnabled: (v: boolean) => void;
  smtpHost: string;
  setSmtpHost: (v: string) => void;
  smtpPort: number;
  setSmtpPort: (v: number) => void;
  smtpUser: string;
  setSmtpUser: (v: string) => void;
  smtpPass: string;
  setSmtpPass: (v: string) => void;
  smtpSecure: boolean;
  setSmtpSecure: (v: boolean) => void;
  onSaveConfig: () => void;
  onTestSmtp: () => void;
  isSavingConfig: boolean;
  isTestingSmtp: boolean;
  smtpTestStatus: { success: boolean; message: string } | null;
}

export default function EmailConfigSection({
  dashboardStyles: s,
  parentEmailInput, setParentEmailInput,
  smtpEnabled, setSmtpEnabled,
  smtpHost, setSmtpHost,
  smtpPort, setSmtpPort,
  smtpUser, setSmtpUser,
  smtpPass, setSmtpPass,
  smtpSecure, setSmtpSecure,
  onSaveConfig, onTestSmtp,
  isSavingConfig, isTestingSmtp,
  smtpTestStatus
}: EmailConfigSectionProps) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className={s.card}>
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-indigo-500" />
        <h3 className={s.heading}>Configurare E-mail & SMTP</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={s.label}>Email Părinte (destinatar notificări)</label>
          <input
            type="email" value={parentEmailInput}
            onChange={(e) => setParentEmailInput(e.target.value)}
            className={s.input} placeholder="parinte@exemplu.com"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={smtpEnabled}
              onChange={(e) => setSmtpEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
            <span className={`${s.label} mb-0`}>Activează SMTP (email real)</span>
          </label>
        </div>
        {smtpEnabled && (
          <>
            <div>
              <label className={s.label}>Server SMTP</label>
              <input type="text" value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className={s.input} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label className={s.label}>Port</label>
              <input type="number" value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                className={s.input} />
            </div>
            <div>
              <label className={s.label}>Utilizator</label>
              <input type="text" value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className={s.input} placeholder="email@gmail.com" />
            </div>
            <div className="relative">
              <label className={s.label}>Parolă / App Password</label>
              <input type={showPass ? "text" : "password"} value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className={s.input} placeholder="••••••••" />
              <button onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 cursor-pointer">
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)} />
                <span className={`${s.label} mb-0`}>TLS/SSL</span>
              </label>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={onSaveConfig} disabled={isSavingConfig}
          className={s.buttonGreen}>
          <Server className="w-3.5 h-3.5" /> {isSavingConfig ? "Se salvează..." : "Salvează Configurația"}
        </button>
        {smtpEnabled && (
          <button onClick={onTestSmtp} disabled={isTestingSmtp}
            className={s.button}>
            <Send className="w-3.5 h-3.5" /> {isTestingSmtp ? "Test în curs..." : "Testează SMTP"}
          </button>
        )}
      </div>
      {smtpTestStatus && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
          smtpTestStatus.success ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
        }`}>
          {smtpTestStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {smtpTestStatus.message}
        </div>
      )}
    </div>
  );
}
