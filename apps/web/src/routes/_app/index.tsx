import { PropertyPreviewMap } from "@/components/mapbox";
import { trpc, type RouterOutput } from "@/lib/trpc";
import { Skeleton } from "@gis-app/ui/components/skeleton";
import {
  SidebarGroup,
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@gis-app/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useState } from "react";
import { cn } from "@gis-app/ui/lib/utils";
import { BasicCombobox } from "@/components/basic-combobox";

export const Route = createFileRoute("/_app/")({
  component: PropertiesRoute,
});

export type Property = RouterOutput["properties"]["getAll"]["items"][number];

function PropertiesRoute() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | undefined>("McAllen, TX");
  const [selectedBuildingClass, setSelectedBuildingClass] = useState<string | undefined>("");
  const [selectedLocationClass, setSelectedLocationClass] = useState<string | undefined>("");
  const [selectedPropertyType, setSelectedPropertyType] = useState<string | undefined>("");

  const { data: filters, isLoading: isFiltersLoading } = useQuery(
    trpc.properties.getPropertiesFilters.queryOptions(),
  );

  const { data: properties, isLoading: isPropertiesLoading } = useQuery(
    trpc.properties.getAll.queryOptions({
      market: selectedMarket,
      buildingClass: selectedBuildingClass,
      locationClass: selectedLocationClass,
      propertyType: selectedPropertyType,
    }),
  );

  return (
    <SidebarProvider className="min-h-full h-full">
      <Sidebar className="sticky h-full bg-background">
        <SidebarHeader className="border-b">
          <BasicCombobox
            items={filters?.marketList}
            placeholder="market"
            value={selectedMarket}
            onValueChange={(v) => setSelectedMarket(v as string)}
          />
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
                          <h3 className="leading-none text-sm">{property.name}</h3>
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
        <SidebarFooter className="border-t">
          <div className="flex gap-2 text-muted-foreground text-sm justify-between">
            <p>Properties</p>
            <div className="flex gap-1">
              {isPropertiesLoading ? (
                <Skeleton className="h-4 w-6" />
              ) : (
                `${Math.min(properties?.totals ?? 0, properties?.pageSize ?? 0)}`
              )}
              {" / "}
              {isPropertiesLoading ? <Skeleton className="h-4 w-6" /> : properties?.totals}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="size-full flex flex-col">
        <div className="p-2 border-b">
          {isFiltersLoading ? (
            <Skeleton className="h-9 w-full rounded-lg" />
          ) : (
            <div className="flex gap-2">
              <BasicCombobox
                items={filters?.buildingClassList}
                placeholder="building class"
                onValueChange={(v) => setSelectedBuildingClass(v as string)}
                value={selectedBuildingClass}
              />
              <BasicCombobox
                items={filters?.locationClassList}
                placeholder="location class"
                onValueChange={(v) => setSelectedLocationClass(v as string)}
                value={selectedLocationClass}
              />
              <BasicCombobox
                items={filters?.propertyTypeList}
                placeholder="property type"
                onValueChange={(v) => setSelectedPropertyType(v as string)}
                value={selectedPropertyType}
              />
            </div>
          )}
        </div>
        <div className="p-2 size-full">
          <PropertyPreviewMap
            properties={properties?.items ?? []}
            isLoading={isPropertiesLoading}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
          />
        </div>
      </main>
    </SidebarProvider>
  );
}
