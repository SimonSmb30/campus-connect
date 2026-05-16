export type Category = 'Party' | 'Vortrag' | 'Workshop' | 'Angebot' | 'Sport' | 'Ausstellung' | 'Community'

export interface Event {
  id: string
  title: string
  date: string        // ISO date string
  timeStart: string   // HH:MM
  timeEnd: string     // HH:MM
  location: string
  address?: string
  category: Category
  description: string
  imageUrl: string
  likes: number
  comments: number
  bookmarked?: boolean
  liked?: boolean
  hidden?: boolean
  authorName: string
  authorInitials: string
  authorColor: string
}

export interface Comment {
  id: string
  eventId: string
  author: string
  initials: string
  color: string
  text: string
  likes: number
  liked?: boolean
  isOrg?: boolean
  hidden?: boolean
}

export interface User {
  id: string
  name: string
  initials: string
  color: string
  email: string
  blockedPosting: boolean
  blockedCommenting: boolean
}

export const EVENTS: Event[] = [
  {
    id: '1',
    title: 'Semester Opening Party',
    date: '2026-04-19',
    timeStart: '19:00',
    timeEnd: '02:00',
    location: 'Mensa am Park',
    address: 'Schlossplatz 12',
    category: 'Party',
    description: 'Feiert mit uns den Start ins neue Semester! Live DJ, kostenlose Getränke bis 21 Uhr und exklusive Studierenden-Preise die ganze Nacht. Studierendenausweis nicht vergessen!',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80',
    likes: 8,
    comments: 15,
    bookmarked: false,
    authorName: 'Lisa Meier',
    authorInitials: 'LM',
    authorColor: '#6366F1',
  },
  {
    id: '2',
    title: 'Blutspende-Aktion',
    date: '2026-04-22',
    timeStart: '10:00',
    timeEnd: '16:00',
    location: 'Hochschulzentrum',
    category: 'Angebot',
    description: 'Blut spenden und Leben retten! Komm vorbei und hilf Menschen in Not. Alle Blutgruppen werden gesucht. Snacks & Getränke nach der Spende inklusive.',
    imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=400&q=80',
    likes: 7,
    comments: 15,
    bookmarked: true,
    authorName: 'Anna Klein',
    authorInitials: 'AK',
    authorColor: '#10B981',
  },
  {
    id: '3',
    title: 'KI in der Praxis – Gastvortrag Prof. Weber',
    date: '2026-04-23',
    timeStart: '14:00',
    timeEnd: '15:30',
    location: 'Aula A',
    category: 'Vortrag',
    description: 'Prof. Weber von der TU Berlin spricht über den praktischen Einsatz von KI in der modernen Industrie. Ein Pflichttermin für alle, die in der Tech-Branche durchstarten wollen.',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
    likes: 8,
    comments: 9,
    bookmarked: false,
    hidden: true,
    authorName: 'Jonas Weber',
    authorInitials: 'JW',
    authorColor: '#3B82F6',
  },
  {
    id: '4',
    title: 'Campus Fußballturnier',
    date: '2026-04-24',
    timeStart: '16:00',
    timeEnd: '20:00',
    location: 'Sportplatz',
    category: 'Sport',
    description: 'Das jährliche Campus-Fußballturnier! Teams aus allen Fachbereichen treten gegeneinander an. Anmeldung über das Sportreferat bis 20. April.',
    imageUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400&q=80',
    likes: 3,
    comments: 12,
    bookmarked: false,
    authorName: 'Max Schmidt',
    authorInitials: 'MS',
    authorColor: '#F59E0B',
  },
  {
    id: '5',
    title: 'Afterwork Networking Meetup',
    date: '2026-04-25',
    timeStart: '18:00',
    timeEnd: '21:00',
    location: 'Campus Lounge',
    category: 'Community',
    description: 'Knüpfe Kontakte zu anderen Studierenden und Alumni. Entspannte Atmosphäre, Getränke inklusive.',
    imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=80',
    likes: 12,
    comments: 6,
    authorName: 'Sara Müller',
    authorInitials: 'SM',
    authorColor: '#EC4899',
    bookmarked: false,
  },
]

export const COMMENTS: Comment[] = [
  { id: '1', eventId: '1', author: 'Lisa Meier', initials: 'LM', color: '#6366F1', text: 'Ja, ist noch da! Gerade am schwarzen Brett gesehen 👍', likes: 8, liked: false },
  { id: '2', eventId: '1', author: 'Max Schmidt', initials: 'MS', color: '#F59E0B', text: "Gibt's da auch vegetarische Optionen? 🌱", likes: 3, liked: false, hidden: true },
  { id: '3', eventId: '1', author: 'Fachschaft Info', initials: 'FS', color: '#8B5CF6', text: '@Max Klar! Wir haben veganes Fingerfood und Getränke 😊', likes: 12, liked: true, isOrg: true },
  { id: '4', eventId: '1', author: 'Anna Klein', initials: 'AK', color: '#10B981', text: 'War letztes Jahr mega! Kann ich nur empfehlen 🔥', likes: 15, liked: false },
  { id: '5', eventId: '1', author: 'Jonas Weber', initials: 'JW', color: '#3B82F6', text: 'Braucht man eine Anmeldung oder kann man einfach vorbeikommen?', likes: 2, liked: false },
]

export const USERS: User[] = [
  { id: 'u1', name: 'Lisa Meier', initials: 'LM', color: '#6366F1', email: 'lisa.meier@th-mannheim.de', blockedPosting: false, blockedCommenting: false },
  { id: 'u2', name: 'Max Schmidt', initials: 'MS', color: '#F59E0B', email: 'max.schmidt@th-mannheim.de', blockedPosting: false, blockedCommenting: true },
  { id: 'u3', name: 'Anna Klein', initials: 'AK', color: '#10B981', email: 'anna.klein@th-mannheim.de', blockedPosting: false, blockedCommenting: false },
  { id: 'u4', name: 'Jonas Weber', initials: 'JW', color: '#3B82F6', email: 'jonas.weber@th-mannheim.de', blockedPosting: true, blockedCommenting: true },
  { id: 'u5', name: 'Sara Müller', initials: 'SM', color: '#EC4899', email: 'sara.mueller@th-mannheim.de', blockedPosting: false, blockedCommenting: false },
  { id: 'u6', name: 'Tom Bauer', initials: 'TB', color: '#F97316', email: 'tom.bauer@th-mannheim.de', blockedPosting: true, blockedCommenting: false },
]

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string }> = {
  Party:       { bg: '#EDE9FE', text: '#7C3AED' },
  Vortrag:     { bg: '#FEF3C7', text: '#92400E' },
  Workshop:    { bg: '#DBEAFE', text: '#1E40AF' },
  Angebot:     { bg: '#D1FAE5', text: '#065F46' },
  Sport:       { bg: '#FEE2E2', text: '#991B1B' },
  Ausstellung: { bg: '#FCE7F3', text: '#9D174D' },
  Community:   { bg: '#FFEDD5', text: '#C2410C' },
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
}
