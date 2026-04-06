import { PropertyPreviewMap } from "@/components/mapbox";
import { trpc, type RouterOutput } from "@/utils/trpc";
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
} from "@gis-app/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@gis-app/ui/components/input";
import { useState } from "react";
import { cn } from "@gis-app/ui/lib/utils";

export const Route = createFileRoute("/_app/")({
  component: PropertiesRoute,
});

export type Property = RouterOutput["properties"]["getAll"][number];

function PropertiesRoute() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const { data: properties, isLoading } = useQuery(trpc.properties.getAll.queryOptions());

  return (
    <SidebarProvider className="min-h-full">
      <Sidebar className="sticky h-full bg-background">
        <SidebarHeader className="border-b border-sidebar-border">
          <Input placeholder="Search..." className="rounded-md h-8" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton className="h-7 rounded-lg" key={i} />
                  ))}
                </div>
              ) : (
                properties?.map((property) => (
                  <SidebarMenuItem key={property.id}>
                    <SidebarMenuButton
                      onClick={() => setSelectedProperty(property)}
                      className="h-auto"
                      render={
                        <div
                          className={cn(
                            "flex flex-col py-1 items-start border rounded-lg gap-1!",
                            selectedProperty?.id === property.id && "bg-sidebar-accent",
                          )}
                        >
                          <h3 className="leading-none">{property.name}</h3>
                          <div className="flex gap-1">
                            {property.yearBuilt && (
                              <p className="text-xs text-muted-foreground leading-none">
                                {property.yearBuilt} -
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground leading-none">
                              {property.areaInSqFt} sf
                            </p>
                            {property.lastPrice && (
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
      <main className="mx-auto w-full p-3 h-full">
        {isLoading ? (
          <div className="flex flex-col gap-2 h-full">
            <Skeleton className="h-full rounded-lg" />
          </div>
        ) : (
          <PropertyPreviewMap
            properties={properties ?? []}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
          />
        )}
      </main>
    </SidebarProvider>
  );
}
