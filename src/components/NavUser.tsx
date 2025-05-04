"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { signOut } from "next-auth/react"; // Import signOut

export function NavUser({
  user,
}: {
  user: {
    name: string | null | undefined
    email: string | null | undefined
    image: string | null | undefined // Changed from avatar to image
  }
}) {
  const { isMobile } = useSidebar()

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' }); // Redirect to login after sign out
  };

  // Handle potential null/undefined user data
  const userName = user?.name ?? "User";
  const userEmail = user?.email ?? "email@example.com";
  const userAvatar = user?.image ?? "https://github.com/shadcn.png"; // Use user.image, provide fallback
  const fallbackInitial = userName?.charAt(0).toUpperCase() ?? "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="rounded-lg">{fallbackInitial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs">{userEmail}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                  <AvatarFallback className="rounded-lg">{fallbackInitial}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="truncate text-xs">{userEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Placeholder items - Customize as needed */}
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade (Placeholder)
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account (Placeholder)
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing (Placeholder)
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications (Placeholder)
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* Logout Button */}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
} 