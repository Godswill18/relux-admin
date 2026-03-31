import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Mail, Lock, Loader2, AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { Role } from "@/types";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftError, setShiftError] = useState("");

  // Check for shift-ended redirect reason
  const searchParams = new URLSearchParams(location.search);
  const reason = searchParams.get("reason");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname || getDefaultRoute(user.role);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Get default route based on role
  function getDefaultRoute(role: Role): string {
    switch (role) {
      case Role.ADMIN:
      case Role.MANAGER:
      case Role.RECEPTIONIST:
        return '/admin';
      case Role.STAFF:
        return '/staff';
      default:
        return '/admin';
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        toast.success(`Welcome back, ${currentUser.name}!`);

        // Redirect based on role
        const defaultRoute = getDefaultRoute(currentUser.role);
        const from = location.state?.from?.pathname || defaultRoute;
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      const msg = error.message || "Login failed. Please check your credentials.";
      // Detect shift-based login restriction
      if (msg.toLowerCase().includes("shift") || msg.toLowerCase().includes("scheduled")) {
        setShiftError(msg);
      } else {
        setShiftError("");
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Droplet className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Relux Laundry</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {reason === "shift-ended" && (
            <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Your shift has ended and you were automatically logged out. Contact a manager if you need emergency access.
              </AlertDescription>
            </Alert>
          )}

          {shiftError && (
            <Alert className="mb-4 border-destructive bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                {shiftError}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </form>
          {/* <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Demo Credentials:</p>
            <p>Admin: admin@reluxlaundry.com / admin123</p>
            <p>Manager: manager@reluxlaundry.com / manager123</p>
            <p>Staff: staff@reluxlaundry.com / staff123</p>
          </div> */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Register here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
