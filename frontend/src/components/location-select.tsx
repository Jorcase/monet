import { CheckIcon, ChevronDownIcon, MapPinIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const DEFAULT_LOCATIONS = ["Casa", "Oficina", "Laboratorio", "Data center"]

interface LocationSelectProps {
  value: string
  onChange: (value: string) => void
  options?: string[]
}

export function LocationSelect({
  value,
  onChange,
  options,
}: LocationSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const normalizedOptions = useMemo(() => {
    const set = new Map<string, string>()
    for (const item of [...(options ?? DEFAULT_LOCATIONS)]) {
      const trimmed = item.trim()
      if (!trimmed) continue
      set.set(trimmed.toLowerCase(), trimmed)
    }
    if (value) {
      set.set(value.trim().toLowerCase(), value)
    }
    return Array.from(set.values())
  }, [options, value])

  const handleSelect = (selection: string) => {
    onChange(selection)
    setSearch("")
    setOpen(false)
  }

  const lowerSearch = search.trim().toLowerCase()
  const showCustomOption =
    !!lowerSearch && !normalizedOptions.some((opt) => opt.toLowerCase() === lowerSearch)

  const commitCustomValue = () => {
    if (!lowerSearch) return
    handleSelect(search.trim())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPinIcon className="h-4 w-4" />
            {value || "Seleccionar ubicación"}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar o escribir..."
            className="h-9"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitCustomValue()
              }
            }}
          />
          <CommandList>
            <CommandEmpty>Sin coincidencias.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="clear"
                onSelect={() => handleSelect("")}
                className="text-muted-foreground"
              >
                <CheckIcon
                  className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")}
                />
                Sin ubicación
              </CommandItem>
              {normalizedOptions.map((item) => (
                <CommandItem key={item} onSelect={() => handleSelect(item)}>
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      item === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item}
                </CommandItem>
              ))}
              {showCustomOption ? (
                <CommandItem
                  key="custom"
                  onSelect={() => handleSelect(search.trim())}
                  className="text-foreground"
                >
                  <CheckIcon className="mr-2 h-4 w-4 opacity-0" />
                  Usar "{search.trim()}"
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
