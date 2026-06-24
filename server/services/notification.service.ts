/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Notification Service — email SMTP, notificări
 */

import nodemailer from "nodemailer";
import { getFamilyById } from "./family.service";

// ─── Trimite email părinte (dacă SMTP e configurat) ─────────────────
export async function sendParentEmail(
  familyId: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    const family = await getFamilyById(familyId);
    if (!family || !family.smtp_config?.enabled) {
      console.log(`[NOTIF] Email skipped (SMTP not configured) for family ${familyId}`);
      return false;
    }

    const config = family.smtp_config;
    const transporter = nodemailer.createTransport({
      host: config.host || "smtp.gmail.com",
      port: Number(config.port) || 587,
      secure: config.secure === true,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Arcadia Smart Vacation" <${config.user}>`,
      to: config.parentEmail || config.user,
      subject,
      html: htmlBody,
    });

    console.log(`[NOTIF] Email sent to ${config.user}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`[NOTIF] Email failed:`, err.message);
    return false;
  }
}
