import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@gis-app/ui/components/combobox";

export function BasicCombobox({
  ...props
}: React.ComponentProps<typeof Combobox> & { placeholder?: string }) {
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
      <ComboboxInput placeholder={props.placeholder ?? "Select..."} />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item) =>
            item ? (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            ) : (
              <ComboboxItem key="null-item" value="None">
                None
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
