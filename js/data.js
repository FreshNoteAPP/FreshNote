export const categories = [
  { key: 'fresh', label: 'Kategori Bahan-Bahan Segar', shortLabel: 'Bahan Segar', icon: '🌿' },
  { key: 'food', label: 'Kategori Bahan Makanan & Minuman', shortLabel: 'Makanan & Minuman', icon: '🍗' },
  { key: 'promo', label: 'Promosi Minggu Ini', shortLabel: 'Promo', icon: '🔥' },
];

export const freshItems = [
  { id: 'fresh-1', name: 'Mentimun', shelfLife: '4–5 hari', desc: 'Sayuran segar untuk lalapan, salad, dan jus sehat.', icon: '🥒' },
  { id: 'fresh-2', name: 'Terong', shelfLife: '5–7 hari', desc: 'Cocok untuk tumis dan berbagai menu rumahan.', icon: '🍆' },
  { id: 'fresh-3', name: 'Kangkung', shelfLife: '1–3 hari', desc: 'Cepat diolah, cocok untuk tumis dan sayur bening.', icon: '🥬' },
  { id: 'fresh-4', name: 'Sawi Putih', shelfLife: '3–4 hari', desc: 'Pas untuk sup, capcay, dan mie kuah.', icon: '🥗' },
  { id: 'fresh-5', name: 'Bayam', shelfLife: '1–2 hari', desc: 'Sayuran hijau kaya nutrisi untuk menu harian.', icon: '🍃' },
  { id: 'fresh-6', name: 'Tomat', shelfLife: '4–6 hari', desc: 'Bisa untuk sambal, sayur, dan minuman segar.', icon: '🍅' },
  { id: 'fresh-7', name: 'Bawang Merah', shelfLife: '7–10 hari', desc: 'Bumbu dapur wajib untuk hampir semua masakan.', icon: '🧅' },
  { id: 'fresh-8', name: 'Bawang Putih', shelfLife: '7–10 hari', desc: 'Penyedap rasa yang sering dipakai setiap hari.', icon: '🧄' },
  { id: 'fresh-9', name: 'Jagung Manis', shelfLife: '4–5 hari', desc: 'Sangat enak untuk direbus atau ditumis.', icon: '🌽' },
  { id: 'fresh-10', name: 'Pepaya', shelfLife: '3–5 hari', desc: 'Buah segar untuk sarapan dan jus.', icon: '🍈' },
];

export const foodItems = [
  { id: 'food-1', name: 'Ayam', shelfLife: '5–7 hari', desc: 'Bahan utama untuk lauk harian dan menu praktis.', icon: '🍗' },
  { id: 'food-2', name: 'Ikan', shelfLife: '3–5 hari', desc: 'Cocok untuk digoreng, dibakar, atau dikukus.', icon: '🐟' },
  { id: 'food-3', name: 'Daging', shelfLife: '3–5 hari', desc: 'Bisa diolah menjadi sup, tumis, atau steak.', icon: '🥩' },
  { id: 'food-4', name: 'Udang', shelfLife: '2–3 hari', desc: 'Lezat untuk olahan seafood atau saus pedas.', icon: '🦐' },
  { id: 'food-5', name: 'Telur', shelfLife: '7–14 hari', desc: 'Serbaguna untuk sarapan, lauk, maupun cemilan.', icon: '🥚' },
  { id: 'food-6', name: 'Tahu', shelfLife: '3–5 hari', desc: 'Murah, sehat, dan mudah diolah.', icon: '⬜' },
  { id: 'food-7', name: 'Tempe', shelfLife: '3–5 hari', desc: 'Protein nabati favorit untuk menu rumahan.', icon: '🟫' },
  { id: 'food-8', name: 'Roti Tawar', shelfLife: '5–7 hari', desc: 'Cocok untuk sarapan dan bekal cepat.', icon: '🍞' },
  { id: 'food-9', name: 'Susu', shelfLife: '5–7 hari', desc: 'Minuman praktis untuk keluarga.', icon: '🥛' },
  { id: 'food-10', name: 'Keju', shelfLife: '7–14 hari', desc: 'Pelengkap menu makanan dan camilan.', icon: '🧀' },
];

export const promoItems = [
  {
    id: 'promo-1',
    title: 'Weekend Sale',
    subtitle: 'Belanja Sekarang!',
    badge: 'UP TO 50% OFF',
    image: '/assets/promo1.png',
    cta: 'Lihat Promo'
  },
  {
    id: 'promo-2',
    title: 'Khusus Bahan Segar',
    subtitle: 'Diskon hari ini',
    badge: 'SPECIAL OFFER',
    image: '/assets/promo1.png',
    cta: 'Buka'
  },
  {
    id: 'promo-3',
    title: 'Belanja Hemat',
    subtitle: 'Stok terbatas',
    badge: 'NEW DEAL',
    image: '/assets/promo1.png',
    cta: 'Cek'
  },
];

export const quickActions = [
  { id: 'qa-1', label: 'Belanja Xpress', icon: '🚚' },
  { id: 'qa-2', label: 'Area Unmul', icon: '📍' },
];

export const profileMenus = [
  { section: 'Preferensi', items: ['Keamanan akun', 'Pusat notifikasi', 'Bahasa'] },
  { section: 'Aplikasi', items: ['Bantuan & saran', 'Kebijakan privasi', 'Beri rating'] },
];
