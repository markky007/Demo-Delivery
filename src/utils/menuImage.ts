import type { MenuItem } from 'src/types/database';
import { supabase } from 'src/services/supabase';

export function menuThumbnailUrl(item: Pick<MenuItem, 'image_url' | 'thumb_path'>): string | null {
  if (!item.thumb_path) return item.image_url;
  return supabase.storage.from('menu-images').getPublicUrl(item.thumb_path).data.publicUrl;
}
