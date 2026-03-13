import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Crown, Zap, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function DashboardSettings() {
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Use ref to track if data has been loaded
  const dataLoadedRef = useRef(false);
  const userRef = useRef(auth.currentUser);

  // Fetch user data - SIRF EK BAAR
  useEffect(() => {
    // Agar data already loaded hai to phir se load mat karo
    if (dataLoadedRef.current) return;
    
    const fetchUserData = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        navigate("/dashboard/login");
        return;
      }

      // Agar same user hai to reload mat karo
      if (userRef.current?.uid === user.uid && dataLoadedRef.current) {
        setLoading(false);
        return;
      }

      userRef.current = user;

      try {
        // Set email from auth
        setEmail(user.email || "");
        setFullName(user.displayName || "");

        // Fetch user plan from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPlan(userData.plan || "free");
          if (userData.fullName) {
            setFullName(userData.fullName);
          }
        } else {
          // Create user document if it doesn't exist
          await setDoc(userDocRef, {
            email: user.email,
            fullName: user.displayName || "",
            plan: "free",
            createdAt: new Date().toISOString(),
          });
        }
        
        // Mark data as loaded
        dataLoadedRef.current = true;
        
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Cleanup function nahi chahiye kyunki hum ref use kar rahe hain
  }, [navigate, toast]); // Sirf navigate aur toast dependency mein rakho

  const handleSaveChanges = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);

    try {
      // Update displayName in Firebase Auth
      if (fullName !== user.displayName) {
        await updateProfile(user, {
          displayName: fullName,
        });
      }

      // Update Firestore user document
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        fullName: fullName,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = () => {
    setShowUpgrade(true);
  };

  const confirmUpgrade = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);

    try {
      // Update plan in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        plan: "premium",
        upgradedAt: new Date().toISOString(),
      });

      setPlan("premium");
      setShowUpgrade(false);

      toast({
        title: "Success! 🎉",
        description: "You've been upgraded to Premium plan",
      });
    } catch (error) {
      console.error("Error upgrading plan:", error);
      toast({
        title: "Error",
        description: "Failed to upgrade plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Show loading state with better UX
  if (loading) {
  return null; // Kuch bhi mat dikhao, seedha settings show karo jab data load ho jaye
}

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* User Info Banner */}
      <div className="glass rounded-xl p-4 bg-primary/5 border border-primary/20">
        <p className="text-sm">
          Logged in as: <span className="font-semibold">{email}</span>
        </p>
      </div>

      {/* Free / Premium Section */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" /> Your Plan
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-lg font-bold">
              {plan === "free" ? (
                <span className="text-muted-foreground">Free Plan</span>
              ) : (
                <span className="text-primary">Premium Plan</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {plan === "free" 
                ? "Basic bot detection · 1 website" 
                : "$49/month · Advanced AI protection with multiple websites"}
            </p>
          </div>
          {plan === "free" ? (
            <Button 
              size="sm" 
              className="bg-primary text-primary-foreground hover:bg-primary/90" 
              onClick={handleUpgrade}
              disabled={saving}
            >
              <Zap className="h-4 w-4 mr-1" /> Upgrade to Premium
            </Button>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-accent/10 text-accent font-medium flex items-center gap-1">
              <Crown className="h-3 w-3" /> Active
            </span>
          )}
        </div>

        {plan === "free" && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg border border-border p-4">
              <p className="font-heading text-sm font-bold mb-2">Free</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> 1 website</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Basic bot detection</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Community support</li>
              </ul>
            </div>
            <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4">
              <p className="font-heading text-sm font-bold mb-2 text-primary">Premium · $49/mo</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Multiple websites</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Advanced AI detection</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Real-time analytics</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Priority support</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Payment Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold text-center">Upgrade to Premium</h2>
            <p className="text-sm text-muted-foreground text-center">$49/month · Cancel anytime</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Card Number</label>
                <Input placeholder="4242 4242 4242 4242" className="bg-background/50 border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Expiry</label>
                  <Input placeholder="MM/YY" className="bg-background/50 border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">CVC</label>
                  <Input placeholder="123" className="bg-background/50 border-border" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowUpgrade(false)} disabled={saving}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="bg-primary text-primary-foreground hover:bg-primary/90" 
                onClick={confirmUpgrade}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay $49"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Account Details */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-heading text-sm font-semibold">Account Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
            <Input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="bg-background/50 border-border"
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input 
              value={email}
              disabled
              className="bg-background/50 border-border opacity-75 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
        </div>
        <Button 
          size="sm" 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSaveChanges}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* Notifications */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-heading text-sm font-semibold">Notifications</h3>
        <div className="space-y-3">
          {["Email alerts for critical threats", "Weekly summary reports", "New feature announcements"].map((label) => (
            <label key={label} className="flex items-center gap-3 text-sm cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border accent-primary" />
              <span className="text-muted-foreground">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}