import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AIInference from "./pages/AIInference";
import Wallet from "./pages/Wallet";
import Nodes from "./pages/Nodes";
import Transactions from "./pages/Transactions";
import ComputeRental from "./pages/ComputeRental";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AdminHome from "./pages/AdminHome";

/** Regular users only — admin is redirected to /admin */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === 'admin') return <Redirect to="/admin" />;
  return <Component />;
}

/** Admin only — non-admin is redirected to /dashboard */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role !== 'admin') return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      {/* Regular user routes */}
      <Route path={"/dashboard"} component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path={"/ai-inference"} component={() => <ProtectedRoute component={AIInference} />} />
      <Route path={"/wallet"} component={() => <ProtectedRoute component={Wallet} />} />
      <Route path={"/nodes"} component={() => <ProtectedRoute component={Nodes} />} />
      <Route path={"/transactions"} component={() => <ProtectedRoute component={Transactions} />} />
      <Route path={"/compute-rental"} component={() => <ProtectedRoute component={ComputeRental} />} />
      {/* Admin routes */}
      <Route path={"/admin"} component={() => <AdminRoute component={AdminHome} />} />
      <Route path={"/admin/users"} component={() => <AdminRoute component={Admin} />} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="dark"
          switchable
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
