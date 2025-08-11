// Enhanced query caching configuration for better performance
export const CACHE_TIMES = {
  // User data - cache for 5 minutes
  USER: 5 * 60 * 1000,
  
  // Static data - cache for 15 minutes 
  TOURNAMENTS: 15 * 60 * 1000,
  MATCHES: 10 * 60 * 1000,
  
  // Dynamic data - cache for 2 minutes
  LEADERBOARD: 2 * 60 * 1000,
  PREDICTIONS: 2 * 60 * 1000,
  
  // Real-time data - cache for 30 seconds
  PREDICTION_STATS: 30 * 1000,
  CONTEST_PARTICIPANTS: 30 * 1000,
  
  // Settings - cache for 1 hour
  SETTINGS: 60 * 60 * 1000,
} as const;

export const QUERY_KEYS = {
  user: () => ['/api/user'],
  tournaments: (contestOnly?: boolean) => ['/api/tournaments', { contestOnly }],
  matches: (tournamentId?: number) => ['/api/matches', { tournamentId }],
  leaderboard: (timeframe?: string, tournamentId?: number) => ['/api/leaderboard', { timeframe, tournamentId }],
  predictions: (userId?: number) => ['/api/predictions', { userId }],
  predictionStats: (matchId: number) => ['/api/matches', matchId, 'prediction-stats'],
  contestParticipants: (contestId: number, userId: number) => ['/api/contest-participants/check', contestId, userId],
  settings: (key: string) => ['/api/settings', key],
} as const;