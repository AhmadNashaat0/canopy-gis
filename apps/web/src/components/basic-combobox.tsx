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
    <Combobox {...props}>
      <ComboboxInput placeholder={props.placeholder ?? "Select..."} />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
