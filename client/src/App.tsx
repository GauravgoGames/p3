import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ForgotPassword from "@/pages/forgot-password";
import ProfilePage from '@/pages/profile-page';
import ProfileUpdatePage from '@/pages/profile-update-page';
import UserProfilePage from "@/pages/user-profile-page";
import PredictNowPage from "@/pages/predict-now-page";
import LeaderboardPage from "@/pages/leaderboard-page";
import HelpPage from "@/pages/help-page";
import SupportPage from "@/pages/support-page";
import SupportTicketDetailPage from "@/pages/support-ticket-detail-page";
import TournamentsPage from "@/pages/tournaments-page";
import TournamentDetailPage from "@/pages/tournament-detail-page";
import TournamentAnalysisPage from "@/pages/tournament-analysis-page";
import AdminDashboard from "@/pages/admin/dashboard";
import ManageMatches from "@/pages/admin/manage-matches";
import ManageUsers from "@/pages/admin/manage-users";
import ManageTeams from "@/pages/admin/manage-teams";
import SiteSettings from "@/pages/admin/site-settings";
import AdminAddTournament from "@/pages/admin-add-tournament";
import ManageTournaments from "@/pages/admin/manage-tournaments";
import AdminSupportPage from "@/pages/admin-support-page";
import ManageContests from "@/pages/admin/manage-contests";
import BackupRestore from "@/pages/admin/backup-restore";
import AdminFileManager from "@/pages/admin/file-manager";
import { ProtectedRoute } from "./lib/protected-route";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import EmbedMatch from "@/pages/embeds/EmbedMatch";
import EmbedLeaderboard from "@/pages/embeds/EmbedLeaderboard";
import EmbedTournaments from "@/pages/embeds/EmbedTournaments";
import { AuthProvider } from "./hooks/use-auth";
import VerificationPopup from "@/components/verification-popup";

function Router() {
  const location = useLocation();
  const hideNavbarRoutes = ["/auth", "/forgot-password"];
  const shouldHideNavbar = hideNavbarRoutes.includes(location[0]) || location[0].startsWith("/embed/");
  const isEmbedRoute = location[0].startsWith("/embed/");

  return (
    <>
      {!isEmbedRoute && !shouldHideNavbar && <Navbar />}
      <main className={isEmbedRoute ? "" : (shouldHideNavbar ? "" : "min-h-screen")}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/embed/match" component={EmbedMatch} />
          <Route path="/embed/leaderboard" component={EmbedLeaderboard} />
          <Route path="/embed/tournaments" component={EmbedTournaments} />
          <Route path="/predict" component={PredictNowPage} />
          <Route path="/tournaments" component={TournamentsPage} />
          <Route path="/tournaments/:id" component={TournamentDetailPage} />
          <Route path="/tournaments/:tournamentId/analysis" component={TournamentAnalysisPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route path="/help" component={HelpPage} />
          <ProtectedRoute path="/support" component={SupportPage} />
          <ProtectedRoute path="/support/ticket/:id" component={SupportTicketDetailPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/profile/update" component={ProfileUpdatePage} />
          <Route path="/users/:username" component={ProfilePage} />
          <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly={true} />
          <ProtectedRoute path="/admin/matches" component={ManageMatches} adminOnly={true} />
          <ProtectedRoute path="/admin/users" component={ManageUsers} adminOnly={true} />
          <ProtectedRoute path="/admin/teams" component={ManageTeams} adminOnly={true} />
          <ProtectedRoute path="/admin/support" component={AdminSupportPage} adminOnly={true} />
          <ProtectedRoute path="/admin/tournaments" component={ManageTournaments} adminOnly={true} />
          <ProtectedRoute path="/admin/add-tournament" component={AdminAddTournament} adminOnly={true} />
          <ProtectedRoute path="/admin/manage-contests" component={ManageContests} adminOnly={true} />
          <ProtectedRoute path="/admin/settings" component={SiteSettings} adminOnly={true} />
          <ProtectedRoute path="/admin/file-manager" component={AdminFileManager} adminOnly={true} />
          <ProtectedRoute path="/admin/backup-restore" component={BackupRestore} adminOnly={true} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isEmbedRoute && <Footer />}
      {!isEmbedRoute && <VerificationPopup isVisible={false} onClose={() => {}} username="" />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;