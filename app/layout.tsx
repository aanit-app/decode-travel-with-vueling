import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Navbar } from "./components/Navbar";
import { Providers } from "./providers";
import { SettingsProvider } from "./contexts/SettingsContext";
import { Web3Provider } from "./contexts/Web3Context";

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background font-sans antialiased"
      >
        <Providers
          themeProps={{
            attribute: "class",
            defaultTheme: "dark",
            enableSystem: true,
          }}
        >
          <SettingsProvider>
            <AuthProvider>
              <Web3Provider>
                <Navbar />
                {children}
              </Web3Provider>
            </AuthProvider>
          </SettingsProvider>
        </Providers>
      </body>
    </html>
  );
}
