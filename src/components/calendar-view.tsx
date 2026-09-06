import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: "booked" | "enquiry";
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateClick: (date: Date, dayEvents: CalendarEvent[]) => void;
}

export function CalendarView({ events, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDay = (day: Date) => {
    return events.filter((e) => {
      // Create local dates stripping time components
      const eventStart = new Date(e.startDate);
      const eventEnd = new Date(e.endDate);
      const s = startOfDay(new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()));
      const eDate = endOfDay(new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate()));
      return day >= s && day <= eDate;
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
        <h2 className="text-2xl font-display font-bold text-primary">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              onDateClick(today, getEventsForDay(today));
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekDays.map((day) => (
          <div key={day} className="py-3 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-border gap-[1px]">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);

          let bgColor = "bg-card";
          if (!isCurrentMonth) bgColor = "bg-muted/30";
          if (isToday(day)) bgColor = "bg-primary/5";

          // Calculate status colors
          const hasBooking = dayEvents.some(e => e.type === "booked");
          const hasEnquiry = dayEvents.some(e => e.type === "enquiry");

          let statusIndicator = null;
          if (hasBooking) {
            statusIndicator = "bg-destructive";
          } else if (hasEnquiry) {
            statusIndicator = "bg-yellow-400";
          } else if (isCurrentMonth) {
            statusIndicator = "bg-green-500";
          }

          return (
            <div
              key={day.toString()}
              onClick={() => onDateClick(day, dayEvents)}
              className={`${bgColor} min-h-[60px] sm:min-h-[120px] p-1.5 sm:p-2 transition-all hover:bg-primary/10 cursor-pointer flex flex-col group relative`}
            >
              <div className="flex justify-between items-start mb-1 sm:mb-2">
                <span className={`text-xs sm:text-sm font-semibold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full
                  ${isToday(day) ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                `}>
                  {format(day, "d")}
                </span>

                {statusIndicator && (
                  <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${statusIndicator} shadow-sm`} />
                )}
              </div>

              <div className="hidden sm:block flex-1 overflow-y-auto space-y-1 mt-1 px-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs px-2 py-1 rounded truncate shadow-sm font-medium
                      ${event.type === "booked" ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-yellow-100 text-yellow-800 border border-yellow-200"}
                    `}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground font-medium pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-muted/20 flex gap-6 text-sm text-muted-foreground font-medium justify-center">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Available</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400" /> Enquiry</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive" /> Booked</div>
      </div>
    </div>
  );
}
