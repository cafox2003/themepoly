import type { GameAction, GameState } from "../engine/types";

export type RoomSeats = Record<string, string>;

export type ClientMessage =
  | {
      type: "CREATE_ROOM";
      clientToken: string;
      players: Array<{ name: string; tokenId: string }>;
    }
  | {
      type: "JOIN_ROOM";
      roomId: string;
      clientToken: string;
      playerName: string;
    }
  | {
      type: "CLAIM_PLAYER";
      roomId: string;
      playerId: string;
      playerName?: string;
    }
  | {
      type: "ACTION";
      roomId: string;
      action: GameAction;
    };

export type ServerMessage =
  | {
      type: "ROOM_CREATED";
      roomId: string;
      clientId: string;
      claimedPlayerId: string | null;
      seats: RoomSeats;
      state: GameState;
    }
  | {
      type: "ROOM_JOINED";
      roomId: string;
      clientId: string;
      claimedPlayerId: string | null;
      seats: RoomSeats;
      state: GameState;
    }
  | {
      type: "SEATS";
      roomId: string;
      claimedPlayerId: string | null;
      seats: RoomSeats;
    }
  | {
      type: "STATE";
      roomId: string;
      claimedPlayerId?: string | null;
      seats: RoomSeats;
      state: GameState;
      events: string[];
    }
  | {
      type: "ERROR";
      message: string;
    };
