import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth, parseWithLogging } from "@/lib/api";

export function useCalendarEvents() {
  return useQuery({
    queryKey: [api.calendar.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.calendar.list.path);
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      const data = await res.json();
      return parseWithLogging(api.calendar.list.responses[200], data, "calendar.list");
    },
  });
}
