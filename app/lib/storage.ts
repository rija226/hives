import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickImages(): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map(a => a.uri);
}

export async function uploadPhoto(localUri: string, hiveId: string): Promise<string> {
  const ext = localUri.split('.').pop() ?? 'jpg';
  const filename = `${hiveId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('hive-photos')
    .upload(filename, blob, { contentType: blob.type || 'image/jpeg' });

  if (error) throw error;

  return supabase.storage.from('hive-photos').getPublicUrl(filename).data.publicUrl;
}

export async function uploadAll(uris: string[], hiveId: string): Promise<string[]> {
  return Promise.all(uris.map(uri => uploadPhoto(uri, hiveId)));
}
