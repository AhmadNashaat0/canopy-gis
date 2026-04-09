import { Check, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "../theme-provider";
import { Button } from "@gis-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gis-app/ui/components/dropdown-menu";

export function ThemeDropdownMenu() {
  const { setTheme, theme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-full w-full justify-start rounded-null px-3 py-0 font-normal capitalize"
            variant="ghost"
          >
            {theme === "dark" ? (
              <>
                <MoonIcon className="opacity-60" /> Dark Mode
              </>
            ) : (
              <>
                <SunIcon className="opacity-60" /> Light Mode
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="center" className="w-48" side="right">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex w-full items-center justify-start gap-2">
            <span className="truncate font-medium text-foreground text-sm">Theme</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <MoonIcon /> Dark Mode {theme === "dark" && <Check className="opacity-60" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <SunIcon /> Light Mode {theme === "light" && <Check className="opacity-60" />}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
