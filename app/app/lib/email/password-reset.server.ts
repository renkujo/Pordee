const RESEND_EMAILS_URL = "https://api.resend.com/emails";

interface SendPasswordResetEmailInput {
  email: string;
  resetUrl: string;
}

export const isPasswordResetEmailConfigured = () => {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim()
  );
};

export const sendPasswordResetEmail = async ({
  email,
  resetUrl,
}: SendPasswordResetEmailInput) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();

  if (!isPasswordResetEmailConfigured() || !apiKey || !from) {
    throw new Error("Password reset email is not configured.");
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    body: JSON.stringify({
      from,
      to: [email],
      subject: "ตั้งรหัสผ่านใหม่สำหรับพอดี",
      text: [
        "มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีพอดีของคุณ",
        "",
        `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่: ${resetUrl}`,
        "",
        "ลิงก์นี้ใช้ได้เป็นเวลา 1 ชั่วโมง หากคุณไม่ได้ส่งคำขอนี้ ไม่ต้องดำเนินการใด ๆ",
      ].join("\n"),
      html: createPasswordResetHtml(resetUrl),
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    console.error("Resend password reset email failed.", {
      status: response.status,
    });
    throw new Error("Password reset email could not be sent.");
  }
};

const createPasswordResetHtml = (resetUrl: string) => {
  const safeResetUrl = escapeHtml(resetUrl);

  return `
    <div style="background:#f7faf9;padding:32px 16px;font-family:Arial,'Noto Sans Thai',sans-serif;color:#172026">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dde7ec;border-radius:12px;padding:32px">
        <p style="margin:0 0 8px;color:#e9664c;font-size:14px;font-weight:700">พอดี</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.35">ตั้งรหัสผ่านใหม่</h1>
        <p style="margin:0 0 24px;color:#65727a;font-size:15px;line-height:1.7">
          มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ กดปุ่มด้านล่างเพื่อดำเนินการต่อ
        </p>
        <a href="${safeResetUrl}" style="display:inline-block;background:#e9664c;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:15px;font-weight:700">
          ตั้งรหัสผ่านใหม่
        </a>
        <p style="margin:24px 0 0;color:#65727a;font-size:13px;line-height:1.7">
          ลิงก์นี้ใช้ได้เป็นเวลา 1 ชั่วโมง หากคุณไม่ได้ส่งคำขอนี้ ไม่ต้องดำเนินการใด ๆ
        </p>
      </div>
    </div>
  `.trim();
};

const escapeHtml = (value: string) => {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character] ?? character;
  });
};
