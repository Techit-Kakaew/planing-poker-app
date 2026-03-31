import { useState, useEffect } from "react";
import { useRoomStore, type Task } from "@/store/useRoomStore";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Trash2, Crown, Pencil } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { renderTitleWithLinks } from "@/lib/renderTaskTitle";

export default function TaskList() {
  const {
    tasks,
    roomId,
    setTasks,
    currentTaskId,
    setCurrentTaskId,
    user,
    roomOwnerId,
    participants,
    leaderSelectedTaskId,
  } = useRoomStore();
  const isOwner = user?.id === roomOwnerId;
  const owner = participants.find((p) => p.user_id === roomOwnerId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);

      // Update in Supabase (simplified for MVP: update all indexes or just the moved ones)
      // For MVP, we'll just update the order_index of all tasks in the new order
      const updates = newTasks.map((task, index) => ({
        id: task.id,
        room_id: task.room_id,
        title: task.title,
        order_index: index,
        final_score: task.final_score,
      }));

      const { error } = await supabase.from("tasks").upsert(updates);
      if (error) console.error("Error updating task order:", error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !roomId) return;
    const newTask = {
      room_id: roomId,
      title: newTaskTitle,
      order_index: tasks.length,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert([newTask])
      .select()
      .single();

    if (error) {
      console.error("Error adding task:", error);
    } else if (data) {
      setNewTaskTitle("");
      setIsAddModalOpen(false);
      // Task will be added via realtime subscription in RoomPage
    }
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = window.confirm(
      "Are you sure you want to delete this task?",
    );
    if (!confirm) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) console.error("Error deleting task:", error);
    if (currentTaskId === id) setCurrentTaskId(null);
  };

  const handleEditTask = async () => {
    if (!editTaskTitle.trim() || !editingTask) return;
    const { error } = await supabase
      .from("tasks")
      .update({ title: editTaskTitle })
      .eq("id", editingTask.id);

    if (error) {
      console.error("Error updating task:", error);
    } else {
      setIsEditModalOpen(false);
      setEditingTask(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Owner Identifier */}
      <div className="px-6 py-3 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Room Leader
          </span>
        </div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {owner?.user_name || "Loading..."}
        </span>
      </div>

      <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Tasks
          <span className="text-sm font-normal py-0.5 px-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            {tasks.length}
          </span>
        </h2>
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400 font-medium rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                isActive={currentTaskId === task.id}
                onSelect={async () => {
                  setCurrentTaskId(task.id);
                  if (isOwner && roomId) {
                    await supabase
                      .from("rooms")
                      .update({ current_task_id: task.id })
                      .eq("id", roomId);
                  }
                }}
                onDelete={
                  isOwner ? (e) => handleDeleteTask(task.id, e) : undefined
                }
                onEdit={
                  isOwner
                    ? (e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                        setEditTaskTitle(task.title);
                        setIsEditModalOpen(true);
                      }
                    : undefined
                }
                isOwner={isOwner}
                isRoomLeaderSelection={task.id === leaderSelectedTaskId}
              />
            ))}
          </SortableContext>
        </DndContext>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-full">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">
              No tasks yet. Add one to start voting!
            </p>
          </div>
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Add New Task
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Task Title
            </label>
            <Input
              autoFocus
              placeholder="Enter task description..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              className="h-12 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!newTaskTitle}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">
              Edit Task
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="edit-task-title"
                className="text-sm font-bold text-slate-500 uppercase tracking-wider"
              >
                Task Name
              </label>
              <Input
                id="edit-task-title"
                placeholder="e.g. LP-1234 Improve login flow"
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditTask()}
                className="h-12 border-slate-200 dark:border-slate-800 focus:ring-indigo-500 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTask}
              disabled={!editTaskTitle.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableTaskItem({
  task,
  isActive,
  onSelect,
  onDelete,
  onEdit,
  isOwner,
  isRoomLeaderSelection,
}: {
  task: Task;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  isOwner: boolean;
  isRoomLeaderSelection: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isOwner });

  const [localScore, setLocalScore] = useState(task.final_score || "");

  // Update local score when server-side task score changes (from other users)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalScore(task.final_score || "");
  }, [task.final_score]);

  const handleScoreSync = async (val: string) => {
    if (!isOwner) return;
    const { error } = await supabase
      .from("tasks")
      .update({ final_score: val })
      .eq("id", task.id);
    if (error) console.error("Error updating final score:", error);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`
        group flex items-center p-4 rounded-2xl border transition-all cursor-pointer relative
        ${
          isRoomLeaderSelection
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-500 shadow-md ring-2 ring-amber-500/20 animate-in fade-in zoom-in duration-300"
            : isActive
              ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 shadow-md ring-1 ring-indigo-500/10"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-sm"
        }
        ${isDragging ? "opacity-50 cursor-grabbing" : ""}
      `}
    >
      {isOwner && (
        <div
          {...attributes}
          {...listeners}
          className="mr-3 p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p
          className={`text-sm font-semibold truncate ${isRoomLeaderSelection ? "text-amber-900 dark:text-amber-200" : isActive ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}
        >
          {renderTitleWithLinks(task.title)}
        </p>
        {isRoomLeaderSelection && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase z-20 shadow-md border border-amber-200 dark:border-amber-800 animate-in fade-in zoom-in duration-300">
            <Crown className="w-2.5 h-2.5" />
            Leading
          </div>
        )}
      </div>
      <div className="ml-2 flex items-center gap-2">
        {/* Final Score Input */}
        <div className="relative group/score">
          <input
            type="text"
            placeholder="-"
            disabled={!isOwner || !task.revealed}
            value={localScore}
            onChange={(e) => {
              if (isOwner) {
                setLocalScore(e.target.value);
              }
            }}
            onBlur={() => {
              if (isOwner && localScore !== (task.final_score || "")) {
                handleScoreSync(localScore);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className={`
              w-10 h-8 text-center text-xs font-bold rounded-lg border transition-all
              ${
                task.final_score
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400"
                  : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
              }
              ${isOwner ? "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-text" : "cursor-default border-transparent bg-transparent"}
            `}
          />
          {isOwner && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/score:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {!task.revealed
                ? "Reveal task first"
                : !task.final_score
                  ? "Set Final Score"
                  : "Update Score"}
            </div>
          )}
        </div>

        {isOwner && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      {(isRoomLeaderSelection || isActive) && (
        <div
          className={`absolute left-0 w-1.5 h-1/2 ${isRoomLeaderSelection ? "bg-amber-500" : "bg-indigo-500"} rounded-r-full`}
        />
      )}
    </div>
  );
}
