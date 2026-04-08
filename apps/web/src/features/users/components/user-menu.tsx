import { ChevronsUpDown, LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@gis-app/ui/components/avatar";
import { Button } from "@gis-app/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@gis-app/ui/components/popover";
import { SidebarMenuButton } from "@gis-app/ui/components/sidebar";
import { authClient } from "@/lib/auth-client";

export default function UserMenu({ isCombact = true }: { isCombact?: boolean }) {
  const { data } = authClient.useSession();
  const user = data?.user;
  if (!user) {
    return null;
  }
  return (
    <Popover>
      <PopoverTrigger
        render={
          isCombact ? (
            <Button className="h-auto p-0 hover:bg-transparent" variant="ghost">
              <Avatar>
                <AvatarImage alt="Profile image" src={user.image ?? ""} />
                <AvatarFallback className="border bg-primary text-primary-foreground uppercase">
                  {`${user.name.split(" ")[0][0]}${user.name.split(" ")[1][0]}`}
                </AvatarFallback>
              </Avatar>
            </Button>
          ) : (
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage alt="Profile image" src={user.image ?? ""} />
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground uppercase">
                  {`${user.name.split(" ")[0][0]}${user.name.split(" ")[1][0]}`}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start leading-tight">
                <span className="truncate font-medium text-foreground text-sm">{user.name}</span>
                <span className="truncate font-normal text-muted-foreground text-xs">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          )
        }
      />
      <PopoverContent align="start" className="w-42 p-0">
        <div className="flex w-full items-center justify-start gap-2 px-4 py-3">
          <Avatar className="rounded-md">
            <AvatarImage alt="Profile image" src={user.image ?? ""} />
            <AvatarFallback className="rounded-md border bg-primary text-primary-foreground uppercase">
              {`${user.name.split(" ")[0][0]}${user.name.split(" ")[1][0]}`}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start">
            <span className="truncate font-medium text-foreground text-sm">{user.name}</span>
            <span className="truncate font-normal text-muted-foreground text-xs">{user.email}</span>
          </div>
        </div>
        {/* <div className="border-t">
          <div className="h-10">
            <LocaleDropdownMenu />
          </div>
          <div className="h-10">
            <ThemeDropdownMenu />
          </div>
        </div> */}
        <div className="border-t">
          <Button
            className="group h-full w-full justify-start px-4 py-2 font-normal capitalize"
            onClick={() => authClient.signOut()}
            variant="ghost"
          >
            <LogOutIcon
              aria-hidden="true"
              className="opacity-60 group-hover:text-red-500 group-hover:opacity-100"
              size={16}
            />
            <span className="group-hover:text-red-500">Logout</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
