import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";

// Pages
import Login from "@/pages/login";
import Home from "@/pages/home";
import Themes from "@/pages/themes";
import Bookings from "@/pages/bookings";
import BookingCreate from "@/pages/booking-create";
import BookingDetails from "@/pages/booking-details";
import Admin from "@/pages/admin";
import Enquiries from "@/pages/enquiries";
import EnquiryDetails from "@/pages/enquiry-details";
import Portfolio from "@/pages/portfolio";

// Protected Route Wrapper
const ProtectedRoute = ({ component: Component }: { component: React.ComponentType }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!user) return <Redirect to="/login" />;

  return <Component />;
};

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public route — portfolio page, no sidebar */}
      <Route path="/">
        <Portfolio />
      </Route>

      {/* Login */}
      <Route path="/login">
        {user ? <Redirect to="/home" /> : <Login />}
      </Route>

      {/* Protected routes — wrapped in Layout with sidebar */}
      <Route path="/home">
        <Layout><ProtectedRoute component={Home} /></Layout>
      </Route>
      <Route path="/themes">
        <Layout><ProtectedRoute component={Themes} /></Layout>
      </Route>
      <Route path="/bookings">
        <Layout><ProtectedRoute component={Bookings} /></Layout>
      </Route>
      <Route path="/booking/create">
        <Layout><ProtectedRoute component={BookingCreate} /></Layout>
      </Route>
      <Route path="/bookings/:id">
        <Layout><ProtectedRoute component={BookingDetails} /></Layout>
      </Route>
      <Route path="/admin">
        <Layout><ProtectedRoute component={Admin} /></Layout>
      </Route>
      <Route path="/enquiries">
        <Layout><ProtectedRoute component={Enquiries} /></Layout>
      </Route>
      <Route path="/enquiries/:id">
        <Layout><ProtectedRoute component={EnquiryDetails} /></Layout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
