import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ScoreEntry {
    placement: number;
    name: string;
    kills: number;
}
export interface PlayerState {
    zPosition: number;
    name: string;
    isAlive: boolean;
    position: number;
    health: number;
}
export interface ChatMessage {
    id: number;
    senderName: string;
    message: string;
}
export interface backendInterface {
    createRoom(roomCode: string): Promise<string>;
    getChatMessages(roomCode: string, afterId: number): Promise<Array<ChatMessage>>;
    getRoomState(roomCode: string): Promise<Array<PlayerState>>;
    getTopScores(): Promise<Array<ScoreEntry>>;
    joinRoom(roomCode: string, playerName: string): Promise<void>;
    leaveRoom(roomCode: string, playerName: string): Promise<void>;
    sendChatMessage(roomCode: string, senderName: string, message: string): Promise<void>;
    submitScore(name: string, kills: number, placement: number): Promise<void>;
    updatePlayerState(roomCode: string, playerName: string, position: number, zPosition: number, health: number): Promise<void>;
}
