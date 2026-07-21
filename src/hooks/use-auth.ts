import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth, setAuthToken, clearAuthToken, parseWithLogging } from "@/lib/api";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

type LoginInput = z.infer<typeof api.auth.login.input>;

export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.auth.me.path);
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      const data = await res.json();
      return parseWithLogging(api.auth.me.responses[200], data, "auth.me").user;
    },
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await fetchWithAuth(api.auth.login.path, {
        method: api.auth.login.method,
        body: JSON.stringify(credentials),
      });
      
      const data = await res.json();
      if (!res.ok) {
        const error = parseWithLogging(api.auth.login.responses[401], data, "auth.login.error");
        throw new Error(error.message);
      }
      
      return parseWithLogging(api.auth.login.responses[200], data, "auth.login.success");
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({
        title: "Welcome back",
        description: `Successfully logged in as ${data.user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const logout = () => {
    clearAuthToken();
    queryClient.setQueryData([api.auth.me.path], null);
    window.location.href = "/login";
  };

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout
  };
}
