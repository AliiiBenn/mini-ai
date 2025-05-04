'use client';

import { AppSidebar } from "@/components/AppSidebar"; // Adjusted import path
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar, // Import useSidebar hook
} from "@/components/ui/sidebar";
import { ChatInterface } from '@/components/ChatInterface'; // Import the chat component
import { useSession } from 'next-auth/react'; // Keep session check
import { useRouter } from 'next/navigation'; // Keep router for redirect
import { useEffect } from 'react'; // Keep useEffect for redirect
import { cn } from "@/lib/utils"; // Import cn for conditional classes

// Reusable MainContent for the new chat page
function MainContent() {
  const { state: sidebarState } = useSidebar(); // Get sidebar state

  return (
    <SidebarInset>
      {/* Header shown only when sidebar is expanded or not collapsible icon mode */}
      {sidebarState === 'expanded' && (
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:h-[60px]">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              {/* Title for new chat page? */}
              <span className="font-semibold">New Chat</span>
            </div>
          </header>
       )}
      <main className="flex flex-1 flex-col p-0"> {/* Main content area */}
         <ChatInterface />
      </main>
    </SidebarInset>
  );
}

function FloatingSidebarTrigger() {
   const { state: sidebarState } = useSidebar();
   return (
      <SidebarTrigger
         className={cn(
           "fixed top-4 left-4 z-50", // Position top-left
           sidebarState === 'expanded' ? "hidden" : "block" // Show only when collapsed
         )}
       />
   )
}

export default function Page() {
  const router = useRouter();
  const { status } = useSession(); // Removed unused `data: session`

  useEffect(() => {
    // Redirect if status is determined and user is unauthenticated
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Define navigation handlers
  const handleSelectChat = (chatId: string) => {
      router.push(`/chat/${chatId}`);
  };

  const handleNewChat = () => {
      // Already on the new chat page, maybe clear state if ChatInterface holds any?
      // For now, just ensure we are on the root page.
      if (window.location.pathname !== '/') {
        router.push('/');
      }
  };

  // Show loading state while checking session status
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading session...</p>
         {/* Add a spinner or skeleton here if desired */}
      </div>
    );
  }

  // Render the main layout only if authenticated
  if (status === 'authenticated') {
    return (
      <SidebarProvider>
        {/* Floating trigger outside the normal flow, shown when collapsed */}
        <FloatingSidebarTrigger />
        {/* Pass handlers and currentChatId (null for new chat page) */}
        <AppSidebar
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            currentChatId={null} // This is the new chat page
        />
        {/* Main content uses hook */}
        <MainContent />
      </SidebarProvider>
    );
  }

  // Return null or a placeholder if unauthenticated (during redirect)
  return null;
}
