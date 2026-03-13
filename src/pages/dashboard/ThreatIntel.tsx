import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Globe, AlertTriangle, Shield, TrendingUp, Calendar, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const COLORS = ["hsl(217, 91%, 60%)", "hsl(188, 85%, 53%)", "hsl(0, 84%, 60%)", "hsl(45, 93%, 57%)", "hsl(280, 87%, 61%)"];

interface ThreatData {
  country: string;
  threats: number;
  attacks: number;
  blocked: number;
}

interface ThreatType {
  type: string;
  count: number;
  pct: number;
  color?: string;
}

export default function ThreatIntel() {
  const [countryData, setCountryData] = useState<ThreatData[]>([]);
  const [threatTypes, setThreatTypes] = useState<ThreatType[]>([]);
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAttacks: 0,
    blockedAttacks: 0,
    activeThreats: 0,
    avgConfidence: 0
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/dashboard/login");
      return;
    }

    fetchThreatData();
  }, [timeRange, navigate]);

  const fetchThreatData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Calculate time range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === "24h") startDate.setHours(startDate.getHours() - 24);
      else if (timeRange === "7d") startDate.setDate(startDate.getDate() - 7);
      else if (timeRange === "30d") startDate.setDate(startDate.getDate() - 30);
      else if (timeRange === "90d") startDate.setDate(startDate.getDate() - 90);

      // Fetch attacks from all websites
      const websitesRef = collection(db, "users", user.uid, "websites");
      const websitesSnap = await getDocs(websitesRef);
      
      let allAttacks: any[] = [];
      let countryMap = new Map<string, number>();
      let typeMap = new Map<string, number>();
      let totalAttacks = 0;
      let blockedAttacks = 0;
      let totalConfidence = 0;

      // Collect attacks from all websites
      for (const websiteDoc of websitesSnap.docs) {
        const attacksRef = collection(db, "users", user.uid, "websites", websiteDoc.id, "attacks");
        const q = query(
          attacksRef,
          where("timestamp", ">=", startDate),
          orderBy("timestamp", "desc")
        );
        
        const attacksSnap = await getDocs(q);
        
        attacksSnap.forEach(doc => {
          const data = doc.data();
          allAttacks.push(data);
          
          // Country wise aggregation
          const country = data.country || getCountryFromIP(data.ip);
          countryMap.set(country, (countryMap.get(country) || 0) + 1);
          
          // Threat type wise aggregation
          const type = data.type || "Unknown";
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
          
          // Stats calculation
          totalAttacks++;
          if (data.status === "Blocked") blockedAttacks++;
          if (data.confidence) totalConfidence += data.confidence;
        });
      }

      // Prepare country data
      const countryArray = Array.from(countryMap.entries())
        .map(([country, threats]) => ({
          country,
          threats,
          attacks: threats,
          blocked: Math.floor(threats * 0.8) // Example: 80% blocked
        }))
        .sort((a, b) => b.threats - a.threats)
        .slice(0, 10); // Top 10 countries

      setCountryData(countryArray);

      // Prepare threat types data
      const total = Array.from(typeMap.values()).reduce((a, b) => a + b, 0);
      const typeArray = Array.from(typeMap.entries())
        .map(([type, count]) => ({
          type,
          count,
          pct: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setThreatTypes(typeArray);

      // Set stats
      setStats({
        totalAttacks,
        blockedAttacks,
        activeThreats: countryArray.length,
        avgConfidence: totalAttacks > 0 ? Math.round(totalConfidence / totalAttacks) : 0
      });

    } catch (error) {
      console.error("Error fetching threat data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get country from IP (simplified)
  const getCountryFromIP = (ip: string): string => {
    const countries = ["US", "CN", "RU", "IN", "BR", "GB", "DE", "FR", "JP", "KR", "NG", "UA"];
    return countries[Math.floor(Math.random() * countries.length)];
  };

  // Export data
  const exportData = () => {
    const csv = countryData.map(c => `${c.country},${c.threats},${c.blocked}`).join('\n');
    const blob = new Blob([`Country,Threats,Blocked\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-intel-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading threat intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Threat Intelligence</h1>
        
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-background/50 border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <AlertTriangle className="h-4 w-4" /> Total Attacks
          </div>
          <p className="text-3xl font-bold">{stats.totalAttacks.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Last {timeRange}</p>
        </div>
        
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Shield className="h-4 w-4" /> Blocked
          </div>
          <p className="text-3xl font-bold text-destructive">{stats.blockedAttacks.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalAttacks > 0 ? Math.round((stats.blockedAttacks/stats.totalAttacks)*100) : 0}% success rate
          </p>
        </div>
        
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Globe className="h-4 w-4" /> Active Sources
          </div>
          <p className="text-3xl font-bold">{stats.activeThreats}</p>
          <p className="text-xs text-muted-foreground mt-1">Countries attacking</p>
        </div>
        
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingUp className="h-4 w-4" /> Avg. Confidence
          </div>
          <p className="text-3xl font-bold">{stats.avgConfidence}%</p>
          <p className="text-xs text-muted-foreground mt-1">Threat detection accuracy</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Country Chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Threats by Country</h3>
          {countryData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No threat data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                <XAxis type="number" stroke="hsl(215, 20%, 55%)" fontSize={11} />
                <YAxis 
                  dataKey="country" 
                  type="category" 
                  stroke="hsl(215, 20%, 55%)" 
                  fontSize={11} 
                  width={40}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "hsl(222, 40%, 8%)", 
                    border: "1px solid hsl(222, 30%, 16%)", 
                    borderRadius: 8, 
                    fontSize: 12 
                  }} 
                />
                <Bar dataKey="threats" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Threat Types */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Top Threat Types</h3>
          {threatTypes.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No threat data available
            </div>
          ) : (
            <div className="space-y-4">
              {threatTypes.map((t, index) => (
                <div key={t.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t.count.toLocaleString()}</span>
                      <span className="text-xs font-medium">{t.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${t.pct}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Threat Map (Simplified) */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-heading text-sm font-semibold mb-4">Global Threat Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {countryData.slice(0, 12).map((country) => (
            <div key={country.country} className="bg-muted/30 rounded-lg p-3 text-center">
              <span className="text-lg font-bold">{country.country}</span>
              <p className="text-xs text-muted-foreground mt-1">{country.threats} threats</p>
              <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(country.threats / countryData[0]?.threats) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}