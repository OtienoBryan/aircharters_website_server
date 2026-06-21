export interface GroupedCharterDeal {
  aircraftTypeId: number;
  aircraftType: string;
  aircraftTypeImageUrl: string;
  route: {
    origin: string;
    destination: string;
    distanceFromUser?: number; // in kilometers
  };
  deals: CharterDealWithRelations[];
}

export interface CharterDealWithRelations {
  id: number;
  companyId: number;
  aircraftId: number;
  date: Date;
  time: string;
  pricePerSeat: number | null;
  discountPerSeat: number;
  availableSeats: number;
  createdAt: Date;
  updatedAt: Date;
  companyName: string;
  companyLogo: string | null;
  originName: string;
  destinationName: string;
  routeImageUrl: string;
  aircraftName: string;
  aircraftType: string;
  aircraftCapacity: number;
  aircraftImages: string[];
  routeImages: string[];
  duration: string;
  amenities: Array<{icon: string, name: string}>;
}

export interface PaginatedGroupedResponse {
  success: boolean;
  data: GroupedCharterDeal[];
  total: number;
  page: number;
  limit: number;
  totalGroups: number;
}
