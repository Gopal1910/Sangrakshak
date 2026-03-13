import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import LiveTraffic from "./pages/dashboard/LiveTraffic";
import BotAttacks from "./pages/dashboard/BotAttacks";
import ThreatIntel from "./pages/dashboard/ThreatIntel";
import Websites from "./pages/dashboard/Websites";
import ApiSdk from "./pages/dashboard/ApiSdk";
import DashboardSettings from "./pages/dashboard/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="traffic" element={<LiveTraffic />} />
            <Route path="attacks" element={<BotAttacks />} />
            <Route path="threats" element={<ThreatIntel />} />
            <Route path="websites" element={<Websites />} />
            <Route path="api" element={<ApiSdk />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
