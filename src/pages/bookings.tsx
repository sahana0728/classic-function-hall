import { useBookings } from "@/hooks/use-bookings";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Plus, Search, Loader2, ChevronRight, Calendar, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function isBookingClosed(booking: any) {
  if (!booking.endDate) return false;
  const isPast = new Date(booking.endDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
  const isFullyPaid = Number(booking.advancePaid || 0) >= Number(booking.totalAmount || 0);
  return isPast && isFullyPaid;
}

export default function Bookings() {
  const [, setLocation] = useLocation();
  const { data: bookings = [], isLoading } = useBookings();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const isMobile = useIsMobile();

  const filteredBookings = bookings.filter(b => 
    b.customerName?.toLowerCase().includes(search.toLowerCase()) || 
    (b.themeName && b.themeName.toLowerCase().includes(search.toLowerCase()))
  );

  const displayedBookings = filteredBookings.filter(b => 
    activeTab === "closed" ? isBookingClosed(b) : !isBookingClosed(b)
  );

  // ── Mobile Card View ──
  const renderMobileCards = () => (
    <div className="space-y-3 p-3">
      {displayedBookings.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground font-medium">No {activeTab} bookings found.</p>
        </div>
      ) : (
        displayedBookings.map((booking) => (
          <button
            key={booking.id}
            onClick={() => setLocation(`/bookings/${booking.id}`)}
            className="mobile-card w-full text-left"
          >
            <div className="flex items-center gap-3">
              <img 
                src={booking.themeImage} 
                alt={booking.themeName}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=100&auto=format&fit=crop" }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{booking.customerName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{booking.themeName || "No theme"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(booking.startDate), "MMM d")} - {format(new Date(booking.endDate), "MMM d")}</span>
              </div>
              {booking.totalAmount && (
                <span className="text-xs font-semibold text-primary ml-auto">
                  ₹{Number(booking.totalAmount).toLocaleString()}
                </span>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  );

  // ── Desktop Table View ──
  const renderTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="font-semibold text-foreground">Customer</TableHead>
            <TableHead className="font-semibold text-foreground">Theme</TableHead>
            <TableHead className="font-semibold text-foreground">Start Date</TableHead>
            <TableHead className="font-semibold text-foreground">End Date</TableHead>
            <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedBookings.map((booking) => (
            <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">{booking.customerName}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <img 
                    src={booking.themeImage} 
                    alt={booking.themeName}
                    className="w-8 h-8 rounded-md object-cover"
                    onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=100&auto=format&fit=crop" }}
                  />
                  {booking.themeName}
                </div>
              </TableCell>
              <TableCell>{format(new Date(booking.startDate), "MMM d, yyyy")}</TableCell>
              <TableCell>{format(new Date(booking.endDate), "MMM d, yyyy")}</TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation(`/bookings/${booking.id}`)}
                  className="text-primary hover:text-primary"
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage all customer reservations</p>
        </div>
        <Button onClick={() => setLocation("/booking/create")} className="shadow-md shadow-primary/20 hover-elevate w-full sm:w-auto touch-target">
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
          <div className="p-3 md:p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by customer or theme..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white h-11"
              />
            </div>
            <TabsList className="grid w-full sm:w-[300px] grid-cols-2">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="m-0 border-none outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : isMobile ? renderMobileCards() : (
              displayedBookings.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-muted-foreground font-medium">No active bookings found.</p>
                </div>
              ) : renderTable()
            )}
          </TabsContent>
          <TabsContent value="closed" className="m-0 border-none outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : isMobile ? renderMobileCards() : (
              displayedBookings.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-muted-foreground font-medium">No closed bookings found.</p>
                </div>
              ) : renderTable()
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
