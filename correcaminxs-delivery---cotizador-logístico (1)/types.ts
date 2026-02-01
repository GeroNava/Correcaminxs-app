
export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export type TariffType = 'tarifa1' | 'tarifa2' | 'tarifa3';
export type DwellingType = 'Casa' | 'Departamento' | 'Desconoce';
export type PaymentMethod = 'cash' | 'transfer';

export interface Quote {
  id: string;
  timestamp: string;
  origin: Location;
  destination: Location;
  clientName: string;
  senderPhone: string;
  recipientPhone: string;
  description: string;
  dwellingType: DwellingType;
  dwellingDetail: string;
  tariffType: TariffType;
  distanceKm: number;
  shippingFee: number;
  estimatedTimeMin: number;
  collectAmount: number;
  paymentType: 'paid' | 'collect_at_dest';
  paymentMethod: PaymentMethod;
  totalToCollect: number;
  passesDonBosco: boolean;
  isInSpecialZone: boolean;
}
