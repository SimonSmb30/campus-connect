// E-Mail Template für Studenten-Verifizierung
export default function StudentMail({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return (
    <div>
      <h1>Willkommen bei CampusConnect, {name}!</h1>
      <p>Bitte bestätige deine E-Mail-Adresse:</p>
      <a href={verifyUrl}>E-Mail bestätigen</a>
    </div>
  )
}
