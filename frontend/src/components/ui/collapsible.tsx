"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

interface CollapsibleContextValue {
  open: boolean
  setOpen: (value: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("Collapsible components must be used within <Collapsible>.")
  }
  return context
}

const Collapsible = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(({ defaultOpen = false, open: openProp, onOpenChange, className, children, ...props }, ref) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const open = openProp ?? internalOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      onOpenChange ? onOpenChange(value) : setInternalOpen(value)
    },
    [onOpenChange]
  )

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div data-state={open ? "open" : "closed"} className={className} ref={ref} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
})
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { asChild?: boolean }
>(({ asChild = false, ...props }, ref) => {
  const { open, setOpen } = useCollapsible()
  const Comp = asChild ? Slot : "button"

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event)
    setOpen(!open)
  }

  return (
    <Comp
      ref={ref as any}
      data-state={open ? "open" : "closed"}
      onClick={handleClick}
      type={asChild ? undefined : "button"}
      {...props}
    />
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ style, ...props }, ref) => {
  const { open } = useCollapsible()
  return (
    <div
      ref={ref}
      data-state={open ? "open" : "closed"}
      hidden={!open}
      style={{ ...(style || {}), overflow: "hidden" }}
      {...props}
    />
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
