import { PropertyPreviewMap } from "@/components/mapbox";
import { trpc, type RouterOutput } from "@/lib/trpc";
import { Skeleton } from "@gis-app/ui/components/skeleton";
import {
  SidebarGroup,
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from "@gis-app/ui/components/sidebar";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@gis-app/ui/lib/utils";
import { BasicCombobox } from "@/components/basic-combobox";
import { Spinner } from "@gis-app/ui/components/spinner";
import { Switch } from "@gis-app/ui/components/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gis-app/ui/components/tooltip";
import { ChevronLeft, ChevronRight, CircleCheck, XCircleIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@gis-app/ui/components/button";

export const Route = createFileRoute("/_app/")({
  component: MainRoute,
});

const basisMap = new Map<string, BasisGrid>();

export type Property = RouterOutput["properties"]["getAll"]["items"][number];
export type BasisGrid = RouterOutput["basis"]["getAll"]["items"][number];

function MainRoute() {
  const session = authClient.useSession();

  const [page, setPage] = useState(1);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedBuildingClass, setSelectedBuildingClass] = useState<string | undefined>("");
  const [selectedSuiteSize, setSelectedSuiteSize] = useState<string | undefined>("");
  const [showBasisLayer, setShowBasisLayer] = useState<boolean>(true);
  const [selectedMarket, setSelectedMarket] = useState<string | undefined>(
    session.data?.user?.market ?? "McAllen, TX",
  );

  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
  const [mapBounds, setMapBounds] = useState<
    { minLng: number; minLat: number; maxLng: number; maxLat: number } | undefined
  >(undefined);

  const isBasisEnabled = Boolean(
    selectedBuildingClass && selectedSuiteSize && mapBounds && mapZoom && mapZoom > 12,
  );

  const { data: basisGrids, isLoading: isBasisLoading } = useQuery(
    trpc.basis.getAll.queryOptions(
      {
        maxLat: mapBounds?.maxLat,
        minLat: mapBounds?.minLat,
        maxLon: mapBounds?.maxLng,
        minLon: mapBounds?.minLng,
        market: selectedMarket,
        buildingClass: selectedBuildingClass,
        suiteSize: selectedSuiteSize,
      },
      {
        enabled: isBasisEnabled && showBasisLayer,
        trpc: { abortOnUnmount: true },
      },
    ),
  );

  const { data: filters, isLoading: isFiltersLoading } = useQuery(
    trpc.properties.getPropertiesFilters.queryOptions(undefined, {
      trpc: { abortOnUnmount: true },
    }),
  );

  const {
    data: properties,
    isLoading: isPropertiesLoading,
    isFetching,
  } = useQuery(
    trpc.properties.getAll.queryOptions(
      {
        market: selectedMarket,
        buildingClass: selectedBuildingClass,
        suiteSize: selectedSuiteSize,
        page,
        maxLat: mapBounds?.maxLat,
        minLat: mapBounds?.minLat,
        maxLon: mapBounds?.maxLng,
        minLon: mapBounds?.minLng,
      },
      { trpc: { abortOnUnmount: true }, placeholderData: keepPreviousData },
    ),
  );

  const basis = useMemo(() => {
    basisGrids?.items.forEach((basisGrid) => {
      basisMap.set(basisGrid.id, basisGrid);
    });
    return Array.from(basisMap.values());
  }, [basisGrids]);

  return (
    <SidebarProvider className="min-h-full h-full">
      <Sidebar className="sticky h-full bg-background">
        <SidebarHeader className="flex flex-row h-auto gap-2 justify-between items-center border-b py-1.5">
          <div className="flex gap-1 text-muted-foreground text-sm">
            {isPropertiesLoading || isFetching ? (
              <Skeleton className="h-4 w-6" />
            ) : (
              (page - 1) * (properties?.pageSize ?? 0) + 1
            )}
            {" - "}
            {isPropertiesLoading || isFetching ? (
              <Skeleton className="h-4 w-6" />
            ) : (
              Math.min(page * (properties?.pageSize ?? 0), properties?.totals ?? 0)
            )}
            {" / "}
            {isPropertiesLoading || isFetching ? (
              <Skeleton className="h-4 w-6" />
            ) : (
              properties?.totals
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant={"outline"}
              size={"icon-sm"}
              className="size-8"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant={"outline"}
              size={"icon-sm"}
              className="size-8"
              disabled={page === properties?.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {isPropertiesLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton className="h-7 rounded-lg" key={i} />
                  ))}
                </div>
              ) : (
                properties?.items?.map((property) => (
                  <SidebarMenuItem key={property.id}>
                    <SidebarMenuButton
                      onClick={() => setSelectedProperty(property)}
                      className="h-auto"
                      render={
                        <div
                          className={cn(
                            "flex flex-col py-1 items-start border rounded-lg gap-1!",
                            selectedProperty?.id === property.id && "bg-muted",
                          )}
                        >
                          <h3 className="text-xs font-semibold">{property.name}</h3>
                          <div className="flex gap-1">
                            {Boolean(property.yearBuilt) && (
                              <p className="text-xs text-muted-foreground leading-none">
                                {property.yearBuilt} -
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground leading-none">
                              {property.areaInSqFt} sf
                            </p>
                            {Boolean(property.lastPrice) && (
                              <p className="text-xs text-muted-foreground leading-none">
                                - {property.lastPrice} $
                              </p>
                            )}
                          </div>
                        </div>
                      }
                    ></SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main className="size-full flex flex-col">
        <div className="px-2 py-1.5 border-b">
          {isFiltersLoading ? (
            <Skeleton className="h-8 w-full rounded-lg" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex">
                <BasicCombobox
                  items={filters?.marketList}
                  placeholder="market"
                  value={selectedMarket}
                  onValueChange={(v) => {
                    if (v !== null) {
                      setSelectedMarket(v as string);
                      basisMap.clear();
                      setPage(1);
                    }
                  }}
                  className="max-w-28 rounded-e-none"
                  showTrigger={false}
                />
                <BasicCombobox
                  items={filters?.buildingClassList}
                  placeholder="building class"
                  onValueChange={(v) => {
                    setSelectedBuildingClass(v as string);
                    basisMap.clear();
                    setPage(1);
                  }}
                  value={selectedBuildingClass}
                  className="max-w-28 rounded-none"
                  showTrigger={false}
                />
                <BasicCombobox
                  items={filters?.suiteSize}
                  placeholder="Suite Size"
                  onValueChange={(v) => {
                    setSelectedSuiteSize(v as string);
                    basisMap.clear();
                    setPage(1);
                  }}
                  value={selectedSuiteSize}
                  className="max-w-28 rounded-s-none"
                  showTrigger={false}
                />
              </div>
              <div className="flex gap-2 border rounded-md px-2 h-8 items-center bg-input dark:bg-input/30">
                <label
                  htmlFor="basis-switch"
                  className={cn("text-sm font-medium", !isBasisEnabled && "text-muted-foreground")}
                >
                  Basis:
                </label>
                <Switch
                  id="basis-switch"
                  checked={showBasisLayer}
                  onCheckedChange={(v) => setShowBasisLayer(v)}
                  disabled={isBasisLoading || (!isBasisEnabled && basis.length === 0)}
                />
                {!isBasisEnabled && (
                  <Tooltip>
                    <TooltipTrigger delay={0}>
                      <XCircleIcon className="size-4 text-red-400" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="shadow-sm">
                      <p className="text-sm text-muted-foreground">
                        The basis disabled until you select market, building class and suite size
                        and zoom in to the map.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {isBasisEnabled && <CircleCheck className="size-4 text-green-400" />}
                {isBasisLoading && <Spinner className="size-4" />}
              </div>
            </div>
          )}
        </div>
        <div className="size-full">
          <PropertyPreviewMap
            basisGrids={showBasisLayer ? basis : undefined}
            properties={properties?.items ?? []}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
            setMapBounds={setMapBounds}
            setZoom={setMapZoom}
          />
        </div>
      </main>
    </SidebarProvider>
  );
}
