import { create } from "zustand";
import { type User } from "@supabase/supabase-js";

export interface Task {
  id: string;
  room_id: string;
  title: string;
  order_index: number;
  revealed?: boolean;
  final_score?: string;
}

export interface Vote {
  id: string;
  task_id: string;
  user_id: string;
  value: string;
  user_name?: string;
  avatar_url?: string;
}

export interface Participant {
  user_id: string;
  user_name: string;
  avatar_url?: string;
}

interface RoomState {
  roomId: string | null;
  user: User | null;
  tasks: Task[];
  currentTaskId: string | null;
  votes: Vote[];
  participants: Participant[];
  roomOwnerId: string | null;
  leaderSelectedTaskId: string | null;

  setRoomId: (id: string | null) => void;
  setUser: (user: User | null) => void;
  setTasks: (tasks: Task[]) => void;
  setCurrentTaskId: (id: string | null) => void;
  setVotes: (votes: Vote[]) => void;
  setParticipants: (participants: Participant[]) => void;
  setRoomOwnerId: (id: string | null) => void;
  setLeaderSelectedTaskId: (id: string | null) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  user: null,
  tasks: [],
  currentTaskId: null,
  votes: [],
  participants: [],
  roomOwnerId: null,
  leaderSelectedTaskId: null,

  setRoomId: (id) => set({ roomId: id }),
  setUser: (user) => set({ user }),
  setTasks: (tasks) => set({ tasks }),
  setCurrentTaskId: (id) => set({ currentTaskId: id }),
  setVotes: (votes) => set({ votes }),
  setParticipants: (participants) => set({ participants }),
  setRoomOwnerId: (id) => set({ roomOwnerId: id }),
  setLeaderSelectedTaskId: (id) => set({ leaderSelectedTaskId: id }),
}));
