import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Key, Globe, RefreshCw, Eye, EyeOff, Download, Code, Shield, AlertCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Website {
  id: string;
  domain: string;
  scriptId: string;
  apiKey?: string;
}

export default function ApiSdk() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch websites on load
  useEffect(() => {
    console.log("ApiSdk component mounted");
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    console.log("Checking user...");
    const user = auth.currentUser;
    console.log("Current user:", user);
    
    if (!user) {
      console.log("No user found, redirecting to login");
      navigate("/dashboard/login");
      return;
    }

    await fetchWebsites();
  };

  const fetchWebsites = async () => {
    console.log("Fetching websites...");
    const user = auth.currentUser;
    if (!user) {
      console.log("No user in fetchWebsites");
      return;
    }

    try {
      setError(null);
      const websitesRef = collection(db, "users", user.uid, "websites");
      console.log("Websites ref:", websitesRef.path);
      
      const snapshot = await getDocs(websitesRef);
      console.log("Snapshot size:", snapshot.size);
      
      if (snapshot.empty) {
        console.log("No websites found");
        setWebsites([]);
        setLoading(false);
        return;
      }
      
      const sites = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Website data:", data);
        return {
          id: doc.id,
          domain: data.domain || "Unknown",
          scriptId: data.scriptId || generateScriptId(doc.id),
          apiKey: data.apiKey
        };
      });

      console.log("Processed sites:", sites);
      setWebsites(sites);
      
      // Select first website if available
      if (sites.length > 0) {
        setSelectedWebsite(sites[0].id);
        setApiKey(sites[0].apiKey || generateApiKey(sites[0].id));
      }
    } catch (error: any) {
      console.error("Error fetching websites:", error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to load websites: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateScriptId = (websiteId: string): string => {
    return `sang_${websiteId.substring(0, 8)}_${Date.now().toString(36)}`;
  };

  const generateApiKey = (websiteId: string): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const prefix = 'sk_live_';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + result;
  };

  const regenerateApiKey = async () => {
    if (!selectedWebsite) return;

    setRegenerating(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      const newApiKey = generateApiKey(selectedWebsite);
      
      // Update in Firestore
      const websiteRef = doc(db, "users", user.uid, "websites", selectedWebsite);
      await updateDoc(websiteRef, {
        apiKey: newApiKey,
        updatedAt: new Date().toISOString()
      });

      setApiKey(newApiKey);
      
      toast({
        title: "Success",
        description: "API key regenerated successfully",
      });
    } catch (error: any) {
      console.error("Error regenerating API key:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate API key: " + error.message,
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadScript = (website: Website) => {
    const script = `<!-- Sangrakshak AI Protection - ${website.domain} -->
<script>
  (function() {
    window._sangrakshak = {
      websiteId: "${website.scriptId}",
      apiKey: "${website.apiKey || ''}",
      endpoint: "https://api.sangrakshak.ai/v1/verify",
      domain: "${website.domain}"
    };
    
    var s = document.createElement('script');
    s.src = "https://cdn.sangrakshak.ai/v1/protect.min.js";
    s.async = true;
    s.setAttribute('data-site-id', "${website.scriptId}");
    document.head.appendChild(s);
  })();
</script>`;

    const blob = new Blob([script], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sangrakshak-${website.domain}.html`;
    a.click();
  };

  const getScriptForWebsite = (website: Website): string => {
    return `<!-- Sangrakshak AI Protection - ${website.domain} -->
<script src="https://cdn.sangrakshak.ai/v1/protect.min.js"
        data-site-id="${website.scriptId}"
        data-api-key="${website.apiKey || ''}"
        data-endpoint="https://api.sangrakshak.ai/v1/verify"
        async>
</script>`;
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading integration details...</p>
        </div>
      </div>
    );
  }

  // No websites state
  if (websites.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">API & SDK</h1>
        <div className="glass rounded-xl p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No websites added yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Add a website first to get integration scripts and API keys for protecting your site.
          </p>
          <Button onClick={() => navigate("/dashboard/websites")}>
            Add Your First Website
          </Button>
        </div>
      </div>
    );
  }

  const selectedWebsiteData = websites.find(w => w.id === selectedWebsite);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API & SDK</h1>

      {/* Website Selector */}
      <div className="glass rounded-xl p-5">
        <label className="text-sm text-muted-foreground mb-2 block">Select Website</label>
        <select
          value={selectedWebsite}
          onChange={(e) => {
            setSelectedWebsite(e.target.value);
            const site = websites.find(w => w.id === e.target.value);
            setApiKey(site?.apiKey || generateApiKey(site?.id || ''));
          }}
          className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm"
        >
          {websites.map(site => (
            <option key={site.id} value={site.id}>{site.domain}</option>
          ))}
        </select>
      </div>

      {selectedWebsiteData && (
        <>
          {/* Integration Script */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" /> Integration Script
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadScript(selectedWebsiteData)}
              >
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Paste this script tag before the closing <code className="text-accent bg-muted/30 px-1 py-0.5 rounded">&lt;/head&gt;</code> tag.
            </p>
            
            <div className="relative">
              <pre className="bg-background/80 rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto border border-border whitespace-pre-wrap">
                {getScriptForWebsite(selectedWebsiteData)}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={() => copyText(getScriptForWebsite(selectedWebsiteData), "Script")}
              >
                {copied === "Script" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> API Key
            </h3>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={showApiKey ? apiKey : apiKey.replace(/.(?=.{4})/g, '•')}
                  className="bg-background/50 border-border font-mono text-xs pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyText(apiKey, "API Key")}
                disabled={!apiKey}
              >
                {copied === "API Key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={regenerateApiKey}
                disabled={regenerating}
              >
                <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              ⚠️ Keep your API key secure. Do not share it publicly.
            </p>
          </div>
        </>
      )}
    </div>
  );
}