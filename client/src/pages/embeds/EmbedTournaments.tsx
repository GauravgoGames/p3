import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Trophy, Users, ExternalLink } from 'lucide-react';

interface Tournament {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  startDate?: Date;
  endDate?: Date;
  isContest: boolean;
  matchCount: number;
}

// Embed-specific minimal styling for clean iframe display
const EmbedTournaments = () => {
  const { data: tournaments } = useQuery({
    queryKey: ['/api/tournaments'],
    queryFn: async () => {
      const response = await fetch('/api/tournaments');
      if (!response.ok) throw new Error('Failed to fetch tournaments');
      return response.json();
    },
  });

  const activeTournaments = tournaments?.slice(0, 5) || [];

  return (
    <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center space-x-2">
            <Trophy className="w-6 h-6 text-green-500" />
            <span>Active Tournaments</span>
          </h2>
          <p className="text-sm text-gray-600">Join exciting cricket tournaments</p>
        </div>

        {/* Tournaments List */}
        <div className="space-y-4">
          {activeTournaments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No Active Tournaments</h3>
                <p className="text-sm">New tournaments coming soon!</p>
              </div>
            </div>
          ) : (
            activeTournaments.map((tournament) => (
              <div key={tournament.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Tournament Image */}
                {tournament.imageUrl && (
                  <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 relative">
                    <img 
                      src={tournament.imageUrl} 
                      alt={tournament.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                    <div className="absolute top-3 right-3">
                      {tournament.isContest && (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          🏆 Contest
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4">
                  {/* Tournament Name */}
                  <h3 className="font-bold text-gray-800 mb-2 text-lg">{tournament.name}</h3>
                  
                  {/* Description */}
                  {tournament.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}

                  {/* Tournament Stats */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{tournament.matchCount} matches</span>
                    </div>
                    
                    {tournament.startDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(tournament.startDate).toLocaleDateString()}
                          {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="text-center">
                    <a 
                      href={`${window.location.origin}/tournaments/${tournament.id}`}
                      target="_parent"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Tournament</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* View All Tournaments */}
        {activeTournaments.length > 0 && (
          <div className="mt-4 text-center">
            <a 
              href={`${window.location.origin}/tournaments`}
              target="_parent"
              className="inline-flex items-center space-x-2 text-green-600 hover:text-green-800 text-sm font-medium"
            >
              <Trophy className="w-4 h-4" />
              <span>View All Tournaments</span>
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Powered by <a href={window.location.origin} target="_parent" className="text-blue-500 hover:underline">CricProAce</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmbedTournaments;