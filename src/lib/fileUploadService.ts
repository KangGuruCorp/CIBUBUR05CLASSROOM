/**
 * File Upload Service
 * Handles uploading files and Base64 Data URLs to the local Express server.
 * Files are physically saved to `d:\GAMI CLASS\uploads` and served as `/uploads/...`.
 */

export interface UploadResult {
  success: boolean;
  url: string;
  fileName?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
}

/**
 * Upload a Base64 data URL string directly to the server.
 * If the string is already a remote HTTP URL or a relative `/uploads/...` URL, it returns as-is.
 */
export async function uploadDataUrlToServer(
  dataUrl: string,
  fileName?: string,
  folder?: string
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  
  // If it's already an uploaded file URL or external web URL, no need to re-upload
  if (dataUrl.startsWith('/uploads/') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  // If it's a data URL, upload to server
  if (dataUrl.startsWith('data:')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, fileName, folder }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json: UploadResult = await res.json();
        if (json.success && json.url) {
          return json.url;
        }
      }
    } catch (err) {
      console.warn('Failed to upload dataUrl to server, keeping base64 fallback:', err);
    }
  }

  return dataUrl;
}

/**
 * Upload a browser File object to the server.
 */
export async function uploadFileToServer(file: File, folder?: string): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }
      const uploadedUrl = await uploadDataUrlToServer(dataUrl, file.name, folder);
      resolve(uploadedUrl || dataUrl);
    };
    reader.readAsDataURL(file);
  });
}
