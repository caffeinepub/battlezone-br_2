import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScoreEntry } from "../backend.d";
import { useActor } from "./useActor";

export function useGetTopScores() {
  const { actor, isFetching } = useActor();
  return useQuery<ScoreEntry[]>({
    queryKey: ["topScores"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopScores();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      kills,
      placement,
    }: { name: string; kills: number; placement: number }) => {
      if (!actor) return;
      await actor.submitScore(name, kills, placement);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topScores"] });
    },
  });
}

export function useCreateRoom() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (roomCode: string) => {
      if (!actor) throw new Error("No actor");
      return actor.createRoom(roomCode);
    },
  });
}

export function useJoinRoom() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      roomCode,
      playerName,
    }: { roomCode: string; playerName: string }) => {
      if (!actor) throw new Error("No actor");
      await actor.joinRoom(roomCode, playerName);
    },
  });
}

export function useLeaveRoom() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      roomCode,
      playerName,
    }: { roomCode: string; playerName: string }) => {
      if (!actor) return;
      await actor.leaveRoom(roomCode, playerName);
    },
  });
}
