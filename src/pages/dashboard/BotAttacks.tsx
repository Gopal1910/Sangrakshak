import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Globe, Filter, Calendar, Download, Loader2, MapPin, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

interface Attack {
  id: string;
  ip: string;
  country: string;
  city?: string;
  type: "Credential Stuffing" | "Web Scraping" | "DDoS Attempt" | "Account Takeover" | "Form Spam" | "API Abuse" | "Click Fraud";
  score: number;
  timestamp: Date;
  status: "Blocked" | "Flagged" | "Monitoring";
  userAgent: string;
  path: string;
  websiteId: string;
  websiteDomain?: string;
}

interface Website {
  id: string;
  domain: string;
}

export default function BotAttacks() {
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("24h");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchIP, setSearchIP] = useState("");
  
  const navigate = useNavigate();

  // Fetch websites
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/dashboard/login");
      return;
    }

    const fetchWebsites = async () => {
      const websitesRef = collection(db, "users", user.uid, "websites");
      const snapshot = await getDocs(websitesRef);
      const sites = snapshot.docs.map(doc => ({
        id: doc.id,
        domain: doc.data().domain
      }));
      setWebsites(sites);
    };

    fetchWebsites();
  }, [navigate]);

  // Real-time attacks listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    // Build query
    const attacksRef = collection(db, "users", user.uid, "attacks");
    let q;
    
    // Time filter
    const timeLimit = new Date();
    if (timeFilter === "1h") timeLimit.setHours(timeLimit.getHours() - 1);
    else if (timeFilter === "24h") timeLimit.setHours(timeLimit.getHours() - 24);
    else if (timeFilter === "7d") timeLimit.setDate(timeLimit.getDate() - 7);
    else if (timeFilter === "30d") timeLimit.setDate(timeLimit.getDate() - 30);

    if (selectedWebsite !== "all") {
      q = query(
        attacksRef,
        where("websiteId", "==", selectedWebsite),
        where("timestamp", ">=", timeLimit),
        orderBy("timestamp", "desc"),
        limit(100)
      );
    } else {
      q = query(
        attacksRef,
        where("timestamp", ">=", timeLimit),
        orderBy("timestamp", "desc"),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attackData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          // Map country codes to names
          country: data.country || getCountryFromIP(data.ip),
          websiteDomain: websites.find(w => w.id === data.websiteId)?.domain || 'Unknown'
        };
      }) as Attack[];
      
      // Apply status filter
      const filtered = statusFilter === "all" 
        ? attackData 
        : attackData.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase());
      
      // Apply search filter
      const searched = searchIP 
        ? filtered.filter(a => a.ip.includes(searchIP))
        : filtered;
      
      setAttacks(searched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching attacks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedWebsite, timeFilter, statusFilter, searchIP, websites]);

  // Helper function to get country from IP (simplified)
  const getCountryFromIP = (ip: string): string => {
    // This would normally call a geo-IP service
    const countries = ["US", "CN", "RU", "IN", "BR", "GB", "DE", "FR", "JP", "KR"];
    return countries[Math.floor(Math.random() * countries.length)];
  };

  // Get time ago string
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
  };

  // Export to CSV
  const exportToCSV = () => {
    const csv = attacks.map(a => 
      `${a.ip},${a.country},${a.type},${a.score},${a.timestamp.toISOString()},${a.status}`
    ).join('\n');
    
    const blob = new Blob([`IP,Country,Type,Score,Time,Status\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attacks-${new Date().toISOString()}.csv`;
    a.click();
  };

  // Stats
  const totalAttacks = attacks.length;
  const blockedAttacks = attacks.filter(a => a.status === "Blocked").length;
  const flaggedAttacks = attacks.filter(a => a.status === "Flagged").length;
  const avgScore = attacks.length > 0 
    ? Math.round(attacks.reduce((sum, a) => sum + a.score, 0) / attacks.length) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Bot Attacks</h1>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
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
          <p className="text-3xl font-bold">{totalAttacks}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Shield className="h-4 w-4" /> Blocked
          </div>
          <p className="text-3xl font-bold text-destructive">{blockedAttacks}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <AlertTriangle className="h-4 w-4" /> Flagged
          </div>
          <p className="text-3xl font-bold text-yellow-500">{flaggedAttacks}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Globe className="h-4 w-4" /> Avg. Threat Score
          </div>
          <p className="text-3xl font-bold">{avgScore}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <select
            value={selectedWebsite}
            onChange={(e) => setSelectedWebsite(e.target.value)}
            className="bg-background/50 border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Websites</option>
            {websites.map(site => (
              <option key={site.id} value={site.id}>{site.domain}</option>
            ))}
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-background/50 border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background/50 border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Status</option>
            <option value="blocked">Blocked</option>
            <option value="flagged">Flagged</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search IP..."
              value={searchIP}
              onChange={(e) => setSearchIP(e.target.value)}
              className="bg-background/50 border-border h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Attacks Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : attacks.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No attacks detected</h3>
            <p className="text-sm text-muted-foreground">
              Your websites are safe! No bot attacks in this period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-heading text-xs tracking-wider text-muted-foreground">IP Address</th>
                  <th className="px-4 py-3 font-heading text-xs tracking-wider text-muted-foreground">Location</th>
                  <th className="px-4 py-3 font-heading text-xs tracking-wider text-muted-foreground">Attack Type</th>
                  <th className="px-4 py-3 font-heading text-xs tracking-wider text-muted-foreground">Threat Score</th>
                  <th className="px-4 py-3 font-heading text-xs tracking-wider text-muted-foreground">Website</th>
                  <th className="px-4 py-3 font-heading text-xs tracking-wider text-muted-foreground">Time</th>
                  <th className="px-4 py-3 font-heading text-xs tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {attacks.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{a.ip}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {a.country}
                      </div>
                    </td>
                    <td className="px-4 py-3">{a.type}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              a.score >= 90 ? "bg-destructive" :
                              a.score >= 75 ? "bg-yellow-500" :
                              "bg-accent"
                            }`}
                            style={{ width: `${a.score}%` }}
                          />
                        </div>
                        <span className={`font-heading font-bold text-xs ${
                          a.score >= 90 ? "text-destructive" :
                          a.score >= 75 ? "text-yellow-500" :
                          "text-accent"
                        }`}>
                          {a.score}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.websiteDomain || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{getTimeAgo(a.timestamp)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        a.status === "Blocked" 
                          ? "bg-destructive/10 text-destructive" 
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}