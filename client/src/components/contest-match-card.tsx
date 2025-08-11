import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Crown, Trophy, Calendar, MapPin, Users, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, addHours, subHours } from 'date-fns';

interface Team {
  id: number;
  name: string;
  logoUrl: string | null;
}

interface Match {
  id: number;
  tournamentId: number | null;
  tournamentName: string;
  team1: Team;
  team2: Team;
  location: string;
  matchDate: Date;
  status: 'upcoming' | 'ongoing' | 'completed' | 'tie' | 'void';
  tossWinnerId: number | null;
  matchWinnerId: number | null;
  team1Score: string | null;
  team2Score: string | null;
  resultSummary: string | null;
  discussionLink: string | null;
}

interface Prediction {
  id: number;
  predictedMatchWinnerId: number | null;
  pointsEarned: number | null;
}

interface ContestMatchCardProps {
  match: Match;
  userPrediction?: Prediction;
  currentUserId?: number;
  isContestParticipant: boolean;
}

export default function ContestMatchCard({ 
  match, 
  userPrediction, 
  currentUserId,
  isContestParticipant 
}: ContestMatchCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [predictionState, setPredictionState] = useState({
    predictedMatchWinnerId: userPrediction?.predictedMatchWinnerId || null,
  });

  // Update prediction state when userPrediction changes
  useEffect(() => {
    setPredictionState({
      predictedMatchWinnerId: userPrediction?.predictedMatchWinnerId || null,
    });
  }, [userPrediction?.predictedMatchWinnerId]);

  // Function to get points earned message
  const getPointsMessage = () => {
    if (match.status !== 'completed' && match.status !== 'tie' && match.status !== 'void') {
      return null;
    }

    if (!userPrediction) {
      return '0 points earned';
    }

    const pointsEarned = userPrediction.pointsEarned ?? 0;
    if (pointsEarned > 0) {
      return `+${pointsEarned} points earned`;
    } else {
      return '0 points earned';
    }
  };

  const [countdown, setCountdown] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Fetch match prediction statistics
  const { data: predictionStats } = useQuery({
    queryKey: [`/api/matches/${match.id}/prediction-stats`],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${match.id}/prediction-stats`);
      if (!res.ok) return { match: { team1: { predictions: 0, percentage: 0 }, team2: { predictions: 0, percentage: 0 } }, totalPredictions: 0, isContest: true };
      return res.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Check if discussion is active - simplified to allow discussion when link is provided and match is not voided
  const isDiscussionActive = () => {
    // Allow discussion for all matches except voided ones, if discussion link is provided
    return match.status !== 'void';
  };

  const predictionMutation = useMutation({
    mutationFn: async () => {
      if (!predictionState.predictedMatchWinnerId) {
        throw new Error('Please select match winner');
      }

      const predictionData = {
        matchId: match.id,
        predictedMatchWinnerId: predictionState.predictedMatchWinnerId,
      };

      let response;
      if (userPrediction) {
        response = await fetch(`/api/predictions/${userPrediction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(predictionData),
        });
      } else {
        response = await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(predictionData),
        });
      }

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to save prediction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${match.id}/prediction-stats`] });
      toast({
        title: "Contest Prediction Saved!",
        description: "Your match prediction has been saved. Earn 2 points for correct predictions!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const matchTime = new Date(match.matchDate).getTime();
      const difference = matchTime - now;

      setTimeRemaining(difference);

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setCountdown(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setCountdown(`${minutes}m ${seconds}s`);
        }
      } else {
        setCountdown("Match Started");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [match.matchDate]);

  const isPredictionLocked = timeRemaining <= 0 || match.status !== 'upcoming';
  const canPredict = currentUserId && isContestParticipant && !isPredictionLocked;

  const getStatusColor = () => {
    switch (match.status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'upcoming': return 'bg-gray-100 text-gray-800';
      case 'tie': return 'bg-purple-100 text-purple-800';
      case 'void': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardContent className="p-4">
          {/* Contest Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 font-semibold">
                PREMIUM CONTEST
              </Badge>
              <Badge variant="outline" className="text-xs">
                2x Points
              </Badge>
            </div>
            <Badge className={getStatusColor()}>
              {match.status.toUpperCase()}
            </Badge>
          </div>

          {/* Tournament Info */}
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{match.tournamentName}</span>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-3 items-center gap-4 mb-4">
            {/* Team 1 */}
            <div className="text-center">
              <div className="flex flex-col items-center gap-2">
                {match.team1.logoUrl && (
                  <img 
                    src={match.team1.logoUrl} 
                    alt={match.team1.name}
                    className="w-12 h-12 object-contain"
                  />
                )}
                <span className="font-semibold text-sm">{match.team1.name}</span>
                {match.team1Score && (
                  <span className="text-lg font-bold text-blue-600">{match.team1Score}</span>
                )}
              </div>
              {match.matchWinnerId === match.team1.id && (
                <Badge className="mt-2 bg-green-100 text-green-800 text-xs">
                  Winner
                </Badge>
              )}
            </div>

            {/* VS */}
            <div className="text-center">
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
            </div>

            {/* Team 2 */}
            <div className="text-center">
              <div className="flex flex-col items-center gap-2">
                {match.team2.logoUrl && (
                  <img 
                    src={match.team2.logoUrl} 
                    alt={match.team2.name}
                    className="w-12 h-12 object-contain"
                  />
                )}
                <span className="font-semibold text-sm">{match.team2.name}</span>
                {match.team2Score && (
                  <span className="text-lg font-bold text-blue-600">{match.team2Score}</span>
                )}
              </div>
              {match.matchWinnerId === match.team2.id && (
                <Badge className="mt-2 bg-green-100 text-green-800 text-xs">
                  Winner
                </Badge>
              )}
            </div>
          </div>

          {/* Match Details */}
          <div className="space-y-2 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(match.matchDate), 'PPP p')}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{match.location}</span>
            </div>
          </div>

          {/* Contest Access Notice */}
          {!isContestParticipant && currentUserId && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Premium Contest Access Required
                </span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Contact admin to participate in this premium contest tournament.
              </p>
            </div>
          )}

          {/* Prediction Section - Only Match Winner */}
          {canPredict && (
            <div className="space-y-3 p-3 bg-white rounded-lg border">
              <h4 className="font-semibold text-center">Make Your Contest Prediction</h4>
              
              {/* Match Winner Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Match Winner (2 Points)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={predictionState.predictedMatchWinnerId === match.team1.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPredictionState({ 
                      ...predictionState, 
                      predictedMatchWinnerId: match.team1.id 
                    })}
                  >
                    {match.team1.name}
                  </Button>
                  <Button
                    variant={predictionState.predictedMatchWinnerId === match.team2.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPredictionState({ 
                      ...predictionState, 
                      predictedMatchWinnerId: match.team2.id 
                    })}
                  >
                    {match.team2.name}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => predictionMutation.mutate()}
                disabled={!predictionState.predictedMatchWinnerId || predictionMutation.isPending}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {predictionMutation.isPending ? 'Saving...' : 'Save Contest Prediction'}
              </Button>
            </div>
          )}

          {/* Show existing prediction */}
          {userPrediction && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Your Contest Prediction</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Match Winner: {
                    userPrediction.predictedMatchWinnerId === match.team1.id 
                      ? match.team1.name 
                      : match.team2.name
                  }
                </span>
                {match.status === 'completed' || match.status === 'tie' || match.status === 'void' ? (
                  <Badge className={`${(userPrediction.pointsEarned ?? 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    {getPointsMessage()}
                  </Badge>
                ) : (userPrediction.pointsEarned ?? 0) > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    +{userPrediction.pointsEarned} pts
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Countdown */}
          {match.status === 'upcoming' && (
            <div className="text-center mt-4">
              <span className="text-sm font-medium text-primary">
                {timeRemaining > 0 ? `Predictions close in: ${countdown}` : 'Predictions Closed'}
              </span>
            </div>
          )}

          {/* Match Prediction Poll - Only for Contest */}
          {(match.status === 'upcoming' || match.status === 'ongoing') && predictionStats && (
            <div className="mt-4 space-y-3">
              {/* Match Winner Poll */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium mb-3 text-blue-900">Match Winner Predictions</h4>
                <div className="space-y-2">
                  {/* Team 1 prediction bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {match.team1.logoUrl && (
                        <img src={match.team1.logoUrl} alt={match.team1.name} className="w-4 h-4 object-contain" />
                      )}
                      <span className="text-xs font-medium">{match.team1.name}</span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full flex items-center justify-center relative"
                        style={{ width: `${predictionStats.match?.team1?.percentage || 0}%` }}
                      >
                        <span className="text-xs font-bold text-white absolute inset-0 flex items-center justify-center">
                          {predictionStats.match?.team1?.percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Team 2 prediction bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {match.team2.logoUrl && (
                        <img src={match.team2.logoUrl} alt={match.team2.name} className="w-4 h-4 object-contain" />
                      )}
                      <span className="text-xs font-medium">{match.team2.name}</span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full flex items-center justify-center relative"
                        style={{ width: `${predictionStats.match?.team2?.percentage || 0}%` }}
                      >
                        <span className="text-xs font-bold text-white absolute inset-0 flex items-center justify-center">
                          {predictionStats.match?.team2?.percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Total predictions count */}
                <div className="mt-2 text-center">
                  <span className="text-xs text-blue-700">
                    {predictionStats.totalPredictions || 0} total predictions
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Result Summary */}
          {match.resultSummary && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Result: </span>
              <span className="text-sm">{match.resultSummary}</span>
            </div>
          )}

          {/* Discussion Link */}
          {match.discussionLink && isDiscussionActive() && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                asChild
                className="w-full"
              >
                <a href={match.discussionLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join Contest Discussion
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}