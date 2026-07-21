import { useState } from "react";
import { useCalendarEvents } from "@/hooks/use-calendar";
import { CalendarView } from "@/components/calendar-view";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: events = [], isLoading } = useCalendarEvents();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayEvents, setDayEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDateClick = (date: Date, events: any[]) => {
    setSelectedDate(date);
    setDayEvents(events);
    setIsModalOpen(true);
  };

  const handleCreateBooking = () => {
    setIsModalOpen(false);
    // Pass pre-filled date via query param or state if complex, using location for simplicity
    if (selectedDate) {
      setLocation(`/booking/create?date=${format(selectedDate, 'yyyy-MM-dd')}`);
    } else {
      setLocation(`/booking/create`);
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage hall availability and upcoming events</p>
        </div>
        <Button onClick={() => setLocation("/booking/create")} className="shadow-md shadow-primary/20 hover-elevate w-full sm:w-auto touch-target">
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      <div>
        <CalendarView events={events} onDateClick={handleDateClick} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Events on this day</h3>

            {dayEvents.length === 0 ? (
              <div className="bg-muted/30 rounded-xl p-8 text-center border border-border border-dashed">
                <p className="text-muted-foreground font-medium">No events scheduled.</p>
                <p className="text-sm text-muted-foreground mt-1">The hall is available for booking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayEvents.map(evt => (
                  <div key={evt.id} className={`p-4 rounded-xl border flex gap-4 ${evt.type === 'booked' ? 'bg-destructive/5 border-destructive/20' : 'bg-yellow-50 border-yellow-200'
                    }`}>
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${evt.type === 'booked' ? 'bg-destructive' : 'bg-yellow-500'}`} />
                    <div>
                      <h4 className="font-bold text-foreground">{evt.title}</h4>
                      <p className="text-sm flex items-center gap-1.5 mt-1 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(evt.startDate), "MMM d")} - {format(new Date(evt.endDate), "MMM d")}
                      </p>
                      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${evt.type === 'booked' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {evt.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border mt-6">
              <Button onClick={handleCreateBooking} className="w-full h-12 shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Book this Date
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
