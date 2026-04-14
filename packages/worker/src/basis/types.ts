export type PropertyRow = {
  propertyId: string;
  propertyName: string | null;
  addressText: string | null;
  market: string | null;
  submarket: string | null;
  totalSf: number | null;
  avgSuiteSf: number | null;
  avgSuiteSizeBucket: string | null;
  buildingClass: string | null;
  locationClass: string | null;
  propertyType: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type SalesEvidenceRow = {
  id: bigint;
  propertyId: string;
  saleDate: string | null;
  salePrice: string | null;
  salePricePerSf: string | null;
  buildingClass: string | null;
  locationClass: string | null;
  suiteSizeBucket: string | null;
  dataSource: string;
  confidenceScore: string | null;
  saleAgeMonths: number | null;
  hasValidSale: boolean;
  saleQualityFlag: string;
};

export type SourceEvidenceRow = {
  property: PropertyRow;
  sale: SalesEvidenceRow;
};

export type BasisGridOutput = {
  cellLat: number;
  cellLon: number;
  cellDlat: number;
  cellDlon: number;
  suiteSizeBucket: string;
  buildingClass: string;
  basisPsf: string;
  ess: string;
  confidence: string;
  method: string;
  market: string;
  renderBasisPsf: string;
  renderOpacity: string;
};

export type RunBasisGridOptions = {
  market?: string;
  truncateExistingForMarket?: boolean;
  batchSize?: number;
};
