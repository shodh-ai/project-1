'use client';
import { Plus_Jakarta_Sans } from "next/font/google";
import "../styles/globals.css";
import AuthContextProvider from "@/contexts/AuthContext";
import { SocketIOProvider } from "@/contexts/SocketIOContext";
import { AppContextProvider } from "@/contexts/Appcontext";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });

// Metadata export is not allowed in client components. 
// For setting the page title and other head elements dynamically in a client component,
// you can use a combination of `useEffect` and direct DOM manipulation (e.g., `document.title = 'New Title';`)
// or a third-party library like 'react-helmet-async' if you need more complex head management.
// Alternatively, if some parent component is a Server Component, metadata can be exported from there.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = isAuthLoading ? 'loading_user' : user?.id || 'guest_user';
  return (
    <html lang="en">
      <body className={plusJakartaSans.className}>
        <AuthContextProvider>
          <SocketIOProvider>
            <AppContextProvider userId={userId}>
              <main>{children}</main>
            </AppContextProvider>
          </SocketIOProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}