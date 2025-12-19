"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import GrowthChart from "@/components/GrowthChart";
import { getProfileGrowth } from "@/lib/analytics";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) return;
      // Fetch profile views and pin count
      const { data: profile } = await supabase
        .from("users")
        .select("view_count, pin_count")
        .eq("id", user.id)
        .maybeSingle();
      setStats(profile);
      // Fetch growth data
      const { data: growthData } = await getProfileGrowth(user.id);
      setGrowth(growthData || []);
      setLoading(false);
    }
    fetchStats();
  }, []);

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Your Dashboard</h1>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="text-base sm:text-lg">Total profile views: <span className="font-bold">{stats?.view_count ?? 0}</span></div>
            <div className="text-base sm:text-lg mt-2">Total pin count: <span className="font-bold">{stats?.pin_count ?? 0}</span></div>
          </div>
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold mb-3 sm:mb-4">Growth over time</h2>
            <GrowthChart data={growth} />
          </div>
        </div>
      )}
    </main>
  );
}
