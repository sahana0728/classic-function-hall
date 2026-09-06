import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { fetchWithAuth, parseWithLogging } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useDeleteEnquiry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(buildUrl(api.enquiries.delete.path, { id }), {
        method: api.enquiries.delete.method,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to delete enquiry");
      return parseWithLogging(api.enquiries.delete.responses[200], data, "enquiries.delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.enquiries.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.calendar.list.path] });
      queryClient.invalidateQueries({ queryKey: ["notifications-enquiries"] });
      toast({ title: "Enquiry deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete enquiry", description: err.message, variant: "destructive" });
    },
  });
}
