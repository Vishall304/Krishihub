import type { ChatMessage } from '../types'

export type FeedItemKind =
  | 'news'
  | 'scheme'
  | 'tips'
  | 'market'
  | 'weather'
  | 'irrigation'
  | 'fertilizer'
  | 'pest'
  | 'community'
  | 'disease'

export type FeedItem = {
  id: string
  kind: FeedItemKind
  title: string
  description: string
  author: string
  authorHandle: string
  authorInitials: string
  location: string
  avatarUrl: string
  imageUrl: string
  timeAgo: string
  meta?: string
  likes: number
  comments: number
  IconKey:
    | 'newspaper'
    | 'buildingLibrary'
    | 'lightBulb'
    | 'trendingUp'
    | 'cloudRain'
    | 'droplet'
    | 'sprout'
    | 'bug'
    | 'users'
    | 'stethoscope'
  gradient: string // tailwind gradient for the hero card background
}

export const feedItems: FeedItem[] = [
  {
    id: 'f1',
    kind: 'weather',
    title: 'Storm warning for western Maharashtra fields',
    description:
      'Heavy clouds expected overnight. Cover raised beds and secure open grain stores to avoid water damage.',
    author: 'IMD Advisory',
    authorHandle: '@imd_pune',
    authorInitials: 'IM',
    location: 'Pune region',
    avatarUrl:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '12 min ago',
    meta: 'Official advisory',
    likes: 182,
    comments: 14,
    IconKey: 'cloudRain',
    gradient: 'from-sky-400 via-sky-500 to-blue-600',
  },
  {
    id: 'f2',
    kind: 'market',
    title: 'Tomato mandi price up 8% this week — ₹28/kg at Pune APMC',
    description:
      'Onion steady at ₹18/kg, potato softening. Consider staggered selling over 3 days for better realisation.',
    author: 'AgMarknet',
    authorHandle: '@mandi_bhav',
    authorInitials: 'AM',
    location: 'Pune APMC',
    avatarUrl:
      'https://images.unsplash.com/photo-1524594154905-5f6a9d1b056f?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1515150144380-bca1f3a3c1f5?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '35 min ago',
    meta: 'Daily market',
    likes: 95,
    comments: 9,
    IconKey: 'trendingUp',
    gradient: 'from-emerald-400 via-emerald-500 to-teal-600',
  },
  {
    id: 'f3',
    kind: 'scheme',
    title: 'PMFBY enrolment closes in 9 days — auto-debit for KCC holders',
    description:
      'Premium deducted automatically unless you opt out at your bank. Check Aadhaar ↔ bank linkage before the deadline.',
    author: 'Govt of India',
    authorHandle: '@pmfby_official',
    authorInitials: 'GI',
    location: 'Nationwide',
    avatarUrl:
      'https://images.unsplash.com/photo-1517445312888-7a3cbe923ef9?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1517445312888-7a3cbe923ef9?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '2 hr ago',
    meta: 'Deadline soon',
    likes: 241,
    comments: 38,
    IconKey: 'buildingLibrary',
    gradient: 'from-violet-400 via-purple-500 to-indigo-600',
  },
  {
    id: 'f4',
    kind: 'community',
    title: 'Ramesh from Baramati shared his drip setup savings',
    description:
      '"Switched to drip 6 months ago — water use down 38%, yield up 12% on my 2-acre tomato plot. Happy to share photos."',
    author: 'Ramesh Pawar',
    authorHandle: '@ramesh_farms',
    authorInitials: 'RP',
    location: 'Baramati, MH',
    avatarUrl:
      'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '3 hr ago',
    meta: 'Community story',
    likes: 412,
    comments: 67,
    IconKey: 'users',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
  },
  {
    id: 'f5',
    kind: 'fertilizer',
    title: 'NPK top-dressing — split urea for wheat at tillering',
    description:
      '50 % at crown root initiation, 50 % at tillering. Apply right before irrigation to minimise volatile loss.',
    author: 'KVK Baramati',
    authorHandle: '@kvk_baramati',
    authorInitials: 'KB',
    location: 'Baramati, MH',
    avatarUrl:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '5 hr ago',
    meta: 'Agronomy tip',
    likes: 76,
    comments: 5,
    IconKey: 'sprout',
    gradient: 'from-lime-400 via-green-500 to-emerald-600',
  },
  {
    id: 'f6',
    kind: 'disease',
    title: 'Tomato early blight alert — humid spell ahead',
    description:
      'Scout lower leaves for brown concentric rings. Copper oxychloride 3 g/L as preventive; repeat after 10 days.',
    author: 'ICAR Pune',
    authorHandle: '@icar_pune',
    authorInitials: 'IC',
    location: 'Pune district',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '6 hr ago',
    meta: 'Disease watch',
    likes: 118,
    comments: 21,
    IconKey: 'stethoscope',
    gradient: 'from-red-400 via-rose-500 to-pink-600',
  },
  {
    id: 'f7',
    kind: 'irrigation',
    title: 'Drip water-saving tip for the dry spell',
    description:
      'Run drip early morning (5–7 AM) and late evening. Cut run-time by 15 % if soil moisture stays above 60 % FC.',
    author: 'KrishiMitra Tips',
    authorHandle: '@krishimitra',
    authorInitials: 'KM',
    location: 'Ahmednagar, MH',
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1499397216897-1e9eff52b57b?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '8 hr ago',
    meta: 'Water-saving',
    likes: 53,
    comments: 3,
    IconKey: 'droplet',
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
  },
  {
    id: 'f8',
    kind: 'pest',
    title: 'Whitefly watch for cotton bolls — 6 flies/leaf threshold',
    description:
      'Scout 20 plants per acre. Above threshold, spray neem oil 3 ml/L in the evening. Rotate chemistries every 10 days.',
    author: 'Cotton Research Pune',
    authorHandle: '@crip',
    authorInitials: 'CR',
    location: 'Vidarbha belt',
    avatarUrl:
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1516022751332-0ca15fae07bf?auto=format&fit=crop&w=1200&q=80',
    timeAgo: 'Yesterday',
    meta: 'Pest advisory',
    likes: 88,
    comments: 11,
    IconKey: 'bug',
    gradient: 'from-orange-400 via-amber-500 to-yellow-600',
  },
  {
    id: 'f9',
    kind: 'news',
    title: 'Monsoon outlook positive for kharif sowing',
    description:
      'Regional advisory suggests timely rains over soybean and cotton belts for the next fortnight. Prepare seedbed now.',
    author: 'Krishi Jagran',
    authorHandle: '@krishijagran',
    authorInitials: 'KJ',
    location: 'Maharashtra',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
    timeAgo: 'Yesterday',
    meta: 'Farming news',
    likes: 134,
    comments: 17,
    IconKey: 'newspaper',
    gradient: 'from-teal-400 via-teal-500 to-emerald-600',
  },
  {
    id: 'f10',
    kind: 'scheme',
    title: 'PM-KISAN installment window is open',
    description:
      'Verify land records via the nearest CSC or the official portal. Aadhaar–bank linking must match exactly.',
    author: 'Govt of India',
    authorHandle: '@pmkisan',
    authorInitials: 'PK',
    location: 'Kerala & Maharashtra',
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1498842812179-c81beecf902c?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '2 d ago',
    meta: 'Government',
    likes: 206,
    comments: 42,
    IconKey: 'buildingLibrary',
    gradient: 'from-fuchsia-400 via-purple-500 to-indigo-600',
  },
  {
    id: 'f11',
    kind: 'community',
    title: 'FPO hosting free soil-testing camp Saturday',
    description:
      'Bring 500 g soil collected from 5 diagonal points of your field at 0–15 cm depth. Slot reservation open on WhatsApp.',
    author: 'Baramati FPO',
    authorHandle: '@baramati_fpo',
    authorInitials: 'BF',
    location: 'Baramati',
    avatarUrl:
      'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1491380661544-5cc29cf13949?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '2 d ago',
    meta: 'Community event',
    likes: 301,
    comments: 54,
    IconKey: 'users',
    gradient: 'from-emerald-400 via-green-500 to-lime-600',
  },
  {
    id: 'f12',
    kind: 'tips',
    title: 'Intercropping idea: pigeonpea + soybean (2:4 row ratio)',
    description:
      'Improves nitrogen fixation, reduces pest pressure. 30 × 10 cm spacing and rhizobium seed treatment recommended.',
    author: 'KrishiMitra Tips',
    authorHandle: '@krishimitra',
    authorInitials: 'KM',
    location: 'Soybean belt',
    avatarUrl:
      'https://images.unsplash.com/photo-1562158070-2d5b0eeab832?auto=format&fit=crop&w=120&q=80',
    imageUrl:
      'https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=1200&q=80',
    timeAgo: '3 d ago',
    meta: 'Agronomy',
    likes: 44,
    comments: 2,
    IconKey: 'lightBulb',
    gradient: 'from-green-400 via-emerald-500 to-teal-600',
  },
]

export const sampleChatSeed: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    lang: 'English',
    text: 'Namaste! I am KrishiMitra AI. Ask about pests, fertilizer doses, sowing dates, or crop prices.',
  },
]

export const trackerActivitiesSeed = [
  { id: 'a1', title: 'Irrigation done', date: '2026-04-17', status: 'done' as const },
  { id: 'a2', title: 'Fertilizer added', date: '2026-04-14', status: 'done' as const },
  { id: 'a3', title: 'Spray completed', date: '2026-04-19', status: 'pending' as const },
]

export const upcomingRemindersSeed = [
  { id: 'r1', label: 'Check drip lines — Field B', when: 'Today, 5:00 PM' },
  { id: 'r2', label: 'Soil moisture reading', when: 'Tomorrow, 7:30 AM' },
]

export const weatherSnapshot = {
  place: 'Pune Region',
  tempC: 32,
  condition: 'Partly cloudy',
  humidity: 58,
  rainChance: 30,
}
