import {
  pgTable,
  index,
  text,
  doublePrecision,
  integer,
  date,
  timestamp,
  bigserial,
  foreignKey,
  numeric,
  geometry,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

export const gisProperties = pgTable(
  "gis_properties",
  {
    propertyId: text("property_id").primaryKey().notNull(),
    propertyName: text("property_name"),
    addressText: text("address_text"),
    market: text(),
    submarket: text(),
    totalSf: integer("total_sf"),
    avgSuiteSf: integer("avg_suite_sf"),
    avgSuiteSizeBucket: text("avg_suite_size_bucket"),
    siteAcres: numeric("site_acres"),
    constructionType: text("construction_type"),
    yearBuilt: integer("year_built"),
    buildingClass: text("building_class"),
    locationClass: text("location_class"),
    propertyType: text("property_type"),
    iosViable: text("ios_viable"),
    coldStorage: text("cold_storage"),
    trueOwnerName: text("true_owner_name"),
    legalOwnerName: text("legal_owner_name"),
    sfLastModified: timestamp("sf_last_modified", { withTimezone: true, mode: "string" }),
    gisLastSynced: timestamp("gis_last_synced", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    geom: geometry({ type: "point", srid: 4326 }),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    geocodeConfidence: numeric("geocode_confidence"),
    geocodeSource: text("geocode_source"),
    geocodeStatus: text("geocode_status"),
  },
  (table) => [
    index("idx_gis_properties_geom").using(
      "gist",
      table.geom.asc().nullsLast().op("gist_geometry_ops_2d"),
    ),
    index("idx_gis_properties_market").using(
      "btree",
      table.market.asc().nullsLast().op("text_ops"),
    ),
    index("idx_gis_properties_sf_last_modified").using(
      "btree",
      table.sfLastModified.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_gis_properties_submarket").using(
      "btree",
      table.submarket.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const gisSalesEvidence = pgTable(
  "gis_sales_evidence",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    propertyId: text("property_id").notNull(),
    saleDate: date("sale_date"),
    salePrice: numeric("sale_price"),
    salePricePerSf: numeric("sale_price_per_sf"),
    buildingClass: text("building_class"),
    locationClass: text("location_class"),
    suiteSizeBucket: text("suite_size_bucket"),
    geom: geometry({ type: "point", srid: 4326 }),
    dataSource: text("data_source").notNull(),
    confidenceScore: numeric("confidence_score"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_gis_sales_evidence_geom").using(
      "gist",
      table.geom.asc().nullsLast().op("gist_geometry_ops_2d"),
    ),
    index("idx_gis_sales_evidence_property").using(
      "btree",
      table.propertyId.asc().nullsLast().op("text_ops"),
    ),
    index("idx_gis_sales_evidence_sale_date").using(
      "btree",
      table.saleDate.asc().nullsLast().op("date_ops"),
    ),
    uniqueIndex("ux_gis_sales_evidence_dedupe").using(
      "btree",
      table.propertyId.asc().nullsLast().op("numeric_ops"),
      table.saleDate.asc().nullsLast().op("numeric_ops"),
      table.salePrice.asc().nullsLast().op("date_ops"),
    ),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [gisProperties.propertyId],
      name: "gis_sales_evidence_property_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const gisBasisGrid = pgTable(
  "gis_basis_grid",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    cellLat: doublePrecision("cell_lat").notNull(),
    cellLon: doublePrecision("cell_lon").notNull(),
    cellDlat: doublePrecision("cell_dlat").notNull(),
    cellDlon: doublePrecision("cell_dlon").notNull(),

    suiteSizeBucket: text("suite_size_bucket").notNull(),
    buildingClass: text("building_class").notNull(),

    basisPsf: numeric("basis_psf").notNull(),
    ess: numeric("ess").notNull(),
    confidence: text("confidence").notNull(),
    method: text("method").notNull(),

    market: text("market").notNull(),

    renderBasisPsf: numeric("render_basis_psf").notNull(),
    renderOpacity: numeric("render_opacity").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_gis_basis_grid_market_suite_bucket").using(
      "btree",
      table.market.asc().nullsLast().op("text_ops"),
      table.suiteSizeBucket.asc().nullsLast().op("text_ops"),
      table.buildingClass.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const gisPropertiesRelations = relations(gisProperties, ({ many }) => ({
  gisSalesEvidences: many(gisSalesEvidence),
}));

export const gisSalesEvidenceRelations = relations(gisSalesEvidence, ({ one }) => ({
  gisProperty: one(gisProperties, {
    fields: [gisSalesEvidence.propertyId],
    references: [gisProperties.propertyId],
  }),
}));
