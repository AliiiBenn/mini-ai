"use client"

import * as React from "react"
// Remove unused icons
import {
  // BookOpen,
  // Frame,
  GalleryVerticalEnd,
  // Map,
  // PieChart,
  // Settings2,
  // SquareTerminal,
} from "lucide-react"
import { useSession } from "next-auth/react"; // Import useSession

// Remove unused Nav components if they are not rendered
// import { NavMain } from "@/components/NavMain" 
// import { NavProjects } from "@/components/NavProjects" 
import { NavUser } from "@/components/NavUser" // Adjusted import path
import { TeamSwitcher } from "@/components/TeamSwitcher" // Adjusted import path
import { NavHistory } from "@/components/NavHistory" // Import NavHistory
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data - simplified as NavMain/NavProjects are commented out below
const data = {
  user: {
    name: "Current User",
    email: "user@example.com",
    avatar: "",
  },
  teams: [
    {
      name: "Jarvis",
      logo: GalleryVerticalEnd,
      plan: "Personal",
    },
  ],
  // navMain: [ ... ], // Removed for brevity as it's commented out below
  // projects: [ ... ], // Removed for brevity as it's commented out below
}

// Define props for AppSidebar
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  currentChatId: string | null;
}

export function AppSidebar({ 
  onSelectChat,
  onNewChat,
  currentChatId,
  ...props 
}: AppSidebarProps) {
  const { data: session, status } = useSession(); // Get session

  // Only render the sidebar content if authenticated
  if (status === 'loading') {
    // Optional: Render a loading state for the sidebar
    return null; // Or a skeleton loader
  }

  if (status === 'unauthenticated' || !session?.user) {
    // Should ideally be handled by page-level redirect, but good practice
    return null; 
  }
  
  // Now we know user exists
  const user = session.user;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        {/* If you want NavMain/NavProjects back, uncomment them and their imports */}
        {/* <NavMain items={data.navMain} /> */}
        {/* <NavProjects projects={data.projects} /> */}
        <NavHistory 
          onSelectChat={onSelectChat} 
          onNewChat={onNewChat} 
          currentChatId={currentChatId} 
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
} 