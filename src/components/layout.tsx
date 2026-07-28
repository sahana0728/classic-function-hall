import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api";
import { LogOut, CalendarDays, Bookmark, Palette, Smartphone, X, MessageSquare, MoreHorizontal, Shield, Download, Bell, ChevronRight, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch enquiries to check for new ones
  const { data: enquiries = [] } = useQuery<any[]>({
    queryKey: ["notifications-enquiries"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/enquiries");
      if (!res.ok) throw new Error("Failed to fetch enquiries");
      return await res.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const newEnquiries = enquiries.filter(e => !e.viewed);

  const latestEnquiries = [...enquiries]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 5);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;

    if (isStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleMobile);

    if (isAppleMobile) {
      setShowInstallBtn(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      setShowMoreMenu(false);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") setShowInstallBtn(false);
        setDeferredPrompt(null);
      });
      setShowMoreMenu(false);
    }
  };

  // Bottom tab items for mobile
  const mobileNavItems = [
    { href: "/home", label: "Home", icon: CalendarDays },
    { href: "/bookings", label: "Bookings", icon: Bookmark },
    { href: "/enquiries", label: "Enquiries", icon: MessageSquare },
    { href: "/themes", label: "Themes", icon: Palette },
  ];

  // Desktop sidebar items
  const sidebarItems = [
    { href: "/home", label: "Dashboard", icon: CalendarDays },
    { href: "/bookings", label: "Bookings", icon: Bookmark },
    { href: "/enquiries", label: "Enquiries", icon: MessageSquare },
    { href: "/themes", label: "Themes", icon: Palette },
    ...(user?.role === "Admin" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  if (!user) return <>{children}</>;

  // ═══════════════════════════════════════════
  // MOBILE LAYOUT
  // ═══════════════════════════════════════════
  if (isMobile) {
    const isTabActive = (href: string) => {
      if (href === "/bookings") return location.startsWith("/booking");
      if (href === "/enquiries") return location.startsWith("/enquir");
      return location.startsWith(href);
    };

    return (
      <div className="flex flex-col h-screen bg-muted/30 overflow-hidden">
        {/* ── Top Header Bar ── */}
        <header className="safe-top bg-card border-b border-border px-4 py-3 flex items-center justify-between z-30 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-transparent flex items-center justify-center flex-shrink-0">
              <img src="/favicon.png" className="w-full h-full object-cover" alt="Classic Function Hall Logo" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base leading-none text-primary">Classic</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Function Hall</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotifications(true)}
              className="w-10 h-10 rounded-full hover:bg-muted active:bg-muted/80 flex items-center justify-center relative touch-target"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5 text-foreground/80" />
              {newEnquiries.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
              )}
            </button>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-mobile-nav">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </main>

        {/* ── Bottom Tab Bar ── */}
        <nav className="safe-bottom bg-card border-t border-border flex items-stretch z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {mobileNavItems.map((item) => {
            const active = isTabActive(item.href);
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex">
                <button className="w-full flex flex-col items-center justify-center py-2 px-1 touch-target relative">
                  <item.icon className={`w-5 h-5 mb-0.5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              </Link>
            );
          })}
          {/* More Tab */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 px-1 touch-target"
          >
            <MoreHorizontal className={`w-5 h-5 mb-0.5 ${showMoreMenu ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-[10px] font-medium ${showMoreMenu ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              More
            </span>
          </button>
        </nav>

        {/* ── More Menu (Slide-up) ── */}
        <AnimatePresence>
          {showMoreMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setShowMoreMenu(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-2xl safe-bottom"
              >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
                </div>

                <div className="px-5 pb-6 space-y-1">
                  {/* User info */}
                  <div className="flex items-center gap-3 px-3 py-3 mb-2">
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>

                  {/* Admin link (admin only) */}
                  {user.role === "Admin" && (
                    <Link href="/admin">
                      <button
                        onClick={() => setShowMoreMenu(false)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-foreground hover:bg-muted/50 active:bg-muted touch-target transition-colors"
                      >
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-medium">Admin Panel</span>
                      </button>
                    </Link>
                  )}

                  {/* Install App */}
                  {showInstallBtn && (
                    <button
                      onClick={handleInstallClick}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-foreground hover:bg-muted/50 active:bg-muted touch-target transition-colors"
                    >
                      <Download className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Install App</span>
                    </button>
                  )}

                  {/* Sign Out */}
                  <button
                    onClick={() => { setShowMoreMenu(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-destructive hover:bg-destructive/5 active:bg-destructive/10 touch-target transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground/60 text-center pt-2 font-mono">v1.0.1</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* iOS Instructions Modal */}
        <AnimatePresence>
          {showIOSInstructions && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-card w-full max-w-sm rounded-2xl p-6 border border-border shadow-xl relative"
              >
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground">Install on iPhone / iPad</h3>
                  <p className="text-sm text-muted-foreground">
                    Follow these simple steps:
                  </p>
                  <div className="text-left space-y-3 bg-muted/40 p-4 rounded-xl text-sm border border-border/50 text-foreground">
                    <div className="flex gap-3">
                      <span className="font-bold text-primary">1.</span>
                      <span>Tap the <strong>Share</strong> button at the bottom of Safari (square with arrow pointing up).</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-bold text-primary">2.</span>
                      <span>Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-bold text-primary">3.</span>
                      <span>Tap <strong>"Add"</strong> in the top-right corner.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIOSInstructions(false)}
                    className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/95 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Notifications Panel (Slide-up) */}
        <AnimatePresence>
          {showNotifications && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-2xl safe-bottom max-h-[80vh] flex flex-col"
              >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                  <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
                </div>

                <div className="px-5 pb-6 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-base text-foreground">New Enquiries</h3>
                    </div>
                    {newEnquiries.length > 0 && (
                      <span className="bg-destructive/10 text-destructive text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {newEnquiries.length} New Today
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {latestEnquiries.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-sm">
                        <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>No enquiries found.</p>
                      </div>
                    ) : (
                      latestEnquiries.map((enquiry) => {
                        const isNew = !enquiry.viewed;
                        return (
                          <Link key={enquiry.id} href={`/enquiries/${enquiry.id}`}>
                            <button
                              onClick={() => setShowNotifications(false)}
                              className={`w-full text-left p-3.5 rounded-xl border transition-all flex justify-between items-start touch-target
                                ${isNew 
                                  ? 'bg-yellow-50/50 border-yellow-200 hover:bg-yellow-50' 
                                  : 'bg-card border-border hover:bg-muted/50'
                                }
                              `}
                            >
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-foreground truncate">{enquiry.name}</h4>
                                  {isNew && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{enquiry.phone}</p>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>
                                    {enquiry.startDate ? format(new Date(enquiry.startDate), "MMM d") : "—"} 
                                    {" - "}
                                    {enquiry.endDate ? format(new Date(enquiry.endDate), "MMM d") : "—"}
                                  </span>
                                </div>
                                {enquiry.notes && (
                                  <p className="text-[11px] text-muted-foreground/80 mt-1.5 line-clamp-1 italic">
                                    "{enquiry.notes}"
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                            </button>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DESKTOP LAYOUT (unchanged sidebar)
  // ═══════════════════════════════════════════
  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-card border-r border-border shadow-sm flex flex-col z-20 relative"
      >
        <div className="p-6 border-b border-border/50 flex items-center gap-3 text-primary">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-transparent flex items-center justify-center flex-shrink-0">
            <img src="/favicon.png" className="w-full h-full object-cover" alt="Classic Function Hall Logo" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none">Classic</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Function Hall</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-foreground/70 hover:bg-primary/5 hover:text-primary"}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-3">
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 shadow-md shadow-primary/10 rounded-xl transition-all duration-200 hover:scale-[1.02]"
            >
              <Smartphone className="w-4 h-4 animate-pulse text-primary-foreground" />
              Install Mobile App
            </button>
          )}

          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold font-display shadow-inner">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <p className="text-[10px] text-muted-foreground/60 text-center pt-1 font-mono">v1.0.1</p>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="max-w-6xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Desktop iOS instructions modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-2xl p-6 border border-border shadow-xl relative"
            >
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground">Install on iPhone / iPad</h3>
                <p className="text-sm text-muted-foreground">
                  Follow these simple steps to install the app on your home screen:
                </p>
                <div className="text-left space-y-3 bg-muted/40 p-4 rounded-xl text-sm border border-border/50 text-foreground">
                  <div className="flex gap-3">
                    <span className="font-bold text-primary">1.</span>
                    <span>Tap the <strong>Share</strong> button at the bottom of Safari (a square with an arrow pointing up).</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-primary">2.</span>
                    <span>Scroll down the options list and select <strong>"Add to Home Screen"</strong>.</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-primary">3.</span>
                    <span>Tap <strong>"Add"</strong> in the top-right corner to finish!</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/95 transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
