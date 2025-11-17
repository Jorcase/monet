import { Link as RouterLink, type LinkProps } from "react-router-dom"
import { NavigationMenuLink } from "@/components/ui/navigation-menu"

type NavigationMenuRouterLinkProps = LinkProps & React.HTMLAttributes<HTMLAnchorElement>

export function NavigationMenuRouterLink({ to, children, ...props }: NavigationMenuRouterLinkProps) {
  return (
    <NavigationMenuLink asChild>
      <RouterLink to={to} {...props}>
        {children}
      </RouterLink>
    </NavigationMenuLink>
  )
}
