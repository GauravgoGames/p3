import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp, Award, Star } from 'lucide-react';

interface LeaderboardUser {
  id: number;
  username: string;
  displayName?: string;
  profileImage?: string;
  points: number;
  correctPredictions: number;
  totalMatches: number;
  isVerified?: boolean;
}

// Embed-specific minimal styling for clean iframe display
const EmbedLeaderboard = () => {
  const { data: leaderboard } = useQuery({
    queryKey: ['/api/leaderboard'],
    queryFn: async () => {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
  });

  const topUsers = leaderboard?.slice(0, 10) || [];

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center space-x-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <span>Top Predictors</span>
          </h2>
          <p className="text-sm text-gray-600">Live Leaderboard Rankings</p>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {topUsers.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No Rankings Yet</h3>
                <p className="text-sm">Be the first to make predictions!</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topUsers.map((user, index) => (
                <div key={user.id} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm">
                      {index === 0 && (
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white">
                          👑
                        </div>
                      )}
                      {index === 1 && (
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-white">
                          🥈
                        </div>
                      )}
                      {index === 2 && (
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white">
                          🥉
                        </div>
                      )}
                      {index > 2 && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                          #{index + 1}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {user.profileImage && (
                          <img 
                            src={user.profileImage} 
                            alt={user.displayName || user.username}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <span className="font-semibold text-gray-800 truncate">
                          {user.displayName || user.username}
                        </span>
                        {user.isVerified && (
                          <Star className="w-4 h-4 text-blue-500 fill-current" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.correctPredictions}/{user.totalMatches * 2} correct • {
                          user.totalMatches > 0 
                            ? Math.round((user.correctPredictions / (user.totalMatches * 2)) * 100)
                            : 0
                        }% accuracy
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex-shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-gray-800">{user.points}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View Full Leaderboard */}
          <div className="p-3 bg-gray-50 text-center">
            <a 
              href={`${window.location.origin}/leaderboard`}
              target="_parent"
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <TrendingUp className="w-4 h-4" />
              <span>View Full Leaderboard</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            Powered by <a href={window.location.origin} target="_parent" className="text-blue-500 hover:underline">CricProAce</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmbedLeaderboard;