/**
 * Restaurant service — Supabase operations for restaurant profile & location/geofencing.
 */
import { supabase } from './supabase';
import type { Restaurant } from 'src/types/database';

/**
 * Fetch the active restaurant details (single restaurant instance).
 */
export async function fetchRestaurant(): Promise<Restaurant | null> {
  const { data, error } = await supabase.from('restaurants').select('*').limit(1).maybeSingle();

  if (error) throw new Error(error.message);
  return data as Restaurant | null;
}

/**
 * Update restaurant location & geofencing configuration.
 */
export async function updateRestaurantLocation(
  restaurantId: string,
  config: {
    latitude: number | null;
    longitude: number | null;
    geofence_radius_meters: number;
    is_geofence_enabled: boolean;
  },
): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .update({
      latitude: config.latitude,
      longitude: config.longitude,
      geofence_radius_meters: config.geofence_radius_meters,
      is_geofence_enabled: config.is_geofence_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', restaurantId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Restaurant;
}
