import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import '@/index.css';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Users, UserPlus, UserMinus, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

interface Tournament {
  id: number;
  name: string;
  description: string | null;
  isContest: boolean;
  startDate: string | null;
  endDate: string | null;
}

interface User {
  id: number;
  username: string;
  displayName: string | null;
  isVerified: boolean;
}

interface ContestParticipant {
  id: number;
  tournamentId: number;
  userId: number;
  user: User;
}

export default function ManageContests() {
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all contests (tournaments where isContest = true)
  const { data: contests = [], isLoading: contestsLoading } = useQuery<Tournament[]>({
    queryKey: ['/api/tournaments', { contest: true }],
    queryFn: async () => {
      const response = await fetch('/api/tournaments?contest=true');
      if (!response.ok) throw new Error('Failed to fetch contests');
      return response.json();
    },
  });

  // Auto-select first contest if only one exists and none selected
  useEffect(() => {
    if (contests.length === 1 && !selectedTournament) {
      setSelectedTournament(contests[0]);
    }
  }, [contests, selectedTournament]);

  // Fetch all users for participant selection
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!selectedTournament,
  });

  // Fetch participants for selected contest
  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['/api/contest-participants', selectedTournament?.id],
    queryFn: async () => {
      const response = await fetch(`/api/contest-participants/${selectedTournament?.id}`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      return response.json();
    },
    enabled: !!selectedTournament,
  });

  // Add participant mutation
  const addParticipantMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch('/api/contest-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTournament?.id,
          userId,
        }),
      });
      if (!response.ok) throw new Error('Failed to add participant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/contest-participants', selectedTournament?.id] 
      });
      toast({
        title: "Participant Added",
        description: "User has been added to the contest.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add participant.",
        variant: "destructive",
      });
    },
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const response = await fetch(`/api/contest-participants/${participantId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove participant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/contest-participants', selectedTournament?.id] 
      });
      toast({
        title: "Participant Removed",
        description: "User has been removed from the contest.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove participant.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = allUsers.filter((user: User) => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const participantUserIds = participants.map((p: ContestParticipant) => p.userId);
  const availableUsers = filteredUsers.filter((user: User) => 
    !participantUserIds.includes(user.id)
  );

  if (contestsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading contests...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Crown className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold">Manage Contests</h1>
          <p className="text-muted-foreground">Control user access to premium contest tournaments</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contest Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Contest Tournaments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No contest tournaments found. Create a tournament and mark it as a contest.
              </p>
            ) : (
              <div className="space-y-3">
                {contests.map((contest: Tournament) => (
                  <motion.div
                    key={contest.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedTournament?.id === contest.id 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedTournament(contest)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{contest.name}</h3>
                            {contest.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {contest.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Crown className="h-3 w-3 mr-1" />
                            Contest
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participant Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contest Participants
              {selectedTournament && (
                <Badge variant="outline">
                  {participantsLoading ? '...' : participants.length} users
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTournament ? (
              <p className="text-muted-foreground text-center py-8">
                Select a contest tournament to manage participants
              </p>
            ) : (
              <div className="space-y-4">
                {/* Search for users to add */}
                <div>
                  <Input
                    placeholder="Search users to add..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-3"
                  />
                  
                  {searchTerm && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No available users found</p>
                      ) : (
                        availableUsers.map((user: User) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.username}</span>
                              {user.displayName && (
                                <span className="text-sm text-muted-foreground">
                                  ({user.displayName})
                                </span>
                              )}
                              {user.isVerified && (
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addParticipantMutation.mutate(user.id)}
                              disabled={addParticipantMutation.isPending}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Current participants */}
                <div>
                  <h4 className="font-medium mb-3">Current Participants</h4>
                  {participantsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading participants...</p>
                  ) : participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No participants added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((participant: ContestParticipant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{participant.user.username}</span>
                            {participant.user.displayName && (
                              <span className="text-sm text-muted-foreground">
                                ({participant.user.displayName})
                              </span>
                            )}
                            {participant.user.isVerified && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeParticipantMutation.mutate(participant.id)}
                            disabled={removeParticipantMutation.isPending}
                          >
                            <UserMinus className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}