# Product Requirements Document (PRD): Mode Kertas (Paper Mode)

## 1. Ringkasan Eksekutif
**Nama Fitur:** Paper Mode (Penilaian Formatif Tanpa Gawai)
**Proyek Induk:** Gami-Class / Sistem Evaluasi Kang Guru Corp
**Tujuan:** Membangun sistem kuis interaktif di ruang kelas di mana siswa dapat menjawab soal menggunakan kartu cetak berbasis *Fiducial Marker* (ArUco), sementara guru memindai jawaban secara instan menggunakan kamera ponsel atau laptop. Fitur ini mendemokratisasi akses teknologi pendidikan untuk ruang kelas dengan keterbatasan gawai.

## 2. Target Pengguna (Persona)
*   **Guru (Fasilitator):** Membutuhkan cara cepat untuk mengukur pemahaman seluruh kelas tanpa harus memastikan setiap siswa memiliki akses internet atau perangkat keras.
*   **Siswa (Peserta):** Membutuhkan media interaksi yang intuitif (memutar kartu) untuk menjawab pertanyaan pilihan ganda tanpa hambatan teknis.

## 3. Ruang Lingkup & Fitur Utama

| Fitur | Deskripsi | Prioritas |
| :--- | :--- | :--- |
| **Generator Kartu Marker** | Menghasilkan dokumen PDF berisi ID unik (ArUco markers) untuk setiap siswa. Keempat sisi marker diberi label A, B, C, D. | P1 (Wajib) |
| **Impor & Ekstraksi Soal AI** | Modul untuk mengunggah dokumen referensi. Sistem akan mengekstrak seluruh butir soal beserta pilihan jawaban dan kunci jawabannya, lalu mengonversinya ke format JSON array untuk disimpan ke dalam bank soal. | P1 (Wajib) |
| **Layar Proyektor (Presenter View)** | Antarmuka web untuk menampilkan soal aktif, opsi jawaban, dan status *real-time* siswa yang telah berhasil dipindai jawabannya. | P1 (Wajib) |
| **Pemindai Kamera (Scanner View)** | Antarmuka web responsif (diakses via ponsel guru) yang mengaktifkan kamera untuk mendeteksi ID marker dan mengalkulasi sudut rotasi (0°, 90°, 180°, 270°) untuk menentukan opsi jawaban. | P1 (Wajib) |
| **Dasbor Analitik** | Laporan pasca-kuis yang menampilkan akurasi per soal dan performa individual siswa. | P2 (Menengah) |

## 4. Arsitektur Teknis yang Direkomendasikan
Sistem ini dirancang sebagai aplikasi web modern agar guru tidak perlu mengunduh aplikasi *native* dari *app store*.

*   **Infrastruktur & Frontend:** Dibangun menggunakan kerangka kerja JavaScript (misalnya Next.js/React) yang terhubung dengan repositori GitHub. Implementasi CI/CD diatur agar setiap pembaruan kode otomatis di-*deploy* ke **Vercel** untuk menjamin latensi rendah dan skalabilitas tinggi.
*   **Pemrosesan Visi (Kamera):** Menggunakan **OpenCV.js** untuk mendeteksi *contour* dan ID ArUco secara *real-time* melalui `getUserMedia` API langsung di peramban klien.
*   **Database & Sinkronisasi *Real-time*:** Menggunakan **Firebase** (Firestore atau Realtime Database). Saat kamera guru mendeteksi jawaban (misalnya: ID 5, Rotasi 90° = Jawaban B), data langsung dikirim ke Firebase. Layar proyektor yang *subscribe* ke *node* Firebase yang sama akan langsung berkedip hijau tanpa perlu di-muat ulang.
*   **Ekstraksi Soal Berbasis AI:** Mengintegrasikan **Gemini API** (dikonfigurasi melalui Google AI Studio) pada layanan *backend* untuk memproses dokumen acak menjadi JSON array terstruktur saat guru membuat kuis baru.
*   **Observabilitas & Metrik:** Mengimplementasikan **OpenTelemetry** untuk memantau performa dan latensi pemindaian kamera di berbagai perangkat spesifikasi rendah, serta **Google Analytics** untuk melacak retensi pengguna dan frekuensi penggunaan fitur.

## 5. Alur Pengguna (User Flow)

1.  **Persiapan (Pra-Kelas):** 
    *   Guru masuk ke dasbor dan mencetak satu set PDF Kartu Marker.
    *   Guru membuat kuis (bisa otomatis menggunakan ekstraksi dokumen AI) atau memilih kuis yang sudah ada.
2.  **Pelaksanaan:**
    *   Guru membuka *Presenter View* di laptop yang terhubung ke proyektor kelas.
    *   Guru menekan tombol "Mulai Pindai" di ponselnya (mengakses *Scanner View*).
3.  **Interaksi & Pemindaian:**
    *   Soal nomor 1 muncul di layar proyektor.
    *   Siswa mengangkat kartu mereka, memutar sisi A/B/C/D ke arah atas.
    *   Guru menyapukan kamera ponsel ke arah siswa.
    *   Setiap kartu yang terdeteksi akan dikirim ke Firebase. Nama siswa di layar proyektor otomatis berubah warna (menandakan jawaban telah direkam).
4.  **Transisi Soal:** Guru menekan tombol "Lanjut" di ponsel, layar proyektor otomatis berpindah ke soal nomor 2.
5.  **Penyelesaian:** Kuis ditutup, sistem mengalkulasi skor total dan menampilkannya di dasbor guru.

## 6. Persyaratan Data & Skema Kuis (Contoh JSON)
Untuk mendukung transfer data yang efisien antara sistem pembuat soal dan Firebase, struktur *JSON array* harus terstandardisasi. Jika terdapat simbol atau notasi matematika dalam dokumen aslinya, sistem AI akan diinstruksikan untuk membungkusnya dengan standar LaTeX (contoh: `$E = mc^2$`).

```json
[
  {
    "id_soal": "q_001",
    "teks_soal": "Berapakah hasil dari $\\frac{1}{2} + \\frac{1}{4}$?",
    "pilihan": {
      "A": "$\\frac{1}{8}$",
      "B": "$\\frac{2}{4}$",
      "C": "$\\frac{3}{4}$",
      "D": "$1$"
    },
    "kunci_jawaban": "C"
  }
]
```

## 7. Metrik Kesuksesan (KPIs)
*   **Latensi Pemindaian (Time-to-Scan):** Kamera harus mampu memindai dan mengirim 10+ marker secara bersamaan dalam waktu kurang dari $1$ detik per *frame*.
*   **Akurasi Deteksi (Error Rate):** Kesalahan membaca rotasi (misalnya siswa memegang A, terbaca B) harus di bawah $2\%$.
*   **Waktu Muat Sinkronisasi (Sync Latency):** Jeda antara deteksi di ponsel guru hingga indikator nama siswa menyala di proyektor harus di bawah $500$ milidetik.