import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

actor {
  type PlayerState = {
    name : Text;
    position : Nat32;
    zPosition : Nat32;
    health : Nat32;
    isAlive : Bool;
  };

  type ScoreEntry = {
    name : Text;
    kills : Nat32;
    placement : Nat32;
  };

  type ChatMessage = {
    id : Nat32;
    senderName : Text;
    message : Text;
  };

  type Room = {
    code : Text;
    players : Map.Map<Text, PlayerState>;
    chatMessages : Map.Map<Nat32, ChatMessage>;
    nextMessageId : Nat32;
  };

  module ScoreEntry {
    public func compareByKillsDescending(a : ScoreEntry, b : ScoreEntry) : Order.Order {
      Nat32.compare(b.kills, a.kills);
    };
  };

  let scores = Map.empty<Text, ScoreEntry>();
  let rooms = Map.empty<Text, Room>();

  func getRoomOrTrap(roomCode : Text) : Room {
    switch (rooms.get(roomCode)) {
      case (?room) { room };
      case (null) { Runtime.trap("Room not found") };
    };
  };

  public shared func submitScore(name : Text, kills : Nat32, placement : Nat32) : async () {
    if (name.size() == 0) {
      Runtime.trap("Name cannot be empty");
    };
    let scoreEntry : ScoreEntry = { name; kills; placement };
    scores.add(name, scoreEntry);
  };

  public query func getTopScores() : async [ScoreEntry] {
    scores.values().toArray().sort(ScoreEntry.compareByKillsDescending).sliceToArray(0, Nat.min(10, scores.size()));
  };

  public shared func createRoom(roomCode : Text) : async Text {
    if (roomCode.size() == 0) {
      Runtime.trap("Room code cannot be empty");
    };
    if (rooms.containsKey(roomCode)) {
      Runtime.trap("Room already exists");
    };
    let room : Room = {
      code = roomCode;
      players = Map.empty<Text, PlayerState>();
      chatMessages = Map.empty<Nat32, ChatMessage>();
      nextMessageId = 0;
    };
    rooms.add(roomCode, room);
    roomCode;
  };

  public shared func joinRoom(roomCode : Text, playerName : Text) : async () {
    let room = getRoomOrTrap(roomCode);
    let playerState : PlayerState = {
      name = playerName;
      position = 100;
      zPosition = 100;
      health = 100;
      isAlive = true;
    };
    room.players.add(playerName, playerState);
    rooms.add(roomCode, room);
  };

  // position and zPosition are stored offset by +100 so that
  // map coords in range -99..99 become 1..199 (valid Nat32).
  public shared func updatePlayerState(roomCode : Text, playerName : Text, position : Nat32, zPosition : Nat32, health : Nat32) : async () {
    let room = getRoomOrTrap(roomCode);
    switch (room.players.get(playerName)) {
      case (null) { Runtime.trap("Player not found") };
      case (?player) {
        let updatedPlayer : PlayerState = {
          player with
          position;
          zPosition;
          health;
          isAlive = health > 0;
        };
        room.players.add(playerName, updatedPlayer);
        rooms.add(roomCode, room);
      };
    };
  };

  public query func getRoomState(roomCode : Text) : async [PlayerState] {
    getRoomOrTrap(roomCode).players.values().toArray();
  };

  public shared func leaveRoom(roomCode : Text, playerName : Text) : async () {
    let room = getRoomOrTrap(roomCode);
    if (room.players.containsKey(playerName)) {
      room.players.remove(playerName);
      rooms.add(roomCode, room);
    } else {
      Runtime.trap("Player not found");
    };
  };

  public shared func sendChatMessage(roomCode : Text, senderName : Text, message : Text) : async () {
    if (senderName.size() == 0) {
      Runtime.trap("Sender name cannot be empty");
    };
    if (message.size() == 0) {
      Runtime.trap("Message cannot be empty");
    };
    let room = getRoomOrTrap(roomCode);
    let chatMessage : ChatMessage = {
      id = room.nextMessageId;
      senderName;
      message;
    };
    room.chatMessages.add(room.nextMessageId, chatMessage);
    let nextMessageId = room.nextMessageId + 1;
    if (room.chatMessages.size() > 50) {
      let oldestId = nextMessageId - 51 : Nat32;
      room.chatMessages.remove(oldestId);
    };
    let updatedRoom = { room with nextMessageId };
    rooms.add(roomCode, updatedRoom);
  };

  public query func getChatMessages(roomCode : Text, afterId : Nat32) : async [ChatMessage] {
    let room = getRoomOrTrap(roomCode);
    room.chatMessages.toArray().filter(
      func((id, _message)) { id > afterId }
    ).map(
      func((_, message)) { message }
    );
  };
};
