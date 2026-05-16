import nodemailer from 'nodemailer'

// Lazy erstellen damit process.env sicher geladen ist
function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

// ── Verifikations-Mail an Studierenden ────────────────────────────────────────
export async function sendStudentVerifyEmail(opts: {
  to: string
  name: string
  verifyUrl: string
}) {
  const { to, name, verifyUrl } = opts

  await getTransporter().sendMail({
    from: `"CampusConnect" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Deine CampusConnect-Registrierung bestätigen',
    text: `Hallo ${name},\n\nbitte bestätige deine E-Mail-Adresse:\n${verifyUrl}\n\nViele Grüße\nDas CampusConnect-Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#F05A1E">CampusConnect</h2>
        <p>Hallo <strong>${name}</strong>,</p>
        <p>bitte bestätige deine E-Mail-Adresse um dein Konto zu aktivieren:</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#F05A1E;color:#fff;padding:12px 24px;
                  border-radius:12px;text-decoration:none;font-weight:600;margin:16px 0">
          E-Mail bestätigen
        </a>
        <hr style="border:none;border-top:1px solid #eee">
        <p style="color:#aaa;font-size:12px">CampusConnect – Dein Campus, deine Community</p>
      </div>
    `,
  })
}

// ── Willkommens-Mail an Admin (Hochschule) ────────────────────────────────────
export async function sendAdminWelcomeEmail(opts: {
  to: string
  name: string
  university: string
  verifyUrl: string
}) {
  const { to, name, university, verifyUrl } = opts

  await getTransporter().sendMail({
    from: `"CampusConnect" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${university} bei CampusConnect registriert`,
    text: `Hallo ${name},\n\n${university} wurde erfolgreich registriert.\n\nBitte bestätige deine E-Mail:\n${verifyUrl}\n\nViele Grüße\nDas CampusConnect-Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#F05A1E">CampusConnect Admin</h2>
        <p>Hallo <strong>${name}</strong>,</p>
        <p><strong>${university}</strong> wurde erfolgreich auf CampusConnect registriert.</p>
        <p>Bitte bestätige deine E-Mail-Adresse:</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#F05A1E;color:#fff;padding:12px 24px;
                  border-radius:12px;text-decoration:none;font-weight:600;margin:16px 0">
          E-Mail bestätigen
        </a>
        <hr style="border:none;border-top:1px solid #eee">
        <p style="color:#aaa;font-size:12px">CampusConnect – Moderation &amp; Community für Hochschulen</p>
      </div>
    `,
  })
}
