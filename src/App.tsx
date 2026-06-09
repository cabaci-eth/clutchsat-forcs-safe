import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AceProvider } from "@/contexts/AceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Practice from "./pages/Practice";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Progress from "./pages/Progress";
import Plan from "./pages/Plan";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import CommunityBank from "./pages/CommunityBank";
import Admin from "./pages/Admin";
import Forum from "./pages/Forum";
import Profile from "./pages/Profile";
import ScoreCalculator from "./pages/ScoreCalculator";
import OrbitalMechanics from "./pages/OrbitalMechanics";
import NBodySimulator from "./pages/ThreeBodySimulator";
import CellularAutomata from "./pages/CellularAutomata";
import Pricing from "./pages/Pricing";
import MockTests from "./pages/MockTests";
import MockTestPractice from "./pages/MockTestPractice";
import MockTestSimulation from "./pages/MockTestSimulation";
import MockTestAdmin from "./pages/MockTestAdmin";
import NotFound from "./pages/NotFound";
import RouteScrollToTop from "./components/RouteScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AceProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/community" element={<CommunityBank />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/score-calculator" element={<ScoreCalculator />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/tools/orbital-mechanics" element={<OrbitalMechanics />} />
              <Route path="/tools/n-body-simulator" element={<NBodySimulator />} />
              <Route path="/tools/cellular-automata" element={<CellularAutomata />} />
              <Route path="/mock-tests" element={<MockTests />} />
              <Route path="/mock-tests/:testId/practice" element={<MockTestPractice />} />
              <Route path="/mock-tests/:testId/simulation" element={<MockTestSimulation />} />
              <Route path="/admin/mock-tests" element={<MockTestAdmin />} />
              {/* Redirect old route */}
              <Route path="/tools/three-body-simulator" element={<Navigate to="/tools/n-body-simulator" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
      </AceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
