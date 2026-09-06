export const STANDARD_SUBJECTS = [
  'PAI',
  'PAK',
  'Pendidikan Pancasila',
  'B. Indonesia',
  'Matematika',
  'IPAS',
  'Seni Budaya',
  'PLBJ',
  'Bahasa Inggris',
  'KKA',
  'Lainnya',
] as const;

export type StandardSubject = (typeof STANDARD_SUBJECTS)[number];

export interface SubjectTemplateConfig {
  subject: StandardSubject;
  label: string;
  fullName: string;
  description: string;
  defaultImage: string;
  presetImages: {
    title: string;
    url: string;
  }[];
  color: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  };
}

export const SUBJECT_CONFIGS: Record<StandardSubject, SubjectTemplateConfig> = {
  PAI: {
    subject: 'PAI',
    label: 'PAI',
    fullName: 'Pendidikan Agama Islam',
    description: 'Akidah, Akhlak, Fiqih, Al-Qur\'an Hadits & Tarikh Islam',
    defaultImage:
      'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Kubah & Menara Masjid',
        url: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Al-Qur\'an & Rekal Kayu',
        url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Arsitektur Kaligrafi Islam',
        url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800',
    },
  },
  PAK: {
    subject: 'PAK',
    label: 'PAK',
    fullName: 'Pendidikan Agama Kristen & Katolik',
    description: 'Nilai Kristiani, Alkitab, Kasih, & Keteladanan Hidup',
    defaultImage:
      'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Alkitab Terbuka & Cahaya Hangat',
        url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Kaca Patri Gereja & Cahaya Rohani',
        url: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Lilin & Kitab Suci',
        url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200',
      badgeBg: 'bg-sky-100 text-sky-800',
    },
  },
  'Pendidikan Pancasila': {
    subject: 'Pendidikan Pancasila',
    label: 'Pendidikan Pancasila',
    fullName: 'Pendidikan Pancasila & Kewarganegaraan',
    description: 'Pancasila, UUD 1945, NKRI, Bhinneka Tunggal Ika, & Hak Kewajiban',
    defaultImage:
      'https://images.unsplash.com/photo-1596405835955-467dbb113702?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Bendera Merah Putih Indonesia',
        url: 'https://images.unsplash.com/photo-1596405835955-467dbb113702?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Monumen Nasional (Monas)',
        url: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Simbol Keberagaman & Nusantara',
        url: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-800',
    },
  },
  'B. Indonesia': {
    subject: 'B. Indonesia',
    label: 'B. Indonesia',
    fullName: 'Bahasa Indonesia',
    description: 'Membaca, Menulis, Teks Eksplanasi, Puisi, & Tata Bahasa',
    defaultImage:
      'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Halaman Buku Sastra & Membaca',
        url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Koleksi Buku di Perpustakaan',
        url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Menulis Jurnal & Pena Klasik',
        url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-800',
    },
  },
  Matematika: {
    subject: 'Matematika',
    label: 'Matematika',
    fullName: 'Matematika',
    description: 'Pecahan, Aljabar, Geometri, Pengukuran, & Statistik Data',
    defaultImage:
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Papan Tulis Rumus & Geometri',
        url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Persamaan & Angka Matematika',
        url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Penggaris Segitiga, Jangka, & Sketsa',
        url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      badgeBg: 'bg-indigo-100 text-indigo-800',
    },
  },
  IPAS: {
    subject: 'IPAS',
    label: 'IPAS',
    fullName: 'Ilmu Pengetahuan Alam & Sosial',
    description: 'Sains, Tata Surya, Ekosistem, Tubuh Manusia, & Geografi Sosial',
    defaultImage:
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Laboratorium Sains & Tabung Reaksi',
        url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Bumi, Alam Semesta, & Tata Surya',
        url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Tumbuhan Hijau & Ekosistem Alam',
        url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      badgeBg: 'bg-teal-100 text-teal-800',
    },
  },
  'Seni Budaya': {
    subject: 'Seni Budaya',
    label: 'Seni Budaya',
    fullName: 'Seni Budaya & Prakarya',
    description: 'Seni Rupa, Musik, Tari, Teater, & Kerajinan Tangan Kreatif',
    defaultImage:
      'https://images.unsplash.com/photo-1460661419200-fd4357a0bcde?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Palet Cat & Kuas Lukis Seniman',
        url: 'https://images.unsplash.com/photo-1460661419200-fd4357a0bcde?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Percikan Cat Air Penuh Warna',
        url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Kanvas Seni Lukis Klasik',
        url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
    },
  },
  PLBJ: {
    subject: 'PLBJ',
    label: 'PLBJ',
    fullName: 'Pendidikan Lingkungan & Budaya Jakarta',
    description: 'Budaya Betawi, Kesenian Ondel-ondel, Wisata Sejarah, & Lingkungan Jakarta',
    defaultImage:
      'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Ikon Monas & Kota Jakarta',
        url: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Lansekap Perkotaan & Budaya Jakarta',
        url: 'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Taman Kota & Lingkungan Hijau',
        url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-800',
    },
  },
  'Bahasa Inggris': {
    subject: 'Bahasa Inggris',
    label: 'Bahasa Inggris',
    fullName: 'Bahasa Inggris (English)',
    description: 'Vocabulary, Grammar, Reading Comprehension, Listening, & Conversation',
    defaultImage:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Bus Merah London & Landmark Inggris',
        url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Balok Huruf Alfabet ABC',
        url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Globe Dunia & Bahasa Internasional',
        url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-800',
    },
  },
  KKA: {
    subject: 'KKA',
    label: 'KKA',
    fullName: 'Koding & Kecerdasan Artifisial',
    description: 'Pemrograman Komputer, Algoritma, Logika Berpikir, & Teknologi AI Modern',
    defaultImage:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Layar Koding & Baris Pemrograman',
        url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Robot & Kecerdasan Artifisial (AI)',
        url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Syntax Program & Perangkat Lunak',
        url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      border: 'border-cyan-200',
      badgeBg: 'bg-cyan-100 text-cyan-800',
    },
  },
  Lainnya: {
    subject: 'Lainnya',
    label: 'Lainnya',
    fullName: 'Mata Pelajaran Lainnya',
    description: 'Muatan Lokal, Literasi Khusus, Bimbingan Konseling, & Materi Tambahan',
    defaultImage:
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
    presetImages: [
      {
        title: 'Tumpukan Buku Pembelajaran Berwarna',
        url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Meja Belajar, Buku Catatan, & Pena',
        url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
      },
      {
        title: 'Ruang Belajar & Buku Referensi',
        url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
      },
    ],
    color: {
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      border: 'border-slate-200',
      badgeBg: 'bg-slate-100 text-slate-700',
    },
  },
};

