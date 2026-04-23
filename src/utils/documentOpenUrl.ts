import { supabase } from '../services/supabase/supabaseClient';

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
      const publicMarker = `/storage/v1/object/public/${bucket}/`;
      const idx = fileUrl.indexOf(publicMarker);
      if (idx !== -1) {
        const objectPath = fileUrl.substring(idx + publicMarker.length);
        if (objectPath) {
          const { data: signedData } = await supabase
            .storage
            .from(bucket)
            .createSignedUrl(objectPath, 60 * 60);
          if (signedData?.signedUrl) return signedData.signedUrl;
        }
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
