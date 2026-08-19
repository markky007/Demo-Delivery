/**
 * Geolocation utility functions for distance calculation and browser GPS retrieval.
 */

/**
 * Calculate distance between two coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format meters to human-readable string (e.g., "45 ม." or "1.2 กม.").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} เมตร`;
  }
  return `${(meters / 1000).toFixed(1)} กิโลเมตร`;
}

export type GeolocationResult =
  | { success: true; latitude: number; longitude: number; accuracy: number }
  | {
      success: false;
      error: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
      message: string;
    };

/**
 * Get device current GPS position using browser Geolocation API.
 */
export function getCurrentPosition(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        error: 'NOT_SUPPORTED',
        message: 'อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errType: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
        let msg = 'ไม่สามารถระบุตำแหน่งของคุณได้';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errType = 'PERMISSION_DENIED';
            msg = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง (GPS) ในเบราว์เซอร์เพื่อยืนยันการสั่งอาหารในร้าน';
            break;
          case error.POSITION_UNAVAILABLE:
            errType = 'POSITION_UNAVAILABLE';
            msg = 'ไม่พบสัญญาณตำแหน่ง GPS ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
            break;
          case error.TIMEOUT:
            errType = 'TIMEOUT';
            msg = 'หมดเวลาในการค้นหาตำแหน่ง GPS กรุณาลองใหม่อีกครั้ง';
            break;
          default:
            errType = 'POSITION_UNAVAILABLE';
        }

        resolve({
          success: false,
          error: errType,
          message: msg,
        });
      },
      options,
    );
  });
}
