/**
 * useGeolocation — request device GPS with high accuracy.
 *
 * Returns a function `getLocation()` that resolves to coords or rejects with a
 * human-readable error message. Handles all browser permission states.
 */

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

export type GeoError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED';

export interface GeoResult {
  position: GeoPosition | null;
  error: GeoError | null;
  errorMessage: string | null;
}

const TIMEOUT_MS = 15_000;

export function useGeolocation() {
  const getLocation = (): Promise<GeoResult> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          position: null,
          error: 'NOT_SUPPORTED',
          errorMessage: 'Your browser or device does not support GPS location.',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            position: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
            error: null,
            errorMessage: null,
          });
        },
        (err) => {
          let error: GeoError = 'POSITION_UNAVAILABLE';
          let errorMessage = 'Could not get your location. Please try again.';

          if (err.code === err.PERMISSION_DENIED) {
            error = 'PERMISSION_DENIED';
            errorMessage =
              'Location access was denied. Please allow location access in your browser settings and try again.';
          } else if (err.code === err.TIMEOUT) {
            error = 'TIMEOUT';
            errorMessage = 'Location request timed out. Move to an open area and try again.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            error = 'POSITION_UNAVAILABLE';
            errorMessage = 'Location is unavailable. Make sure GPS is enabled on your device.';
          }

          resolve({ position: null, error, errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: TIMEOUT_MS,
          maximumAge: 0, // Always get a fresh reading
        }
      );
    });
  };

  return { getLocation };
}