/**
 * Normalizes any free-form subject string into one of the 11 Standard Subjects
 */
export function matchSubjectToStandard(rawSubject?: string): StandardSubject {
  if (!rawSubject) return 'Lainnya';
  const clean = rawSubject.trim().toLowerCase();

  if (clean === 'pai' || clean.includes('agama islam') || clean.includes('islam')) {
    return 'PAI';
  }
  if (clean === 'pak' || clean.includes('agama kristen') || clean.includes('katolik') || clean.includes('kristen')) {
    return 'PAK';
  }
  if (clean.includes('pancasila') || clean.includes('ppkn') || clean.includes('kewarganegaraan')) {
    return 'Pendidikan Pancasila';
  }
  if (clean.includes('indonesia') || clean === 'b. indonesia' || clean === 'b.indo' || clean === 'bahasa indonesia') {
    return 'B. Indonesia';
  }
  if (clean.includes('matematika') || clean === 'mtk' || clean.includes('math')) {
    return 'Matematika';
  }
  if (clean.includes('ipas') || clean.includes('ipa') || clean.includes('ips') || clean.includes('sains') || clean.includes('alam')) {
    return 'IPAS';
  }
  if (clean.includes('seni') || clean.includes('budaya') || clean.includes('prakarya') || clean.includes('sbk') || clean.includes('sbdp')) {
    return 'Seni Budaya';
  }
  if (clean.includes('plbj') || clean.includes('jakarta') || clean.includes('betawi')) {
    return 'PLBJ';
  }
  if (clean.includes('inggris') || clean.includes('english')) {
    return 'Bahasa Inggris';
  }
  if (clean.includes('kka') || clean.includes('koding') || clean.includes('coding') || clean.includes('kecerdasan') || clean.includes('artifisial') || clean.includes('ai') || clean.includes('komputer') || clean.includes('informatika')) {
    return 'KKA';
  }

  return 'Lainnya';
}

/**
 * Returns a fitting template image for a given subject.
 * If a customCoverUrl is already provided, it will return it.
 */
export function getSubjectTemplateImage(subjectName?: string, customCoverUrl?: string): string {
  if (customCoverUrl && customCoverUrl.trim()) {
    return customCoverUrl.trim();
  }
  const matched = matchSubjectToStandard(subjectName);
  return SUBJECT_CONFIGS[matched]?.defaultImage || SUBJECT_CONFIGS.Lainnya.defaultImage;
}

/**
 * Returns the theme colors configuration for a subject
 */
export function getSubjectTheme(subjectName?: string) {
  const matched = matchSubjectToStandard(subjectName);
  return SUBJECT_CONFIGS[matched]?.color || SUBJECT_CONFIGS.Lainnya.color;
}
