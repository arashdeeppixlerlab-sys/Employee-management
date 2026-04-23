export const getDocumentFileIcon = (fileName?: string | null): string => {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'file-pdf-box';
    case 'doc':
    case 'docx':
      return 'file-word';
    case 'xls':
    case 'xlsx':
      return 'file-excel';
    case 'ppt':
    case 'pptx':
      return 'file-powerpoint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return 'file-image';
    case 'txt':
      return 'file-document';
    default:
      return 'file';
  }
};

export const formatDocumentDate = (dateString?: string | null): string => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString();
};
