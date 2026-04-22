import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { supabase } from './supabase/supabaseClient';

const BUCKET = 'profile-photos';

const getFileExtension = (fileName?: string, mimeType?: string) => {
  const nameExt = fileName?.split('.').pop()?.toLowerCase();
  if (nameExt) return nameExt;
  const mimeExt = mimeType?.split('/').pop()?.toLowerCase();
  return mimeExt || 'jpg';
};

const getStoragePathFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
};

const uploadToStorage = async (uri: string, storagePath: string, contentType: string) => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return supabase.storage.from(BUCKET).upload(storagePath, blob, {
      contentType,
      upsert: true,
    });
  }

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: storagePath.split('/').pop() || 'profile.jpg',
    type: contentType,
  } as any);

  return supabase.storage.from(BUCKET).upload(storagePath, formData, {
    contentType,
    upsert: true,
  });
};

export const ProfilePhotoService = {
  async pickImage() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0];
  },

  async uploadProfilePhoto(userId: string, currentPhotoUrl?: string | null) {
    const asset = await this.pickImage();
    if (!asset) return { success: false, error: 'Image selection cancelled' };

    const extension = getFileExtension(asset.name, asset.mimeType);
    const fileName = `${Date.now()}.${extension}`;
    const storagePath = `${userId}/${fileName}`;
    const contentType = asset.mimeType || 'image/jpeg';

    const { error: uploadError } = await uploadToStorage(asset.uri, storagePath, contentType);
    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const newPhotoUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_photo_url: newPhotoUrl })
      .eq('id', userId);

    if (updateError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return { success: false, error: updateError.message };
    }

    const oldPath = getStoragePathFromUrl(currentPhotoUrl);
    if (oldPath && oldPath !== storagePath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }

    return { success: true, photoUrl: newPhotoUrl };
  },

  async removeProfilePhoto(userId: string, currentPhotoUrl?: string | null) {
    const oldPath = getStoragePathFromUrl(currentPhotoUrl);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_photo_url: null })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }

    return { success: true };
  },
};
