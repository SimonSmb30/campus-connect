// E-Mail Template für Admin-Verifizierung
export default function AdminMail({ contactName, verifyUrl }: { contactName: string; verifyUrl: string }) {
  return (
    <div>
      <h1>Willkommen bei CampusConnect, {contactName}!</h1>
      <p>Bitte bestätige deine Hochschul-E-Mail-Adresse:</p>
      <a href={verifyUrl}>E-Mail bestätigen</a>
      <p>Nach der Bestätigung kannst du deine Hochschule registrieren.</p>
    </div>
  )
}
