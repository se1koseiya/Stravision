"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CapWidget from "@/components/ui/cap-widget";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconLock, IconShield } from "@/components/icon";



export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaCompleted, setCaptchaCompleted] = useState(false);
  const [capToken, setCapToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemId, setSystemId] = useState<string>("------");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaCompleted || !capToken) {
      toast.error("Security Verification Required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, capToken }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Access Denied");
        // 人机验证令牌一次性使用，失败后需重新验证
        setCaptchaCompleted(false);
        setCapToken("");
        setLoading(false);
        return;
      }

      // Check if user is actually admin
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      
      if (meData.authenticated && meData.user?.role === 'super_admin') {
        toast.success("Welcome back, Super Administrator");
        window.location.href = "/super-secure-admin";
      } else if (meData.authenticated && meData.user?.role === 'admin') {
        toast.success("Welcome back, Administrator");
        window.location.href = "/admin";
      } else {
        toast.error("Unauthorized: Admin privileges required");
        // Logout if not admin
        fetch("/api/auth/logout", { method: "POST" });
        setLoading(false);
      }
      
    } catch (e) {
      console.error("Login error:", e);
      toast.error("Connection Error");
      setLoading(false);
    }
  };

  useEffect(() => {
    setSystemId(Math.random().toString(36).substring(7).toUpperCase());
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black/95 p-4">
      <Card className="w-full max-w-md border-red-900/30 bg-black text-red-500 shadow-2xl shadow-red-900/20">
        <CardHeader className="space-y-1 text-center border-b border-red-900/30 pb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-950/30 border border-red-900/50">
              <IconShield className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl font-mono tracking-widest text-red-600 uppercase">
            Restricted Access
          </CardTitle>
          <p className="text-xs text-red-800 font-mono">
            Authorized Personnel Only
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-red-700 font-mono text-xs uppercase">Identity</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@system.local"
                  className="bg-black border-red-900/50 text-red-500 placeholder:text-red-900/50 focus-visible:ring-red-900 font-mono pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                />
                <IconLock className="absolute left-3 top-2.5 h-4 w-4 text-red-900" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-red-700 font-mono text-xs uppercase">Passcode</Label>
              <Input
                id="password"
                type="password"
                className="bg-black border-red-900/50 text-red-500 focus-visible:ring-red-900 font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {/* Cap Widget */}
            <div className="py-2">
              <CapWidget
                onSuccess={(token) => {
                  setCaptchaCompleted(true);
                  setCapToken(token);
                }}
                onError={() => {
                  setCaptchaCompleted(false);
                  setCapToken("");
                }}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-red-950 hover:bg-red-900 text-red-500 border border-red-900/50 font-mono uppercase tracking-wider"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Authenticate"}
            </Button>
          </form>
          <div className="text-[10px] text-red-900/50 font-mono text-center pt-4">
            SYSTEM ID: {systemId}
            <br/>
            IP LOGGED AND MONITORED
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
