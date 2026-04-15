export type BasisSurfaceGridRow = {
  cellId: string;
  cellLat: number;
  cellLon: number;
  cellDlat: number;
  cellDlon: number;
  market: string;
  suiteSizeBucket: string;
  buildingClass: string;
  renderBasisPsf: string;
};

export type BasisSurfaceLayerKey = {
  market: string;
  buildingClass: string;
  suiteSize: string;
};
