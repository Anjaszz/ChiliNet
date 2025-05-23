// faq-data.js
const faqData = [
    {
        id: 1,
        emoji: "🌶️",
        question: "Bagaimana cara kerja ChiliNet dalam mendeteksi penyakit?",
        answer: "ChiliNet menggunakan teknologi Computer Vision dengan model Convolutional Neural Network (CNN) yang telah dilatih menggunakan ribuan gambar tanaman cabai sehat dan sakit. Sistem kami menganalisis tekstur, warna, bentuk, dan pola pada daun untuk mengidentifikasi jenis penyakit dengan akurasi tinggi. Proses deteksi hanya membutuhkan waktu 2-3 detik per gambar.",
        color: "neon-green"
    },
    {
        id: 2,
        emoji: "📱",
        question: "Apakah ChiliNet bisa digunakan di smartphone?",
        answer: "Ya! ChiliNet dapat diakses melalui browser smartphone Anda. Website kami telah dioptimalkan untuk mobile devices, sehingga Anda bisa mengambil foto langsung menggunakan kamera smartphone dan mendapatkan hasil analisis secara instan. Aplikasi mobile khusus untuk Android dan iOS sedang dalam tahap pengembangan dan akan diluncurkan pada Q3 2025.",
        color: "neon-pink"
    },
    {
        id: 3,
        emoji: "🎯",
        question: "Seberapa akurat hasil deteksi ChiliNet?",
        answer: "Model AI ChiliNet memiliki tingkat akurasi rata-rata 94-96% dalam mendeteksi penyakit utama pada tanaman cabai. Akurasi tertinggi mencapai 98% untuk deteksi Leaf Spot dan Whitefly. Setiap hasil diagnosis disertai dengan confidence score yang menunjukkan tingkat kepercayaan sistem. Untuk hasil terbaik, pastikan foto yang diunggah memiliki pencahayaan yang baik dan fokus yang jelas.",
        color: "neon-blue"
    },
    {
        id: 4,
        emoji: "💰",
        question: "Apakah ChiliNet gratis untuk digunakan?",
        answer: "Ya, ChiliNet sepenuhnya gratis untuk digunakan! Kami berkomitmen untuk membantu petani Indonesia tanpa ada biaya tersembunyi. Fitur deteksi penyakit, analisis real-time, dan rekomendasi perawatan semuanya dapat diakses secara gratis. Jika Anda ingin mendukung pengembangan platform ini, Anda dapat memberikan donasi sukarela melalui QRIS yang tersedia.",
        color: "neon-yellow"
    },
    {
        id: 5,
        emoji: "📸",
        question: "Format gambar apa saja yang didukung?",
        answer: "ChiliNet mendukung berbagai format file populer: JPG, JPEG, PNG, dan WEBP untuk gambar statis. Untuk video, kami mendukung MP4, AVI, dan MOV. Ukuran file maksimal adalah 10MB per upload. Resolusi yang direkomendasikan adalah minimal 800x600 pixel untuk hasil deteksi yang optimal. Anda juga bisa menggunakan fitur kamera real-time langsung dari browser.",
        color: "purple-400"
    },
    {
        id: 6,
        emoji: "🌱",
        question: "Jenis tanaman apa saja yang bisa dianalisis?",
        answer: "Saat ini ChiliNet khusus dikembangkan untuk tanaman cabai (Capsicum annuum) dengan berbagai varietasnya seperti cabai merah, cabai hijau, cabai rawit, dan paprika. Sistem kami dapat mendeteksi 4 kondisi utama: Leaf Spot, Leaf Curl, Whitefly, dan Yellowish. Pengembangan untuk tanaman lain seperti tomat dan terong sedang dalam tahap riset dan akan hadir di masa mendatang.",
        color: "orange-400"
    },
    {
        id: 7,
        emoji: "⚡",
        question: "Bisakah ChiliNet bekerja tanpa koneksi internet?",
        answer: "Saat ini ChiliNet memerlukan koneksi internet untuk melakukan analisis karena pemrosesan dilakukan di server cloud kami. Namun, kami sedang mengembangkan fitur offline detection yang akan tersedia di aplikasi mobile. Fitur ini akan memungkinkan Anda melakukan deteksi dasar tanpa internet, dengan sinkronisasi otomatis ketika koneksi tersedia kembali.",
        color: "teal-400"
    },
    {
        id: 8,
        emoji: "🔒",
        question: "Bagaimana keamanan data dan privasi pengguna?",
        answer: "Privasi Anda adalah prioritas kami. Gambar yang Anda upload hanya digunakan untuk proses analisis dan tidak disimpan secara permanen di server kami. Data akan otomatis terhapus setelah 24 jam. Kami tidak membagikan informasi pribadi atau data tanaman Anda kepada pihak ketiga. Semua komunikasi menggunakan enkripsi HTTPS untuk menjamin keamanan data.",
        color: "pink-400"
    },
    {
        id: 9,
        emoji: "📋",
        question: "Apakah ada panduan perawatan setelah deteksi?",
        answer: "Tentu! Setiap hasil deteksi akan disertai dengan rekomendasi perawatan yang komprehensif, termasuk: metode pengobatan organik dan kimia, jadwal penyemprotan, tips pencegahan, dan cara merawat tanaman agar cepat pulih. Kami juga menyediakan informasi tentang produk pestisida yang aman dan efektif untuk setiap jenis penyakit yang terdeteksi.",
        color: "yellow-300"
    },
    {
        id: 10,
        emoji: "🤝",
        question: "Bagaimana cara menghubungi tim support?",
        answer: "Tim ChiliNet siap membantu Anda! Anda bisa menghubungi kami melalui WhatsApp di +62 822-5804-0148, email ke chilinet.support@gmail.com, atau follow Instagram @ChiliNet untuk update terbaru. Kami juga aktif merespon pertanyaan di media sosial. Tim kami berkomitmen merespon dalam waktu maksimal 24 jam.",
        color: "indigo-400"
    }
];

// Export untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = faqData;
}