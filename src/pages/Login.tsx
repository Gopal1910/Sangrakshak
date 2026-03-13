import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Eye, EyeOff, Mail } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Email/Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: "Success!",
        description: `Welcome back, ${userCredential.user.email}!`,
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "Invalid email or password";

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Try again later";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Check your connection";
          break;
        default:
          errorMessage = error.message || "Login failed";
      }

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      toast({
        title: "Success!",
        description: `Welcome, ${user.displayName || user.email}!`,
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Google login error:", error);

      let errorMessage = "Google login failed";

      switch (error.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "Login popup was closed";
          break;
        case "auth/popup-blocked":
          errorMessage = "Pop-up blocked by browser";
          break;
        case "auth/cancelled-popup-request":
          errorMessage = "Login cancelled";
          break;
        case "auth/account-exists-with-different-credential":
          errorMessage = "Account already exists with different sign-in method";
          break;
        default:
          errorMessage = error.message || "Failed to login with Google";
      }

      toast({
        title: "Google Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="glass rounded-xl p-8 w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <Shield className="h-7 w-7 text-primary" />
          <span className="font-heading text-lg font-bold tracking-wider">
            Sangrakshak<span className="text-primary">AI</span>
          </span>
        </Link>

        <h1 className="text-2xl font-bold text-center mb-2">Welcome Back</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Log in to your dashboard
        </p>

        {/* Email/Password Login Form */}
        <form className="space-y-4" onSubmit={handleEmailLogin}>
          <Input
            type="email"
            placeholder="Email"
            required
            className="bg-background/50 border-border"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setShowPw(!showPw)}
              disabled={loading}
            >
              {showPw ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
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

        {/* Google Login Button */}
        <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
          <Mail className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
