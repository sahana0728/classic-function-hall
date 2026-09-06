import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { fetchWithAuth, parseWithLogging } from "@/lib/api";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

type BookingInput = z.infer<typeof api.bookings.create.input>;

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.bookings.list.path);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const data = await res.json();
      return parseWithLogging(api.bookings.list.responses[200], data, "bookings.list");
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (booking: BookingInput) => {
      // Coerce inputs
      const payload = {
        ...booking,
        totalAmount: booking.totalAmount === null || booking.totalAmount === undefined
          ? null
          : Number(booking.totalAmount),
        advancePaid: booking.advancePaid === null || booking.advancePaid === undefined
          ? null
          : Number(booking.advancePaid),
        themeId: booking.themeId ? Number(booking.themeId) : null,
      };

      const res = await fetchWithAuth(api.bookings.create.path, {
        method: api.bookings.create.method,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }
      return parseWithLogging(api.bookings.create.responses[201], data, "bookings.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.calendar.list.path] });
      toast({ title: "Booking created successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to create booking", description: err.message, variant: "destructive" });
    }
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(buildUrl(api.bookings.delete.path, { id }), {
        method: api.bookings.delete.method,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to delete booking");
      return parseWithLogging(api.bookings.delete.responses[200], data, "bookings.delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.calendar.list.path] });
      toast({ title: "Booking deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete booking", description: err.message, variant: "destructive" });
    },
  });
}
