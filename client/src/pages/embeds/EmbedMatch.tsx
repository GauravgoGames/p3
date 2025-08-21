import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin, Users, TrendingUp } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  logoUrl?: string;
}

interface Match {
  id: number;
  team1: Team;
  team2: Team;
  location: string;
  dateTime: Date;
  status: 'upcoming' | 'live' | 'completed';
  tossWinner?: Team;
  matchWinner?: Team;
}

// Embed-specific minimal styling for clean iframe display
const EmbedMatch = () => {
  const { data: matches } = useQuery({
    queryKey: ['/api/matches'],
    queryFn: async () => {
      const response = await fetch('/api/matches');
      if (!response.ok) throw new Error('Failed to fetch matches');
      return response.json();
    },
  });

  const latestMatch = matches?.[0];

  if (!latestMatch) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Matches</h3>
          <p className="text-gray-500">Check back later for upcoming matches</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Live Match Prediction</h2>
          <p className="text-sm text-gray-600">Make your predictions now!</p>
        </div>

        {/* Match Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Match Status */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 text-center">
            <span className="text-sm font-semibold uppercase">
              {latestMatch.status === 'live' ? '🔴 Live' : 
               latestMatch.status === 'upcoming' ? '⏰ Upcoming' : '✅ Completed'}
            </span>
          </div>

          {/* Teams */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {latestMatch.team1.logoUrl && (
                  <img 
                    src={latestMatch.team1.logoUrl} 
                    alt={latestMatch.team1.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="font-semibold text-gray-800">{latestMatch.team1.name}</span>
              </div>
              <span className="text-gray-400 font-bold">VS</span>
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-gray-800">{latestMatch.team2.name}</span>
                {latestMatch.team2.logoUrl && (
                  <img 
                    src={latestMatch.team2.logoUrl} 
                    alt={latestMatch.team2.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Match Details */}
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{latestMatch.location}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{new Date(latestMatch.dateTime).toLocaleString()}</span>
              </div>
            </div>

            {/* Results (if match completed) */}
            {latestMatch.status === 'completed' && (
              <div className="mt-4 space-y-2">
                {latestMatch.tossWinner && (
                  <div className="bg-yellow-100 px-3 py-2 rounded-lg text-center">
                    <span className="text-sm font-medium">🪙 Toss Winner: {latestMatch.tossWinner.name}</span>
                  </div>
                )}
                {latestMatch.matchWinner && (
                  <div className="bg-green-100 px-3 py-2 rounded-lg text-center">
                    <span className="text-sm font-medium">🏆 Match Winner: {latestMatch.matchWinner.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Call to Action */}
            <div className="mt-4 text-center">
              <a 
                href={`${window.location.origin}/matches/${latestMatch.id}`}
                target="_parent"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Make Prediction</span>
              </a>
            </div>
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

export default EmbedMatch;