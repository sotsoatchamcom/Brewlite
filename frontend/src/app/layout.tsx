// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "BrewLite",
    description: "Hệ thống đặt cà phê và quản lý cửa hàng",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi" suppressHydrationWarning>
        <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <AuthProvider>
            {children}
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        </body>
        </html>
    );
}