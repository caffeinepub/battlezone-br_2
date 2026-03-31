// @ts-nocheck
export const idlFactory = ({ IDL }) => {
  const ChatMessage = IDL.Record({
    'id' : IDL.Nat32,
    'senderName' : IDL.Text,
    'message' : IDL.Text,
  });
  const PlayerState = IDL.Record({
    'zPosition' : IDL.Nat32,
    'name' : IDL.Text,
    'isAlive' : IDL.Bool,
    'position' : IDL.Nat32,
    'health' : IDL.Nat32,
  });
  const ScoreEntry = IDL.Record({
    'placement' : IDL.Nat32,
    'name' : IDL.Text,
    'kills' : IDL.Nat32,
  });
  return IDL.Service({
    'createRoom' : IDL.Func([IDL.Text], [IDL.Text], []),
    'getChatMessages' : IDL.Func(
        [IDL.Text, IDL.Nat32],
        [IDL.Vec(ChatMessage)],
        ['query'],
      ),
    'getRoomState' : IDL.Func([IDL.Text], [IDL.Vec(PlayerState)], ['query']),
    'getTopScores' : IDL.Func([], [IDL.Vec(ScoreEntry)], ['query']),
    'joinRoom' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'leaveRoom' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'sendChatMessage' : IDL.Func([IDL.Text, IDL.Text, IDL.Text], [], []),
    'submitScore' : IDL.Func([IDL.Text, IDL.Nat32, IDL.Nat32], [], []),
    'updatePlayerState' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat32, IDL.Nat32, IDL.Nat32],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
