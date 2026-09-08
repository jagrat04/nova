import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DashboardData } from "../lib/types";

export function useDashboard(days = 14) {
  return useQuery({
    queryKey: ["dashboard", days],
    queryFn: () => api.get<DashboardData>(`/dashboard?days=${days}`),
  });
}
