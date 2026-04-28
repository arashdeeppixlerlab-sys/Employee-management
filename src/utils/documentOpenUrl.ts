import { supabase } from '../services/supabase/supabaseClient';

const extractObjectPathFromStorageUrl = (fileUrl: string, bucket: string): string | null => {
  const baseUrl = fileUrl.split('?')[0];
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
  ];

  for (const marker of markers) {
    const idx = baseUrl.indexOf(marker);
    if (idx !== -1) {
      const objectPath = baseUrl.substring(idx + marker.length);
      return objectPath ? decodeURIComponent(objectPath) : null;
    }
  }

  return null;
};

export const resolveDocumentOpenUrl = async (
  document: Record<string, any>,
): Promise<string | null> => {
  const bucket = 'documents';
  const fileUrl: string | undefined = document?.file_url;
  const legacyFilePath: string | undefined =
    document?.file_path || document?.filePath || document?.path;

  if (typeof fileUrl === 'string' && fileUrl.length > 0) {
    const isHttp = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
    if (isHttp) {
      const objectPath = extractObjectPathFromStorageUrl(fileUrl, bucket);
      if (objectPath) {
        const { data: signedData } = await supabase
          .storage
          .from(bucket)
          .createSignedUrl(objectPath, 60 * 60);
        if (signedData?.signedUrl) return signedData.signedUrl;
      }
      return fileUrl;
    }

    const objectPath = fileUrl.startsWith(`${bucket}/`) ? fileUrl.slice(bucket.length + 1) : fileUrl;
    if (objectPath) {
      const { data: signedData } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(objectPath, 60 * 60);
      if (signedData?.signedUrl) return signedData.signedUrl;
    }
  }

  if (typeof legacyFilePath === 'string' && legacyFilePath.length > 0) {
    const { data: signedData } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(legacyFilePath, 60 * 60);
    if (signedData?.signedUrl) return signedData.signedUrl;
  }

  return null;
};
