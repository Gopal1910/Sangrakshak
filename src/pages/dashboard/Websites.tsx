import { useState, useEffect } from "react";
import {
  Globe,
  ShieldCheck,
  ExternalLink,
  X,
  Plus,
  ArrowLeft,
  BarChart3,
  Clock,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { auth, db } from "@/lib/firebase/config";

import {
  collection,
  addDoc,
  query,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Website {
  id: string;
  domain: string;
  status: "Active" | "Monitoring" | "Inactive";
  threats: number;
  added: string;
  scriptId: string;
  settings: {
    protectionLevel: "high" | "medium" | "low";
    blockThreshold: number;
    enableML: boolean;
  };
}

export default function Websites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [selectedSite, setSelectedSite] =
    useState<Website | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scriptCopied, setScriptCopied] =
    useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      navigate("/dashboard/login");
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "websites")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Website[] = [];

      snap.forEach((doc) =>
        list.push({
          id: doc.id,
          ...doc.data(),
        } as Website)
      );

      setWebsites(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ---------------- ADD ---------------- */

  const handleAdd = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!newDomain.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);

    try {
      const scriptId =
        "sang_" +
        Math.random().toString(36).slice(2);

      await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "websites"
        ),
        {
          domain: newDomain,
          status: "Monitoring",
          threats: 0,
          added: new Date().toISOString(),
          scriptId,

          settings: {
            protectionLevel: "medium",
            blockThreshold: 85,
            enableML: true,
          },
        }
      );

      setShowAdd(false);
      setNewDomain("");

      toast({
        title: "Website added",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- DELETE ---------------- */

  const handleDelete = async (
    id: string
  ) => {
    if (!confirm("Delete website?"))
      return;

    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "websites",
        id
      )
    );

    setSelectedSite(null);
  };

  /* ---------------- STATUS ---------------- */

  const toggleProtection =
    async (site: Website) => {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(
        doc(
          db,
          "users",
          user.uid,
          "websites",
          site.id
        ),
        {
          status:
            site.status === "Active"
              ? "Monitoring"
              : "Active",
        }
      );
    };

  /* ---------------- COPY ---------------- */

  const copyScript = (
    scriptId: string
  ) => {
    const text = `<script>
window._sangrakshak={
websiteId:"${scriptId}"
}
</script>`;

    navigator.clipboard.writeText(text);

    setScriptCopied(true);

    setTimeout(
      () => setScriptCopied(false),
      2000
    );
  };

  /* ---------------- LOADING ---------------- */

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  /* ======================================================
     DETAILS PAGE
     ====================================================== */

  if (selectedSite)
    return (
      <div className="space-y-5 pb-10">

        <button
          onClick={() =>
            setSelectedSite(null)
          }
          className="
          flex items-center gap-2
          text-sm
        "
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* HEADER */}

        <div className="
        flex
        flex-col sm:flex-row
        sm:items-center
        gap-3
        ">

          <div className="flex items-center gap-2">

            <Globe size={22} />

            <h1 className="
            text-lg sm:text-2xl
            font-bold
            break-all
            ">
              {selectedSite.domain}
            </h1>

          </div>

          <Button
            size="sm"
            className="
            sm:ml-auto
            w-full sm:w-auto
            "
            onClick={() =>
              toggleProtection(
                selectedSite
              )
            }
          >
            Toggle Protection
          </Button>

        </div>

        {/* STATS */}

        <div className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        gap-4
        ">

          <Card
            icon={<ShieldCheck />}
            label="Threats"
            value={selectedSite.threats}
          />

          <Card
            icon={<Clock />}
            label="Added"
            value={new Date(
              selectedSite.added
            ).toLocaleDateString()}
          />

          <Card
            icon={<BarChart3 />}
            label="Protection"
            value={
              selectedSite.settings
                .protectionLevel
            }
          />

        </div>

        {/* SCRIPT */}

        <div className="
        glass p-4 rounded-xl
        ">

          <div className="
          text-sm font-semibold mb-2
          ">
            Integration Script
          </div>

          <div className="
          bg-muted
          p-3
          rounded
          text-xs
          overflow-x-auto
          ">
            {selectedSite.scriptId}
          </div>

          <div className="
          flex flex-col sm:flex-row gap-2 mt-3
          ">

            <Button
              onClick={() =>
                copyScript(
                  selectedSite.scriptId
                )
              }
              className="
              w-full sm:w-auto
              "
            >
              {scriptCopied
                ? "Copied"
                : "Copy Script"}
            </Button>

            <Button
              variant="destructive"
              onClick={() =>
                handleDelete(
                  selectedSite.id
                )
              }
              className="
              w-full sm:w-auto
              "
            >
              Delete
            </Button>

          </div>

        </div>

      </div>
    );

  /* ======================================================
     MAIN PAGE
     ====================================================== */

  return (
    <div className="space-y-5 pb-10">

      {/* HEADER */}

      <div className="
      flex
      flex-col sm:flex-row
      gap-3
      sm:items-center
      ">

        <h1 className="
        text-xl sm:text-2xl font-bold
        ">
          My Websites
        </h1>

        <Button
          onClick={() =>
            setShowAdd(true)
          }
          className="
          sm:ml-auto
          w-full sm:w-auto
          "
        >
          <Plus size={16} />
          Add Website
        </Button>

      </div>

      {/* EMPTY */}

      {websites.length === 0 && (

        <div className="
        glass
        p-8
        text-center
        rounded-xl
        ">

          <Globe
            className="mx-auto mb-3"
          />

          No websites yet

        </div>
      )}

      {/* GRID */}

      <div className="
      grid
      grid-cols-1
      sm:grid-cols-2
      lg:grid-cols-3
      gap-4
      ">

        {websites.map((w) => (

          <div
            key={w.id}
            className="
            glass
            p-4
            rounded-xl
            "
          >

            <div className="
            flex justify-between
            gap-2
            ">

              <div className="
              font-semibold
              break-all
              ">
                {w.domain}
              </div>

              <div className="
              text-xs
              ">
                {w.status}
              </div>

            </div>

            <div className="
            text-xs text-muted-foreground mt-1
            ">
              {w.threats} threats
            </div>

            <div className="
            flex gap-3 mt-3
            flex-wrap
            ">

              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSelectedSite(w)
                }
                className="
                w-full sm:w-auto
                "
              >
                Details
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyScript(
                    w.scriptId
                  )
                }
                className="
                w-full sm:w-auto
                "
              >
                Copy Script
              </Button>

            </div>

          </div>

        ))}

      </div>

      {/* MODAL */}

      {showAdd && (

        <div className="
        fixed inset-0
        flex items-center
        justify-center
        bg-black/50
        p-3
        ">

          <form
            onSubmit={handleAdd}
            className="
            bg-background
            p-5
            rounded-xl
            w-full
            max-w-md
            space-y-3
            "
          >

            <div className="
            flex justify-between
            ">

              <div className="font-bold">
                Add Website
              </div>

              <X
                className="cursor-pointer"
                onClick={() =>
                  setShowAdd(false)
                }
              />

            </div>

            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) =>
                setNewDomain(
                  e.target.value
                )
              }
            />

            <Button
              disabled={saving}
              className="
              w-full
              "
            >
              {saving
                ? "Adding..."
                : "Add"}
            </Button>

          </form>

        </div>

      )}

    </div>
  );
}

/* CARD */

function Card({
  icon,
  label,
  value,
}: any) {
  return (
    <div className="
    glass
    p-4
    rounded-xl
    ">

      <div className="
      text-xs text-muted-foreground
      flex gap-2 items-center
      ">
        {icon}
        {label}
      </div>

      <div className="
      text-lg font-bold
      ">
        {value}
      </div>

    </div>
  );
}