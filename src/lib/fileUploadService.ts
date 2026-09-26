export interface UploadResult {
  success: boolean;
  url: string;
  fileName?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
}

export async function uploadDataUrlToServer(
  dataUrl: string,
  fileName?: string,
  folder?: string
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (dataUrl.startsWith('/uploads/') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }
  return dataUrl; // Vercel mode: we keep the Base64 to store in Postgres JSONB directly
}

/**
 * Kompres gambar menggunakan HTML5 Canvas sebelum dikonversi ke Base64.
 * Ini SANGAT MENGHEMAT kuota database Supabase (menurunkan ukuran foto dari 5MB menjadi ~100KB)
 */
async function compressImageFile(file: File, maxWidth = 1000): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Kalkulasi aspek rasio agar tidak pecah tapi ukuran mengecil
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Kompres kualitas jadi 70% berformat JPEG/WebP (sangat hemat)
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadFileToServer(file: File, folder?: string): Promise<string> {
  // Jika file adalah gambar, kompres terlebih dahulu!
  if (file.type.startsWith('image/')) {
    const compressedBase64 = await compressImageFile(file, folder === 'avatars' ? 300 : 1000);
    return await uploadDataUrlToServer(compressedBase64, file.name, folder);
  }

  // Jika bukan gambar (misal PDF/Doc), ubah langsung ke Base64 biasa
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return resolve('');
      const uploadedUrl = await uploadDataUrlToServer(dataUrl, file.name, folder);
      resolve(uploadedUrl || dataUrl);
    };
    reader.readAsDataURL(file);
  });
}
