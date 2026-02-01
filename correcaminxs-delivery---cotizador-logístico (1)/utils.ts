
import { Location, TariffType } from './types';

/**
 * Geocoding using Nominatim (OpenStreetMap)
 */
export const geocodeAddress = async (address: string): Promise<{lat: number, lng: number, display_name: string} | null> => {
  try {
    const query = encodeURIComponent(`${address}, Tandil, Buenos Aires, Argentina`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error("Error geocoding:", error);
    return null;
  }
};

/**
 * Gets real street distance using OSRM
 */
export const getRouteData = async (start: Location, end: Location): Promise<{distanceKm: number, geometry: any} | null> => {
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      return {
        distanceKm: data.routes[0].distance / 1000,
        geometry: data.routes[0].geometry
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
};

/**
 * Detecta si la ruta transita por la Avenida Don Bosco en Tandil.
 */
export const checkPassesDonBosco = (geometry: any): boolean => {
  if (!geometry || !geometry.coordinates) return false;
  
  const donBoscoSegments = [
    { lat: -37.3387, lng: -59.1352 },
    { lat: -37.3410, lng: -59.1378 },
    { lat: -37.3444, lng: -59.1419 },
    { lat: -37.3475, lng: -59.1450 },
    { lat: -37.3501, lng: -59.1477 },
    { lat: -37.3530, lng: -59.1510 },
    { lat: -37.3558, lng: -59.1542 },
    { lat: -37.3590, lng: -59.1578 },
    { lat: -37.3615, lng: -59.1602 }
  ];

  return geometry.coordinates.some((coord: [number, number]) => {
    const [lng, lat] = coord;
    return donBoscoSegments.some(point => {
      const dist = Math.sqrt(Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2));
      return dist < 0.0015; 
    });
  });
};

/**
 * Calcula la distancia Haversine entre dos puntos en km
 */
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Verifica si el destino está en zona especial (Autoclub o La Movediza)
 */
export const checkSpecialZones = (dest: Location): boolean => {
  const zones = [
    { name: "Autoclub", lat: -37.3305, lng: -59.1760 },
    { name: "La Movediza", lat: -37.3094, lng: -59.1668 }
  ];

  return zones.some(zone => getDistanceKm(dest.lat, dest.lng, zone.lat, zone.lng) <= 1.0);
};

/**
 * Estima el tiempo de viaje en minutos
 */
export const estimateTime = (distanceKm: number): number => {
  const speedKmh = 18; 
  const travelTimeMin = (distanceKm / speedKmh) * 60;
  return Math.round(travelTimeMin + 5);
};

/**
 * Calcula el costo del envío basado en distancia, tarifa y surcharges.
 */
export const calculateShippingFee = (oneWayDistanceKm: number, tariff: TariffType, passesDonBosco: boolean, isInSpecialZone: boolean): number => {
  const dist = oneWayDistanceKm;
  const MAX_PRICE = 9000;
  let fee = 0;

  switch (tariff) {
    case 'tarifa1': // TARIFA DOMINGO
      if (dist <= 0.5) {
        fee = 4000;
      } else {
        const extra = dist - 0.5;
        fee = 4000 + Math.ceil(extra / 1.3) * 1000;
      }
      break;

    case 'tarifa2': // TARIFA LLUVIA
      if (dist <= 0.5) {
        fee = 4000;
      } else {
        const extra = dist - 0.5;
        fee = 4000 + Math.ceil(extra / 1.0) * 1000;
      }
      break;

    case 'tarifa3': // TARIFA ESTÁNDAR
      if (dist <= 0.4) {
        fee = 3000;
      } else {
        const extra = dist - 0.4;
        fee = 3000 + Math.ceil(extra / 1.3) * 1000;
      }
      break;
  }

  // Recargo Av. Don Bosco
  if (passesDonBosco) {
    fee += 1000;
  }

  // Recargo Zona Especial (Autoclub / Movediza)
  if (isInSpecialZone) {
    fee += 1000;
  }

  return Math.min(fee, MAX_PRICE);
};
