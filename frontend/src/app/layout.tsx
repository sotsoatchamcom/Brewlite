import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DashboardLayout from "@/components/DashboardLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "BrewLite Dashboard",
    description: "Coffee shop management system",
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
            <DashboardLayout>
                {children}
            </DashboardLayout>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        </body>
        </html>
    );
}