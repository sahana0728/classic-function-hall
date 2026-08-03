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
    endOfDay,
    isBefore
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PublicCalendarEvent {
    startDate: string;
    endDate: string;
    type: "booked" | "enquiry";
}

interface PublicCalendarProps {
    events: PublicCalendarEvent[];
}

export function PublicCalendar({ events }: PublicCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getEventsForDay = (day: Date) => {
        return events.filter((e) => {
            const s = startOfDay(new Date((e as any).blockedStartDate || e.startDate));
            const eDate = endOfDay(new Date(e.endDate));
            return day >= s && day <= eDate;
        });
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700">
                <h2 className="text-xl font-bold text-white tracking-wide">
                    {format(currentDate, "MMMM yyyy")}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                {weekDays.map((day) => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 bg-gray-100 gap-[1px]">
                {days.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isPast = isBefore(day, startOfDay(new Date())) && !isToday(day);
                    const hasBooking = dayEvents.some(e => e.type === "booked");

                    let bgColor = "bg-white";
                    if (!isCurrentMonth) bgColor = "bg-gray-50";
                    if (isToday(day)) bgColor = "bg-blue-50";

                    // Status: red for booked, green for available (current month only)
                    let dotColor = "";
                    if (hasBooking) {
                        dotColor = "bg-red-500";
                    } else if (isCurrentMonth && !isPast) {
                        dotColor = "bg-emerald-500";
                    }

                    return (
                        <div
                            key={day.toString()}
                            className={`${bgColor} min-h-[72px] md:min-h-[80px] p-2 flex flex-col items-center justify-start relative`}
                        >
                            <span
                                className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full
                  ${isToday(day) ? "bg-slate-800 text-white" : isCurrentMonth ? (isPast ? "text-gray-400" : "text-gray-800") : "text-gray-300"}
                `}
                            >
                                {format(day, "d")}
                            </span>
                            {dotColor && isCurrentMonth && (
                                <span className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shadow-sm`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-gray-100 flex gap-8 text-sm text-gray-600 font-medium justify-center bg-gray-50/50">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Available</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Booked</div>
            </div>
        </div>
    );
}
