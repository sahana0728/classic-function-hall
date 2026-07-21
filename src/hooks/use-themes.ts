import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth, parseWithLogging, getAuthToken, BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BACKEND = BASE_URL;

export function useThemes() {
  return useQuery({
    queryKey: [api.themes.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.themes.list.path);
      if (!res.ok) throw new Error("Failed to fetch themes");
      return await res.json();
    },
  });
}

export function useCreateTheme() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = getAuthToken();
      const res = await fetch(BACKEND + api.themes.create.path, {
        method: api.themes.create.method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create theme");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.themes.list.path] });
      toast({ title: "Theme created successfully" });
    },
    onError: (err) => {
      toast({ title: "Error creating theme", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const token = getAuthToken();
      const res = await fetch(`${BACKEND}/api/themes/${id}`, {
        method: "PUT",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update theme");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.themes.list.path] });
      toast({ title: "Theme updated successfully" });
    },
    onError: (err) => {
      toast({ title: "Error updating theme", description: err.message, variant: "destructive" });
    }
  });
}

export function useAddThemeMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ themeId, files }: { themeId: number; files: File[] }) => {
      const token = getAuthToken();
      const fd = new FormData();
      files.forEach(f => fd.append('media', f));
      const res = await fetch(`${BACKEND}/api/themes/${themeId}/media`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });
      if (!res.ok) throw new Error("Failed to add media");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.themes.list.path] });
      toast({ title: "Media added" });
    },
  });
}

export function useDeleteThemeMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ themeId, mediaId }: { themeId: number; mediaId: number }) => {
      const res = await fetchWithAuth(`/api/themes/${themeId}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.themes.list.path] });
    },
  });
}

export function useDeleteTheme() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (themeId: number) => {
      const res = await fetchWithAuth(`/api/themes/${themeId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete theme");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.themes.list.path] });
      toast({ title: "Theme deleted" });
    },
    onError: (err) => {
      // Make error message user-friendly
      let message = err.message;
      if (message.includes('foreign key') || message.includes('violates')) {
        message = "This theme is currently being used in a booking and cannot be deleted.";
      }
      toast({ title: "Cannot Delete Theme", description: message, variant: "destructive" });
    },
  });
}
