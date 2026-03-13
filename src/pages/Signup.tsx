import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Eye, EyeOff, Mail } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password strength calculator
  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const strengthColor = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-accent", "bg-green-500"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];

  // Create user document in Firestore
  const createUserDocument = async (user: any, name: string) => {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      fullName: name,
      plan: "free",
      createdAt: new Date().toISOString(),
    });
  };

  // Email/Password Signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (strength < 3) {
      toast({
        title: "Error",
        description: "Please choose a stronger password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await createUserDocument(userCredential.user, fullName);
      
      toast({
        title: "Success!",
        description: "Account created successfully",
      });

      navigate("/dashboard");
      
    } catch (error: any) {
      console.error("Signup error:", error);
      
      let errorMessage = "Failed to create account";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Email already in use";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address";
          break;
        case 'auth/weak-password':
          errorMessage = "Password is too weak";
          break;
        default:
          errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignup = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user document in Firestore
      await createUserDocument(user, user.displayName || "User");
      
      toast({
        title: "Success!",
        description: `Welcome ${user.displayName || 'User'}!`,
      });

      navigate("/dashboard");
      
    } catch (error: any) {
      console.error("Google signup error:", error);
      
      let errorMessage = "Google sign-in failed";
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = "Sign-in popup was closed";
          break;
        case 'auth/popup-blocked':
          errorMessage = "Pop-up blocked by browser";
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = "Sign-in cancelled";
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = "Account already exists with different sign-in method";
          break;
        default:
          errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      <div className="glass rounded-xl p-8 w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <Shield className="h-7 w-7 text-primary" />
          <span className="font-heading text-lg font-bold tracking-wider">
            Sangrakshak<span className="text-primary">AI</span>
          </span>
        </Link>

        <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Start protecting your website today</p>

        {/* Email/Password Signup Form */}
        <form className="space-y-4" onSubmit={handleEmailSignup}>
          <Input 
            placeholder="Full Name" 
            required 
            className="bg-background/50 border-border"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
          
          <Input 
            type="email" 
            placeholder="Email" 
            required 
            className="bg-background/50 border-border"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          
          {/* Password Field */}
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              required
              className="bg-background/50 border-border pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
              onClick={() => setShowPw(!showPw)}
              disabled={loading}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : "bg-border"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{strengthLabel}</p>
            </div>
          )}
          
          {/* Confirm Password Field */}
          <div className="relative">
            <Input
              type={showConfirmPw ? "text" : "password"}
              placeholder="Confirm Password"
              required
              className="bg-background/50 border-border pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              disabled={loading}
            >
              {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password Match Indicator */}
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}

          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">OR</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <Mail className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;