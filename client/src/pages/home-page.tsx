import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Match, Team, Prediction, Tournament } from '@shared/schema';
import HeroSection from '@/components/hero-section';
import FeatureCards from '@/components/feature-cards';
import Leaderboard from '@/components/leaderboard';
import MatchCard from '@/components/match-card';
import ContestMatchCard from '@/components/contest-match-card';
import { FirstTimeLoginPopup } from '@/components/first-time-login-popup';
import VerificationPopup from '@/components/verification-popup';
import { useAuth } from '@/hooks/use-auth';
import { useVerificationPopup } from '@/hooks/use-verification-popup';
import { Trophy, Calendar, Users, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type MatchWithTeams = Match & {
  team1: Team;
  team2: Team;
  tossWinner?: Team;
  matchWinner?: Team;
};

const HomePage = () => {
  const { user } = useAuth();
  const { showPopup, closePopup } = useVerificationPopup();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showFirstTimePopup, setShowFirstTimePopup] = useState(false);
  
  // Fetch matches with caching
  const { data: matches, isLoading: isLoadingMatches } = useQuery<MatchWithTeams[]>({
    queryKey: ['/api/matches'],
    queryFn: async () => {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('Failed to fetch matches');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
  
  // Fetch user predictions if user is logged in with caching
  const { data: predictions } = useQuery<Prediction[]>({
    queryKey: ['/api/predictions'],
    queryFn: async () => {
      const res = await fetch('/api/predictions');
      if (!res.ok) throw new Error('Failed to fetch predictions');
      return res.json();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch tournaments for homepage with caching
  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery<(Tournament & { matchCount: number })[]>({
    queryKey: ['/api/tournaments'],
    queryFn: async () => {
      const res = await fetch('/api/tournaments');
      if (!res.ok) throw new Error('Failed to fetch tournaments');
      return res.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes 
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Check if user is contest participant for any tournament
  const { data: contestParticipationData } = useQuery({
    queryKey: ['/api/contest-participation'],
    queryFn: async () => {
      if (!user || !tournaments) return {};
      
      const participationStatus: Record<number, boolean> = {};
      for (const tournament of tournaments) {
        if (tournament.isContest) {
          const res = await fetch(`/api/contest-participants/check/${tournament.id}/${user.id}`);
          if (res.ok) {
            const data = await res.json();
            participationStatus[tournament.id] = data.isParticipant;
          }
        }
      }
      return participationStatus;
    },
    enabled: !!user && !!tournaments,
  });

  // Check for first-time login and show popup for non-verified users
  useEffect(() => {
    if (user && !user.isVerified) {
      const hasSeenPopup = localStorage.getItem(`first-time-popup-${user.username}`);
      if (!hasSeenPopup) {
        setShowFirstTimePopup(true);
        localStorage.setItem(`first-time-popup-${user.username}`, 'true');
      }
    }
  }, [user]);

  const handleCloseFirstTimePopup = () => {
    setShowFirstTimePopup(false);
  };
  
  const filterMatchesByStatus = (status: string) => {
    if (!matches) return [];
    return matches.filter(match => match.status === status);
  };
  
  const getUserPredictionForMatch = (matchId: number) => {
    if (!predictions) return undefined;
    return predictions.find(p => p.matchId === matchId);
  };

  const getMatchCardComponent = (match: MatchWithTeams) => {
    // Check if this match belongs to a contest tournament
    const tournament = tournaments?.find(t => t.id === match.tournamentId);
    const isContest = tournament?.isContest || false;
    const isContestParticipant = contestParticipationData?.[match.tournamentId!] || false;

    if (isContest) {
      return (
        <ContestMatchCard
          key={match.id}
          match={match as any}
          userPrediction={getUserPredictionForMatch(match.id) as any}
          currentUserId={user?.id}
          isContestParticipant={isContestParticipant}
        />
      );
    } else {
      return (
        <MatchCard 
          key={match.id} 
          match={match as any} 
          userPrediction={getUserPredictionForMatch(match.id) as any}
        />
      );
    }
  };
  
  const ongoingMatches = filterMatchesByStatus('ongoing');
  const upcomingMatches = filterMatchesByStatus('upcoming');
  const completedMatches = filterMatchesByStatus('completed');
  
  const renderMatchesSkeleton = () => {
    return Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-md p-4">
        <Skeleton className="h-4 w-1/3 mb-4" />
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col items-center">
            <Skeleton className="h-16 w-16 rounded-full mb-2" />
            <Skeleton className="h-4 w-16 mb-1" />
          </div>
          <Skeleton className="h-6 w-8" />
          <div className="flex flex-col items-center">
            <Skeleton className="h-16 w-16 rounded-full mb-2" />
            <Skeleton className="h-4 w-16 mb-1" />
          </div>
        </div>
        <Skeleton className="h-24 w-full mb-4" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    ));
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <HeroSection />
      
      {/* Tournaments Section */}
      {tournaments && tournaments.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-neutral-800 flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-primary" />
              Active Tournaments
            </h2>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/tournaments'}
              className="text-primary border-primary hover:bg-primary hover:text-white"
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tournaments.slice(0, 3).map((tournament) => (
              <Card 
                key={tournament.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => window.location.href = `/tournaments/${tournament.id}`}
              >
                <CardHeader className="pb-3">
                  {tournament.imageUrl && (
                    <div className="w-full h-32 mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={tournament.imageUrl} 
                        alt={tournament.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    {tournament.isContest && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center">
                        <Crown className="h-3 w-3 mr-1" />
                        PREMIUM
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {tournament.description && (
                    <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {tournament.matchCount} matches
                    </div>
                    {tournament.startDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      <div id="ongoing-matches" className="bg-white shadow-md rounded-lg mb-8">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex justify-start border-b border-neutral-200 w-full rounded-none">
            <TabsTrigger 
              value="all"
              className="data-[state=active]:border-b-2 data-[state=active]:border-accent"
            >
              All Matches
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming"
              className="data-[state=active]:border-b-2 data-[state=active]:border-accent"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger 
              value="ongoing" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-accent"
            >
              Ongoing
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:border-b-2 data-[state=active]:border-accent"
            >
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-6 font-heading text-neutral-800">
          {activeTab === 'all' ? 'All Matches' : 
           activeTab === 'ongoing' ? 'Ongoing Matches' : 
           activeTab === 'upcoming' ? 'Upcoming Matches' : 'Completed Matches'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingMatches ? (
            renderMatchesSkeleton()
          ) : activeTab === 'all' ? (
            matches && matches.slice(0, 9).map(match => getMatchCardComponent(match))
          ) : activeTab === 'ongoing' && ongoingMatches.length > 0 ? (
            ongoingMatches.map(match => getMatchCardComponent(match))
          ) : activeTab === 'upcoming' && upcomingMatches.length > 0 ? (
            upcomingMatches.map(match => getMatchCardComponent(match))
          ) : activeTab === 'completed' && completedMatches.length > 0 ? (
            completedMatches.map(match => getMatchCardComponent(match))
          ) : (
            <div className="col-span-3 text-center py-8 text-neutral-500">
              No {activeTab === 'all' ? '' : activeTab} matches found
            </div>
          )}
        </div>
      </div>
      
      <Leaderboard />
      <FeatureCards />
      
      <FirstTimeLoginPopup 
        isOpen={showFirstTimePopup} 
        onClose={handleCloseFirstTimePopup} 
      />
      
      {showPopup && user && (
        <VerificationPopup
          isVisible={showPopup}
          onClose={closePopup}
          username={user.username}
        />
      )}
    </div>
  );
};

export default HomePage;
