import { useState, useEffect } from "react";
import { ShieldCheck, Activity, Bug, Globe2, Loader2, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { auth, db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Stats {
  label: string;
  value: string;
  icon: any;
  change: string;
  trend: 'up' | 'down';
}

interface TrafficData {
  hour: string;
  humans: number;
  bots: number;
  timestamp: Date;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [websitesCount, setWebsitesCount] = useState(0);
  
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/dashboard/login");
      return;
    }

    fetchDashboardData();
    
    // Set up real-time listener for traffic
    const unsubscribe = setupTrafficListener(user.uid);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  const setupTrafficListener = (userId: string) => {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const trafficRef = collection(db, "users", userId, "traffic");
      const q = query(
        trafficRef,
        where("timestamp", ">=", yesterday),
        orderBy("timestamp", "asc")
      );

      return onSnapshot(q, (snapshot) => {
        // Group by hour
        const hourlyData = new Map<string, { humans: number; bots: number }>();
        
        // Initialize last 24 hours
        for (let i = 0; i < 24; i++) {
          const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
          const hourKey = hour.getHours().toString().padStart(2, '0') + ':00';
          hourlyData.set(hourKey, { humans: 0, bots: 0 });
        }

        // Process traffic data
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate();
          if (timestamp) {
            const hourKey = timestamp.getHours().toString().padStart(2, '0') + ':00';
            const current = hourlyData.get(hourKey) || { humans: 0, bots: 0 };
            
            if (data.type === 'human') {
              current.humans += 1;
            } else if (data.type === 'bot' || data.type === 'suspicious') {
              current.bots += 1;
            }
            
            hourlyData.set(hourKey, current);
          }
        });

        // Convert to array
        const chartArray = Array.from(hourlyData.entries()).map(([hour, data]) => ({
          hour,
          humans: data.humans,
          bots: data.bots
        }));

        setTrafficData(chartArray);
      }, (error) => {
        console.error("Traffic listener error:", error);
      });
    } catch (error) {
      console.error("Error setting up traffic listener:", error);
      return null;
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Fetch websites
      const websitesRef = collection(db, "users", user.uid, "websites");
      const websitesSnap = await getDocs(websitesRef);
      const totalSites = websitesSnap.size;
      setWebsitesCount(totalSites);

      // Fetch attacks from last 24h
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      let totalAttacks = 0;
      let totalSessions = 0;
      let totalBotScore = 0;
      let botScoreCount = 0;
      
      // Get previous period for trends (24h before that)
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      
      let prevTotalAttacks = 0;

      // Loop through each website
      for (const websiteDoc of websitesSnap.docs) {
        const websiteId = websiteDoc.id;
        
        // Current period attacks
        const attacksRef = collection(db, "users", user.uid, "websites", websiteId, "attacks");
        const currentQuery = query(
          attacksRef,
          where("timestamp", ">=", yesterday),
          where("timestamp", "<=", now)
        );
        const currentSnap = await getDocs(currentQuery);
        totalAttacks += currentSnap.size;
        
        // Previous period attacks
        const prevQuery = query(
          attacksRef,
          where("timestamp", ">=", twoDaysAgo),
          where("timestamp", "<", yesterday)
        );
        const prevSnap = await getDocs(prevQuery);
        prevTotalAttacks += prevSnap.size;
        
        // Calculate bot scores
        currentSnap.forEach(doc => {
          const data = doc.data();
          if (data.confidence) {
            totalBotScore += data.confidence;
            botScoreCount++;
          }
        });
        
        // Count active sessions (unique IPs in last 5 minutes)
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const sessionsRef = collection(db, "users", user.uid, "websites", websiteId, "sessions");
        const sessionsQuery = query(
          sessionsRef,
          where("lastSeen", ">=", fiveMinsAgo)
        );
        const sessionsSnap = await getDocs(sessionsQuery);
        totalSessions += sessionsSnap.size;
      }

      // Calculate trends
      const attackTrend = prevTotalAttacks > 0 
        ? ((totalAttacks - prevTotalAttacks) / prevTotalAttacks * 100).toFixed(1)
        : "+100";
      
      const avgBotScore = botScoreCount > 0 
        ? (totalBotScore / botScoreCount).toFixed(1)
        : "0";

      // Set stats
      setStats([
        { 
          label: "Threats Blocked", 
          value: totalAttacks.toLocaleString(), 
          icon: ShieldCheck, 
          change: `${parseFloat(attackTrend) > 0 ? '+' : ''}${attackTrend}%`,
          trend: parseFloat(attackTrend) > 0 ? 'up' : 'down'
        },
        { 
          label: "Active Sessions", 
          value: totalSessions.toLocaleString(), 
          icon: Activity, 
          change: "+7%", // You can calculate this similarly
          trend: 'up'
        },
        { 
          label: "Bot Score Avg", 
          value: avgBotScore, 
          icon: Bug, 
          change: botScoreCount > 0 ? "-5%" : "0%",
          trend: 'down'
        },
        { 
          label: "Protected Sites", 
          value: totalSites.toString(), 
          icon: Globe2, 
          change: totalSites > 0 ? `+${totalSites}` : "0",
          trend: 'up'
        },
      ]);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
          <Button variant="ghost" size="sm" onClick={fetchDashboardData}>
            <Loader2 className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-xl p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <s.icon className="h-5 w-5 text-primary" />
              <span className={`text-xs font-medium ${
                s.trend === 'up' ? 'text-destructive' : 'text-accent'
              }`}>
                {s.change}
              </span>
            </div>
            <p className="font-heading text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Traffic Chart */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm font-semibold">Traffic Overview (24h)</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="text-xs text-muted-foreground">Humans</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive"></span>
              <span className="text-xs text-muted-foreground">Bots</span>
            </div>
          </div>
        </div>
        
        {trafficData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No traffic data available yet</p>
              <p className="text-xs">Add your website script to start collecting data</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="humans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bots" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
              <XAxis dataKey="hour" stroke="hsl(215, 20%, 55%)" fontSize={11} />
              <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} />
              <Tooltip
                contentStyle={{ 
                  background: "hsl(222, 40%, 8%)", 
                  border: "1px solid hsl(222, 30%, 16%)", 
                  borderRadius: 8, 
                  fontSize: 12 
                }}
              />
              <Area 
                type="monotone" 
                dataKey="humans" 
                stroke="hsl(217, 91%, 60%)" 
                fill="url(#humans)" 
                strokeWidth={2} 
              />
              <Area 
                type="monotone" 
                dataKey="bots" 
                stroke="hsl(0, 84%, 60%)" 
                fill="url(#bots)" 
                strokeWidth={2} 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick Actions */}
      {websitesCount === 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-heading text-sm font-semibold mb-1">Get Started with Sangrakshak AI</h3>
              <p className="text-sm text-muted-foreground">
                Add your first website to start protecting it from bots and attacks.
              </p>
            </div>
            <Button onClick={() => navigate("/dashboard/websites")}>
              Add Website
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}