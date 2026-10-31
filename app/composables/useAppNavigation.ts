import { BookOpen, CalendarDays, UserRound } from "@lucide/vue"

// Primary destinations, shared by the top bar and the phone tab bar.
export function useAppNavigation() {
  const route = useRoute()
  const items = [
    { to: "/", label: "Calendar", icon: CalendarDays, match: (p: string) => p === "/" },
    { to: "/docs", label: "Docs", icon: BookOpen, match: (p: string) => p === "/docs" || p.startsWith("/docs/") },
    { to: "/account", label: "Account", icon: UserRound, match: (p: string) => p.startsWith("/account") },
  ] as const
  return {
    items,
    isCurrent: (item: (typeof items)[number]) => item.match(route.path),
  }
}
