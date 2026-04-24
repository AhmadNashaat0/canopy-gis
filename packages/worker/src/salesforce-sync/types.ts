import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import * as schema from "@gis-app/db/schema/index";

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type SfToGisLoaderOptions = {
  testMarket?: string;
  minTotalSf?: number;
  saleLookbackMonths?: number;
  geocodeMinConfidence?: number;
  batchSize?: number;
  geocoderProvider?: "google" | "mapbox" | "none";
};

export type SalesforceAuthResponse = {
  access_token: string;
  instance_url: string;
  token_type: string;
  issued_at?: string;
  signature?: string;
};

export type SalesforceQueryResponse<T> = {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
};

export type SfPropertyRecord = {
  Id?: string;
  Name?: string;
  Property_Address__c?: string;
  Market__c?: string;
  Submarket_new__r?: { Name?: string } | null;
  Square_Footage_RBA__c?: number | string | null;
  Average_Suite_Size__c?: number | string | null;
  Avg_Suite_Size_Range__c?: string | null;
  Site_Size_AC__c?: number | string | null;
  Construction_Type__c?: string | null;
  Year_Built__c?: number | string | null;
  Building_Class__c?: string | null;
  Location_Class__c?: string | null;
  Property_Type__c?: string | null;
  IOS_Viable__c?: string | boolean | null;
  Cold_Storage__c?: string | boolean | null;
  Legal_Owner_Name__c?: string | null;
  Last_Sale_Date__c?: string | null;
  Last_Sale_Price__c?: number | string | null;
  Last_Sale_Price_SF__c?: number | string | null;
  Per_Sq_Feet_Valuation__c?: number | string | null;
  LastModifiedDate?: string | null;
  Account?: { Name?: string } | null;
};

export type PropertyRow = {
  propertyId: string;
  propertyName: string | null;
  addressText: string;
  market: string | null;
  submarket: string | null;
  totalSf: number;
  avgSuiteSf: number | null;
  avgSuiteSizeBucket: string | null;
  siteAcres: number | null;
  constructionType: string | null;
  yearBuilt: number | null;
  buildingClass: string | null;
  locationClass: string | null;
  propertyType: string | null;
  iosViable: boolean | null;
  coldStorage: boolean | null;
  trueOwnerName: string | null;
  legalOwnerName: string | null;
  sfLastModified: Date | null;
};

export type SaleEvidenceRow = {
  propertyId: string;
  saleDate: string;
  salePrice: number | null;
  salePricePerSf: number;
  buildingClass: string | null;
  locationClass: string | null;
  suiteSizeBucket: string | null;
};

export type GeocodeResult = {
  lat: number | null;
  lon: number | null;
  confidence: number;
  source: string;
};
