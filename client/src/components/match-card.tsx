import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Match, Team, Prediction } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle, XCircle, Trophy, Clock, Activity, MessageSquare, Share2, Link2 } from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, addHours, subHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import VoteBand from './vote-band';

interface MatchCardProps {
  match: Match & {
    team1: Team;
    team2: Team;
    tossWinner?: Team;
    matchWinner?: Team;
    discussionLink?: string | null;
  };
  userPrediction?: Prediction;
}

const MatchCard = ({ match, userPrediction }: MatchCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [predictionState, setPredictionState] = useState({
    predictedTossWinnerId: userPrediction?.predictedTossWinnerId || null,
    predictedMatchWinnerId: userPrediction?.predictedMatchWinnerId || null,
  });

  const [countdown, setCountdown] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);

  // Check if discussion is active - simplified to allow discussion when link is provided and match is not voided
  const isDiscussionActive = () => {
    // Allow discussion for all matches except voided ones, if discussion link is provided
    return match.status !== 'void';
  };

  // Social sharing functions
  const shareMatch = (platform: string) => {
    const matchTitle = `${match.team1.name} vs ${match.team2.name}`;
    const matchUrl = window.location.href;
    const shareText = `Check out this match: ${matchTitle} on CricProAce!`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + matchUrl)}`, '_blank');
        break;
      case 'instagram':
        // Instagram doesn't have direct URL sharing, so we copy the link
        navigator.clipboard.writeText(matchUrl);
        toast({
          title: "Link copied!",
          description: "Share this match on Instagram by pasting the link",
        });
        break;
      case 'copy':
        navigator.clipboard.writeText(matchUrl);
        toast({
          title: "Link copied!",
          description: "Match link has been copied to clipboard",
        });
        break;
    }
    setShowShareMenu(false);
  };

  const predictionMutation = useMutation({
    mutationFn: async () => {
      if (!predictionState.predictedTossWinnerId || !predictionState.predictedMatchWinnerId) {
        throw new Error('Please select both toss and match winners');
      }

      const predictionData = {
        matchId: match.id,
        predictedTossWinnerId: predictionState.predictedTossWinnerId,
        predictedMatchWinnerId: predictionState.predictedMatchWinnerId
      };

      await apiRequest('POST', '/api/predictions', predictionData);
    },
    onSuccess: () => {
      toast({
        title: 'Prediction Submitted',
        description: 'Your prediction has been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Prediction Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'upcoming';
      case 'ongoing':
        return 'live';
      case 'completed':
        return 'completed';
      case 'tie':
        return 'warning';
      case 'void':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const handleTeamSelect = (type: 'toss' | 'match', teamId: number) => {
    if (match.status !== 'upcoming') return;

    if (type === 'toss') {
      setPredictionState(prev => ({
        ...prev,
        predictedTossWinnerId: prev.predictedTossWinnerId === teamId ? null : teamId
      }));
    } else {
      setPredictionState(prev => ({
        ...prev,
        predictedMatchWinnerId: prev.predictedMatchWinnerId === teamId ? null : teamId
      }));
    }
  };

  const handleSubmitPrediction = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to submit predictions',
        variant: 'destructive',
      });
      return;
    }

    predictionMutation.mutate();
  };

  // Handle match status update when timer hits zero
  const updateMatchStatus = async () => {
    if (match.status === 'upcoming' && timeRemaining <= 0) {
      try {
        // Update match status to 'ongoing' when time expires
        await apiRequest('PATCH', `/api/matches/${match.id}/status`, { status: 'ongoing' });
        queryClient.invalidateQueries({ queryKey: ['/api/matches'] });

        // Lock predictions for this match
        queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      } catch (error) {
        console.error('Failed to update match status:', error);
      }
    }
  };

  // Calculate and update countdown timer
  useEffect(() => {
    if (match.status === 'upcoming') {
      const timer = setInterval(() => {
        const now = new Date();
        const matchTime = new Date(match.matchDate);
        const seconds = differenceInSeconds(matchTime, now);

        setTimeRemaining(seconds);

        if (seconds <= 0) {
          clearInterval(timer);
          setCountdown('Starting now');
          // Update match status when countdown ends
          updateMatchStatus();
          return;
        }

        const days = differenceInDays(matchTime, now);
        const hours = differenceInHours(matchTime, now) % 24;
        const minutes = differenceInMinutes(matchTime, now) % 60;
        const remainingSeconds = seconds % 60;

        if (days > 0) {
          setCountdown(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setCountdown(`${hours}h ${minutes}m ${remainingSeconds}s`);
        } else if (minutes > 0) {
          setCountdown(`${minutes}m ${remainingSeconds}s`);
        } else {
          setCountdown(`${remainingSeconds}s`);
        }
      }, 1000);

      return () => clearInterval(timer);
    } else if (match.status === 'ongoing') {
      setCountdown('LIVE');
    } else {
      setCountdown('Completed');
    }
  }, [match.matchDate, match.status, queryClient]);

  const formatMatchTime = (date: Date | string) => {
    const matchDate = new Date(date);
    const now = new Date();
    const isToday = matchDate.toDateString() === now.toDateString();

    if (isToday) {
      return `Today, ${format(matchDate, 'h:mm a')}`;
    }

    return format(matchDate, 'dd MMM, h:mm a');
  };

  const getPointsEarned = () => {
    if (!userPrediction || !userPrediction.pointsEarned) return 0;
    return userPrediction.pointsEarned;
  };

  const getPointsMessage = () => {
    if (match.status !== 'completed' && match.status !== 'tie' && match.status !== 'void') {
      return null; // No points message for non-completed matches
    }

    if (!userPrediction) {
      return '0 points earned';
    }

    const pointsEarned = getPointsEarned();
    if (pointsEarned > 0) {
      return `+${pointsEarned} points earned`;
    } else {
      return '0 points earned';
    }
  };

  return (
    <div className="match-card bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
      <div className="lightning" />
      <div className="p-4 relative">
        {match.status === 'ongoing' ? (
          <motion.div 
            className="absolute top-4 right-4 z-10"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Badge 
              variant="live" 
              className="status-badge flex items-center gap-1 bg-red-500 text-white px-3 py-1 font-semibold"
            >
              <Activity className="h-3 w-3" /> LIVE
            </Badge>
          </motion.div>
        ) : (
          <div className="absolute top-4 right-4 z-10">
            <Badge 
                variant={getStatusBadgeVariant(match.status)} 
                className={`status-badge px-3 py-1 font-semibold ${
                  match.status === 'upcoming' ? 'bg-blue-500 text-white' :
                  match.status === 'completed' ? 'bg-green-500 text-white' :
                  match.status === 'tie' ? 'bg-yellow-500 text-white' :
                  match.status === 'void' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                }`}
              >
                {match.status === 'upcoming' ? 'UPCOMING' :
                 match.status === 'completed' ? 'COMPLETED' :
                 match.status === 'tie' ? 'TIE' :
                 match.status === 'void' ? 'VOID' : 'COMPLETED'}
              </Badge>
          </div>
        )}

        {/* Tournament and Date Section - Rearranged to prevent overlap */}
        <div className="flex flex-col gap-2 mb-6 mt-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-neutral-700">{match.tournamentName}</div>
              <div className="text-sm text-neutral-700">{formatMatchTime(match.matchDate)}</div>
            </div>
            
            {/* Share Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              
              {showShareMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => shareMatch('whatsapp')}
                  >
                    <FaWhatsapp className="h-4 w-4" />
                    Share on WhatsApp
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => shareMatch('instagram')}
                  >
                    <FaInstagram className="h-4 w-4" />
                    Share on Instagram
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-t"
                    onClick={() => shareMatch('copy')}
                  >
                    <Link2 className="h-4 w-4" />
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>

          {match.status === 'upcoming' && (
            <div className="flex items-center gap-1 w-fit text-sm font-medium text-neutral-700 bg-gray-100 px-2 py-1 rounded-md">
              <Clock className="h-3 w-3 text-primary" />
              {countdown}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="team-display flex flex-col items-center relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mb-2 border-2 border-gray-100 overflow-hidden shadow-lg">
              <img 
                src={match.team1.logoUrl || 'https://via.placeholder.com/80'} 
                alt={match.team1.name} 
                className="w-14 h-14 object-contain"
              />
            </div>
            <div className="font-semibold text-gray-800">{match.team1.name}</div>
            {match.team1Score && (
              <div className={`text-sm font-bold ${match.matchWinnerId === match.team1Id ? 'text-emerald-600' : 'text-neutral-600'}`}>
                {match.team1Score}
              </div>
            )}
            {match.tossWinnerId === match.team1Id && (
              <div className="absolute -top-1 -right-1 bg-yellow-400 text-xs px-1.5 py-0.5 rounded-full text-white font-bold shadow-md">
                Toss
              </div>
            )}
            {match.matchWinnerId === match.team1Id && (
              <div className="absolute -top-1 -left-1 bg-green-500 text-xs px-1.5 py-0.5 rounded-full text-white font-bold shadow-md">
                Match
              </div>
            )}
          </div>

          <div className="vs-badge relative">
            <motion.div 
              className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-primary flex items-center justify-center shadow-lg border-4 border-white overflow-hidden"
              animate={{ 
                boxShadow: ["0px 0px 8px 2px rgba(59, 130, 246, 0.6)", "0px 0px 16px 4px rgba(59, 130, 246, 0.8)", "0px 0px 8px 2px rgba(59, 130, 246, 0.6)"]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ 
                  opacity: [0.8, 1, 0.8],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-20"
                style={{ 
                  clipPath: "polygon(40% 0%, 60% 0%, 100% 50%, 60% 100%, 40% 100%, 0% 50%)",
                  transform: "rotate(25deg)" 
                }}
              />
              <div className="text-xl font-bold text-white relative z-10">VS</div>
            </motion.div>
          </div>

          <div className="team-display flex flex-col items-center relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mb-2 border-2 border-gray-100 overflow-hidden shadow-lg">
              <img 
                src={match.team2.logoUrl || 'https://via.placeholder.com/80'} 
                alt={match.team2.name} 
                className="w-14 h-14 object-contain"
              />
            </div>
            <div className="font-semibold text-gray-800">{match.team2.name}</div>
            {match.team2Score && (
              <div className={`text-sm font-bold ${match.matchWinnerId === match.team2Id ? 'text-emerald-600' : 'text-neutral-600'}`}>
                {match.team2Score}
              </div>
            )}
            {match.tossWinnerId === match.team2Id && (
              <div className="absolute -top-1 -right-1 bg-yellow-400 text-xs px-1.5 py-0.5 rounded-full text-white font-bold shadow-md">
                Toss
              </div>
            )}
            {match.matchWinnerId === match.team2Id && (
              <div className="absolute -top-1 -left-1 bg-green-500 text-xs px-1.5 py-0.5 rounded-full text-white font-bold shadow-md">
                Match
              </div>
            )}
          </div>
        </div>

        {/* Vote Bands - Show prediction statistics */}
        {match.status !== 'completed' && match.status !== 'void' && match.status !== 'tie' && (
          <div className="space-y-2">
            <VoteBand 
              matchId={match.id} 
              team1Name={match.team1.name} 
              team2Name={match.team2.name} 
              type="toss"
            />
            <VoteBand 
              matchId={match.id} 
              team1Name={match.team1.name} 
              team2Name={match.team2.name} 
              type="match"
            />
          </div>
        )}

        {match.status === 'completed' || match.status === 'tie' || match.status === 'void' ? (
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            {/* Match Result Summary */}
            {match.status !== 'void' && (
              <div className="text-center mb-3">
                <div className="text-sm text-neutral-500 mb-1">Match Result</div>
                <div className="font-bold text-base">{match.resultSummary || 'Match ' + match.status}</div>
              </div>
            )}

            {/* VOID Match - Show VOID message */}
            {match.status === 'void' && (
              <div className="text-center py-8">
                <div className="text-2xl font-bold text-red-600 mb-2">VOID</div>
                <div className="text-sm text-neutral-500">This match has been voided</div>
              </div>
            )}

            {/* TIE Match - Show only toss results */}
            {match.status === 'tie' && userPrediction && (
              <div className="space-y-4">
                {/* Toss Result only for TIE */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <div className="text-neutral-500 font-medium text-center mb-1">Toss Winner</div>
                    {match.tossWinnerId && (
                      <div className="flex items-center justify-center gap-2 bg-gray-50 py-2 px-3 rounded-md">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">
                          {match.tossWinnerId === match.team1Id ? match.team1.name : match.team2.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-1">
                    <div className="text-neutral-500 font-medium text-center mb-1">Your Prediction</div>
                    <div className="flex items-center justify-center gap-2 bg-gray-50 py-2 px-3 rounded-md">
                      {userPrediction.predictedTossWinnerId === match.tossWinnerId ? (
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium">
                        {userPrediction.predictedTossWinnerId === match.team1Id ? match.team1.name : match.team2.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COMPLETED Match - Show both toss and match results */}
            {match.status === 'completed' && userPrediction && (
              <div className="space-y-4">
                {/* Toss Result */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <div className="text-neutral-500 font-medium text-center mb-1">Toss</div>
                    {match.tossWinnerId && (
                      <div className="flex items-center justify-center gap-2 bg-gray-50 py-2 px-3 rounded-md">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">
                          {match.tossWinnerId === match.team1Id ? match.team1.name : match.team2.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-1">
                    <div className="text-neutral-500 font-medium text-center mb-1">Your Prediction</div>
                    <div className="flex items-center justify-center gap-2 bg-gray-50 py-2 px-3 rounded-md">
                      {userPrediction.predictedTossWinnerId === match.tossWinnerId ? (
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium">
                        {userPrediction.predictedTossWinnerId === match.team1Id ? match.team1.name : match.team2.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Winner Result */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <div className="text-neutral-500 font-medium text-center mb-1">Winner</div>
                    {match.matchWinnerId && (
                      <div className="flex items-center justify-center gap-2 bg-gray-50 py-2 px-3 rounded-md">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">
                          {match.matchWinnerId === match.team1Id ? match.team1.name : match.team2.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-1">
                    <div className="text-neutral-500 font-medium text-center mb-1">Your Prediction</div>
                    <div className="flex items-center justify-center gap-2 bg-gray-50 py-2 px-3 rounded-md">
                      {userPrediction.predictedMatchWinnerId === match.matchWinnerId ? (
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium">
                        {userPrediction.predictedMatchWinnerId === match.team1Id ? match.team1.name : match.team2.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="predictions-container">
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <div className="h-5 w-5 rounded-full bg-yellow-400 mr-2 flex items-center justify-center">
                  <span className="text-xs text-white font-bold">1</span>
                </div>
                Who will win the toss?
              </div>

              <div className="flex space-x-3">
                <button 
                  className={cn(
                    "prediction-option flex-1 py-3 px-4 rounded-lg text-center transition-all duration-200",
                    predictionState.predictedTossWinnerId === match.team1Id 
                      ? "bg-gradient-to-r from-blue-500 to-primary text-white font-medium shadow-md" 
                      : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
                  )}
                  onClick={() => handleTeamSelect('toss', match.team1Id)}
                  disabled={match.status !== 'upcoming' || !user}
                >
                  <div className="flex items-center justify-center">
                    <img 
                      src={match.team1.logoUrl || 'https://via.placeholder.com/32'} 
                      alt={match.team1.name} 
                      className="w-6 h-6 object-contain rounded-full mr-2"
                    />
                    <span className="text-sm font-medium">{match.team1.name}</span>
                  </div>
                </button>

                <button 
                  className={cn(
                    "prediction-option flex-1 py-3 px-4 rounded-lg text-center transition-all duration-200",
                    predictionState.predictedTossWinnerId === match.team2Id 
                      ? "bg-gradient-to-r from-blue-500 to-primary text-white font-medium shadow-md" 
                      : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
                  )}
                  onClick={() => handleTeamSelect('toss', match.team2Id)}
                  disabled={match.status !== 'upcoming' || !user}
                >
                  <div className="flex items-center justify-center">
                    <img 
                      src={match.team2.logoUrl || 'https://via.placeholder.com/32'} 
                      alt={match.team2.name} 
                      className="w-6 h-6 object-contain rounded-full mr-2"
                    />
                    <span className="text-sm font-medium">{match.team2.name}</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <div className="h-5 w-5 rounded-full bg-yellow-400 mr-2 flex items-center justify-center">
                  <span className="text-xs text-white font-bold">2</span>
                </div>
                Who will win the match?
              </div>

              <div className="flex space-x-3">
                <button 
                  className={cn(
                    "prediction-option flex-1 py-3 px-4 rounded-lg text-center transition-all duration-200",
                    predictionState.predictedMatchWinnerId === match.team1Id 
                      ? "bg-gradient-to-r from-blue-500 to-primary text-white font-medium shadow-md" 
                      : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
                  )}
                  onClick={() => handleTeamSelect('match', match.team1Id)}
                  disabled={match.status !== 'upcoming' || !user}
                >
                  <div className="flex items-center justify-center">
                    <img 
                      src={match.team1.logoUrl || 'https://via.placeholder.com/32'} 
                      alt={match.team1.name} 
                      className="w-6 h-6 object-contain rounded-full mr-2"
                    />
                    <span className="text-sm font-medium">{match.team1.name}</span>
                  </div>
                </button>

                <button 
                  className={cn(
                    "prediction-option flex-1 py-3 px-4 rounded-lg text-center transition-all duration-200",
                    predictionState.predictedMatchWinnerId === match.team2Id 
                      ? "bg-gradient-to-r from-blue-500 to-primary text-white font-medium shadow-md" 
                      : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
                  )}
                  onClick={() => handleTeamSelect('match', match.team2Id)}
                  disabled={match.status !== 'upcoming' || !user}
                >
                  <div className="flex items-center justify-center">
                    <img 
                      src={match.team2.logoUrl || 'https://via.placeholder.com/32'} 
                      alt={match.team2.name} 
                      className="w-6 h-6 object-contain rounded-full mr-2"
                    />
                    <span className="text-sm font-medium">{match.team2.name}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-3 rounded-b-xl border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-700 flex items-center min-w-0">
              <div className="bg-white p-1 rounded-full shadow-sm mr-2 flex-shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span className="truncate" title={match.location}>{match.location}</span>
            </div>

            {/* Join Discussion Button */}
            {match.discussionLink && isDiscussionActive() && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(match.discussionLink!, '_blank')}
                className="flex items-center gap-1 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-300 text-purple-700 transition-all duration-200 flex-shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Join Discussion</span>
              </Button>
            )}
          </div>

        {match.status === 'upcoming' ? (
          user ? (
            <Button 
              size="sm"
              onClick={handleSubmitPrediction}
              disabled={
                !predictionState.predictedTossWinnerId || 
                !predictionState.predictedMatchWinnerId || 
                predictionMutation.isPending
              }
              className={`px-4 py-2 rounded-full text-sm font-medium shadow-md transition-all ${
                !predictionState.predictedTossWinnerId || !predictionState.predictedMatchWinnerId
                ? 'bg-gray-300 text-gray-600'
                : 'bg-gradient-to-r from-blue-600 to-primary text-white hover:from-blue-700 hover:to-blue-600'
              }`}
            >
              {predictionMutation.isPending ? 'Submitting...' : userPrediction ? 'Update Prediction' : 'Submit Prediction'}
            </Button>
          ) : (
            <div className="px-4 py-2 bg-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
              Login to predict
            </div>
          )
        ) : match.status === 'ongoing' ? (
          <div className="px-4 py-2 bg-red-100 rounded-full text-sm font-medium text-red-600 flex items-center shadow-sm border border-red-200">
            <Activity className="h-3 w-3 mr-1" />
            {userPrediction ? 'Prediction Locked' : 'Predictions Closed'}
          </div>
        ) : (
          <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm border ${
            getPointsEarned() > 0 
              ? 'bg-green-100 text-green-600 border-green-200' 
              : 'bg-orange-100 text-orange-600 border-orange-200'
          }`}>
            {getPointsEarned() > 0 ? (
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-amber-500 mr-1" />
                <span>{getPointsMessage()}</span>
              </div>
            ) : (
              getPointsMessage() || (userPrediction ? 'No points earned' : 'No prediction made')
            )}
          </div>
        )}


        </div>
      </div>
    </div>
  );
};

export default MatchCard;