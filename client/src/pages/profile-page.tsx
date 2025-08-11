
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, PieChart, Check, X, Heart, Eye } from "lucide-react";
import MatchCard from '@/components/match-card';
import ContestMatchCard from '@/components/contest-match-card';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const params = useParams<{ username: string }>();
  const username = params.username || currentUser?.username;

  // Show notification if viewing another user's profile
  useEffect(() => {
    if (params.username && currentUser && params.username !== currentUser.username) {
      toast({
        title: "View Only Mode",
        description: "You can't change or update another user's statistics or predictions. You can only change yours.",
        duration: 5000,
      });
    }
  }, [params.username, currentUser]);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/users/${username}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
    enabled: !!username,
    retry: 1
  });

  const { data: predictions = [], isLoading: predictionsLoading } = useQuery({
    queryKey: [`/api/users/${username}/predictions`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}/predictions`);
      if (!res.ok) throw new Error('Failed to fetch predictions');
      return res.json();
    },
    enabled: !!username,
    retry: 1
  });

  // Fetch tournaments for contest detection
  const { data: tournaments = [] } = useQuery({
    queryKey: ['/api/tournaments'],
    queryFn: async () => {
      const res = await fetch('/api/tournaments');
      if (!res.ok) throw new Error('Failed to fetch tournaments');
      return res.json();
    },
    retry: 1
  });

  if (userLoading || predictionsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = currentUser && currentUser.username === username;
  
  // Filter predictions based on profile ownership
  const filteredPredictions = isOwnProfile 
    ? predictions 
    : predictions?.filter((p: any) => p.match.status !== 'upcoming') || [];

  // Calculate statistics
  const totalPredictions = predictions?.length * 2 || 0;
  const correctPredictions = predictions?.reduce((acc: number, p: any) => {
    let correct = 0;
    const match = p.match;
    if (match.tossWinnerId && p.predictedTossWinnerId === match.tossWinnerId) correct++;
    if (match.matchWinnerId && p.predictedMatchWinnerId === match.matchWinnerId) correct++;
    return acc + correct;
  }, 0) || 0;
  const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions * 100).toFixed(1) : '0.0';

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-32 w-32 border-4 border-neutral-100">
                  <AvatarImage src={user.profileImage} />
                  <AvatarFallback className="text-4xl">
                    {user.displayName?.[0] || user.username[0]}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mt-4">{user.displayName || user.username}</h1>
                <p className="text-neutral-600">@{user.username}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats & Predictions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Statistics Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="bg-white p-3 rounded-full inline-block shadow-md mb-2">
                      <Trophy className="h-8 w-8 text-amber-500" />
                    </div>
                    <div className="text-3xl font-bold text-blue-700">{user.points || 0}</div>
                    <p className="text-sm font-medium text-blue-800">Total Points</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="bg-white p-3 rounded-full inline-block shadow-md mb-2">
                      <PieChart className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold text-green-700">{accuracy}%</div>
                    <p className="text-sm font-medium text-green-800">Prediction Accuracy</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="bg-white p-3 rounded-full inline-block shadow-md mb-2">
                      <div className="flex">
                        <Check className="h-8 w-8 text-green-500" />
                        <span className="mx-1 text-gray-300">|</span>
                        <X className="h-8 w-8 text-red-500" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-700">{correctPredictions}/{totalPredictions}</div>
                    <p className="text-sm font-medium text-purple-800">Correct Predictions</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="bg-white p-3 rounded-full inline-block shadow-md mb-2">
                      <Heart className="h-8 w-8 text-pink-500" />
                    </div>
                    <div className="text-3xl font-bold text-pink-700">{user.lovedByCount || 0}</div>
                    <p className="text-sm font-medium text-pink-800">Loved By</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="bg-white p-3 rounded-full inline-block shadow-md mb-2">
                      <Eye className="h-8 w-8 text-indigo-500" />
                    </div>
                    <div className="text-3xl font-bold text-indigo-700">{user.viewedByCount || 0}</div>
                    <p className="text-sm font-medium text-indigo-800">Viewed By</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Predictions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Predictions</h2>
              {!isOwnProfile && (
                <div className="text-sm text-gray-500 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                  Only completed & live matches shown
                </div>
              )}
            </div>
            {filteredPredictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPredictions.map((prediction: any) => (
                  <Card key={prediction.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {tournaments?.find((t: any) => t.id === prediction.match.tournamentId)?.isContest ? (
                        <ContestMatchCard 
                          match={prediction.match} 
                          userPrediction={prediction}
                          currentUserId={user?.id}
                          isContestParticipant={true}
                        />
                      ) : (
                        <MatchCard match={prediction.match} userPrediction={prediction} />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 border-dashed border-2 border-gray-200 bg-gray-50">
                <div className="text-center py-6 text-gray-600">
                  <div className="mb-3">
                    <Trophy className="h-12 w-12 mx-auto text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {isOwnProfile ? "No Predictions Yet" : "No Completed Predictions Yet"}
                  </h3>
                  <p>
                    {isOwnProfile 
                      ? "This user hasn't made any predictions yet." 
                      : "This user hasn't made any predictions on completed or live matches yet."
                    }
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
