import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxGroup,
  ComboboxLabel,
} from "@gis-app/ui/components/combobox";
import { cn } from "@gis-app/ui/lib/utils";

export function BasicCombobox({
  ...props
}: React.ComponentProps<typeof Combobox> & {
  placeholder?: string;
  className?: string;
  listClassName?: string;
  showTrigger?: boolean;
  showNoneIfExists?: boolean;
}) {
  return (
    <Combobox
      {...props}
      value={props.value === null ? "None" : props.value}
      onValueChange={(v, e) => {
        if (v === "None") {
          props.onValueChange?.(null, e);
        } else if (v === null) {
          props.onValueChange?.("", e);
        } else {
          props.onValueChange?.(v, e);
        }
      }}
    >
      <ComboboxInput
        placeholder={props.placeholder ?? "Select..."}
        className={cn("h-8", props.className)}
        showTrigger={props.showTrigger}
      />
      <ComboboxContent className={props.listClassName}>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxGroup>
          <ComboboxLabel>{props.placeholder}</ComboboxLabel>
          <ComboboxList>
            {(item) =>
              item ? (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              ) : props.showNoneIfExists ? (
                <ComboboxItem key="null-item" value="None">
                  None
                </ComboboxItem>
              ) : null
            }
          </ComboboxList>
        </ComboboxGroup>
      </ComboboxContent>
    </Combobox>
  );
}
