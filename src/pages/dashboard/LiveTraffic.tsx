import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Activity,
  Users,
  Bot,
  AlertTriangle,
  RefreshCw,
  Globe,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(188, 85%, 53%)",
  "hsl(0, 84%, 60%)",
];

interface TrafficData {
  id: string;
  timestamp: Date;
  type: "human" | "bot" | "suspicious";
  ip: string;
  path: string;
  confidence: number;
  websiteId: string;
  userAgent: string;
}

interface Website {
  id: string;
  domain: string;
}

export default function LiveTraffic() {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState("all");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    humans: 0,
    bots: 0,
    suspicious: 0,
  });

  const navigate = useNavigate();

  /* ---------------- FETCH WEBSITES ---------------- */

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      navigate("/dashboard/login");
      return;
    }

    const fetchWebsites = async () => {
      const ref = collection(db, "users", user.uid, "websites");

      const snapshot = await getDocs(ref);

      const sites = snapshot.docs.map((doc) => ({
        id: doc.id,
        domain: doc.data().domain,
      }));

      setWebsites(sites);
    };

    fetchWebsites();
  }, [navigate]);

  /* ---------------- LIVE TRAFFIC ---------------- */

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    setLoading(true);

    const trafficRef = collection(db, "users", user.uid, "traffic");

    let q;

    if (selectedWebsite !== "all") {
      q = query(
        trafficRef,
        where("websiteId", "==", selectedWebsite),
        orderBy("timestamp", "desc"),
        limit(100)
      );
    } else {
      q = query(trafficRef, orderBy("timestamp", "desc"), limit(100));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate() || new Date(),
        })) as TrafficData[];

        setTrafficData(data);

        const humans = data.filter(
          (d) => d.type === "human"
        ).length;

        const bots = data.filter(
          (d) => d.type === "bot"
        ).length;

        const suspicious = data.filter(
          (d) => d.type === "suspicious"
        ).length;

        setStats({
          total: data.length,
          humans,
          bots,
          suspicious,
        });

        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [selectedWebsite]);

  /* ---------------- CHART DATA ---------------- */

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const hour = new Date();

    hour.setHours(hour.getHours() - (11 - i));

    const hourTraffic = trafficData.filter(
      (d) =>
        d.timestamp.getHours() === hour.getHours()
    );

    return {
      time: `${hour.getHours()}:00`,
      human: hourTraffic.filter(
        (d) => d.type === "human"
      ).length,

      bot: hourTraffic.filter(
        (d) =>
          d.type === "bot" ||
          d.type === "suspicious"
      ).length,
    };
  });

  const pieData = [
    { name: "Humans", value: stats.humans },
    { name: "Good Bots", value: 0 },
    {
      name: "Bad Bots",
      value: stats.bots + stats.suspicious,
    },
  ];

  const latestTraffic = trafficData.slice(0, 20);

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-5 pb-10">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <h1 className="text-xl sm:text-2xl font-bold">
          Live Traffic
        </h1>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">

          <select
            value={selectedWebsite}
            onChange={(e) =>
              setSelectedWebsite(e.target.value)
            }
            className="
              w-full sm:w-auto
              bg-background/50
              border border-border
              rounded-lg
              px-3 py-2
              text-sm
            "
          >
            <option value="all">
              All Websites
            </option>

            {websites.map((site) => (
              <option
                key={site.id}
                value={site.id}
              >
                {site.domain}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() =>
              window.location.reload()
            }
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* STATS */}

      <div className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-4
        gap-4
      ">

        {/* TOTAL */}

        <StatCard
          icon={<Activity size={16} />}
          label="Total Requests"
          value={stats.total}
          sub="Last 100 requests"
        />

        {/* HUMANS */}

        <StatCard
          icon={<Users size={16} />}
          label="Humans"
          value={stats.humans}
          valueColor="text-accent"
          sub={`${percent(stats.humans, stats.total)}% traffic`}
        />

        {/* BOTS */}

        <StatCard
          icon={<Bot size={16} />}
          label="Bots"
          value={stats.bots}
          valueColor="text-destructive"
          sub={`${percent(stats.bots, stats.total)}% traffic`}
        />

        {/* SUSPICIOUS */}

        <StatCard
          icon={<AlertTriangle size={16} />}
          label="Suspicious"
          value={stats.suspicious}
          valueColor="text-yellow-500"
          sub="Needs review"
        />

      </div>

      {/* CHARTS */}

      <div className="
        grid
        grid-cols-1
        lg:grid-cols-3
        gap-5
      ">

        {/* BAR */}

        <div className="
          glass
          rounded-xl
          p-4
          lg:col-span-2
        ">

          <h3 className="text-sm font-semibold mb-3">
            Traffic (12 hours)
          </h3>

          <div className="w-full h-[260px] sm:h-[300px]">

            <ResponsiveContainer>

              <BarChart data={chartData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis fontSize={10} />

                <YAxis fontSize={10} />

                <Tooltip />

                <Bar
                  dataKey="human"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="bot"
                  radius={[4, 4, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

        {/* PIE */}

        <div className="
          glass
          rounded-xl
          p-4
        ">

          <h3 className="text-sm font-semibold mb-3">
            Distribution
          </h3>

          <div className="h-[240px]">

            <ResponsiveContainer>

              <PieChart>

                <Pie
                  data={pieData}
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                >

                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i]}
                    />
                  ))}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>

      {/* LIVE FEED */}

      <div className="glass rounded-xl p-4">

        <div className="
          flex
          items-center
          justify-between
          mb-3
        ">

          <h3 className="text-sm font-semibold">
            Live Feed
          </h3>

          <span className="text-xs text-accent">
            ● LIVE
          </span>

        </div>

        <div className="
          space-y-2
          max-h-[350px]
          overflow-y-auto
        ">

          {latestTraffic.length === 0 ? (

            <EmptyState />

          ) : (

            latestTraffic.map((item) => (

              <FeedItem
                key={item.id}
                item={item}
              />

            ))

          )}

        </div>

      </div>

    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function StatCard({
  icon,
  label,
  value,
  sub,
  valueColor = "",
}: any) {
  return (
    <div className="glass rounded-xl p-4">

      <div className="
        flex items-center gap-2
        text-xs text-muted-foreground
      ">
        {icon}
        {label}
      </div>

      <div
        className={`text-2xl font-bold ${valueColor}`}
      >
        {value}
      </div>

      <div className="text-xs text-muted-foreground">
        {sub}
      </div>

    </div>
  );
}

function FeedItem({ item }: any) {
  return (
    <div className="
      p-3
      rounded-lg
      bg-muted/30
      text-xs sm:text-sm
    ">

      <div className="flex justify-between">

        <div className="truncate">

          {item.ip}

          <span className="text-muted-foreground ml-1">
            {item.path}
          </span>

        </div>

        <span className="capitalize">
          {item.type}
        </span>

      </div>

      <div className="
        text-muted-foreground
        flex items-center gap-2 mt-1
      ">

        <Clock size={12} />

        {item.timestamp.toLocaleTimeString()}

      </div>

    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">

      <Globe className="
        mx-auto mb-2 opacity-40
      " />

      <div className="text-sm">
        No traffic yet
      </div>

    </div>
  );
}

function percent(val: number, total: number) {
  if (!total) return 0;
  return ((val / total) * 100).toFixed(1);
}