import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AHS Sales CRM",
  description: "Internal company CRM WebApp for AHS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Suppress browser extension unhandled promise rejections from bubbling to Next.js dev server
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event.reason;
                    var stack = (reason && reason.stack) ? reason.stack : '';
                    var msg = (reason && reason.message) ? reason.message : String(reason);
                    if (
                      stack.indexOf('chrome-extension://') !== -1 ||
                      stack.indexOf('moz-extension://') !== -1 ||
                      msg.indexOf('Extension context invalidated') !== -1
                    ) {
                      event.preventDefault();
                    }
                  });

                  // Strip extension-injected attributes before React hydration runs
                  var removeExtAttrs = function(el) {
                    if (el && el.removeAttribute) {
                      el.removeAttribute('bis_skin_checked');
                      el.removeAttribute('bis_register');
                    }
                  };

                  var elements = document.querySelectorAll('[bis_skin_checked], [bis_register]');
                  for (var i = 0; i < elements.length; i++) {
                    removeExtAttrs(elements[i]);
                  }

                  if (window.MutationObserver) {
                    var observer = new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === 'attributes' && (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register')) {
                          m.target.removeAttribute(m.attributeName);
                        }
                      }
                    });
                    observer.observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: ['bis_skin_checked', 'bis_register']
                    });
                  }

                  // Initialize Theme
                  var theme = localStorage.getItem('ahs-theme') || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body
        className="h-full w-full overflow-hidden flex flex-col bg-background text-foreground transition-colors duration-200"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
