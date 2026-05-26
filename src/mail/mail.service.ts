import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function createTransporter() {
  if (!env.MAIL_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_PORT === 465,
    auth: env.MAIL_USER && env.MAIL_PASS ? { user: env.MAIL_USER, pass: env.MAIL_PASS } : undefined
  });
}

export async function sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
  const verifyUrl = `${env.APP_URL}/api/v1/auth/verify-email?token=${token}`;
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[MAIL] Verification link for ${username} (${email}):\n  ${verifyUrl}`);
    return;
  }

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject: "高科幣平台 — 請驗證您的學校信箱",
    text: `您好 ${username}，\n\n請點擊以下連結完成學校身份驗證（24 小時內有效）：\n\n${verifyUrl}\n\n若您未註冊此帳號，請忽略此封信件。`,
    html: `
      <p>您好 <strong>${username}</strong>，</p>
      <p>請點擊以下連結完成學校身份驗證（24 小時內有效）：</p>
      <p><a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">驗證學校信箱</a></p>
      <p style="color:#6b7280;font-size:12px;">若您未註冊此帳號，請忽略此封信件。</p>
    `
  });
}
