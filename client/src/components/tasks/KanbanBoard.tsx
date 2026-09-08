import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { STATUS_META, TASK_STATUSES } from "../../lib/constants";
import { classNames } from "../../lib/format";
import { useUpdateTask } from "../../hooks/useTasks";
import { errorMessage } from "../../lib/api";
import type { Task, TaskStatus } from "../../lib/types";
import { TaskCard } from "./TaskCard";

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  /** Viewers get a read-only board: no dragging, no add buttons. */
  canEdit: boolean;
  onOpenTask: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanBoard({
  projectId,
  tasks,
  canEdit,
  onOpenTask,
  onAddTask,
}: KanbanBoardProps) {
  const updateTask = useUpdateTask(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // A small distance threshold keeps click-to-open working alongside drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    const grouped = {} as Record<TaskStatus, Task[]>;
    for (const status of TASK_STATUSES) grouped[status] = [];
    for (const task of tasks) grouped[task.status]?.push(task);
    for (const status of TASK_STATUSES) {
      grouped[status].sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);
    const task = tasks.find((t) => t.id === activeTaskId);
    if (!task) return;

    const isColumnTarget = (TASK_STATUSES as string[]).includes(overId);
    const destination = isColumnTarget
      ? (overId as TaskStatus)
      : tasks.find((t) => t.id === overId)?.status;
    if (!destination) return;
    if (destination === task.status && overId === activeTaskId) return;

    // Rebuild the destination column exactly as it will look after the drop,
    // then park the card halfway between its new neighbours.
    const column = columns[destination];
    let reordered: Task[];

    if (task.status === destination) {
      const from = column.findIndex((t) => t.id === activeTaskId);
      const to = isColumnTarget ? column.length - 1 : column.findIndex((t) => t.id === overId);
      if (from === -1 || to === -1 || from === to) return;
      reordered = arrayMove(column, from, to);
    } else {
      const insertAt = isColumnTarget ? column.length : column.findIndex((t) => t.id === overId);
      reordered = [...column];
      reordered.splice(insertAt === -1 ? column.length : insertAt, 0, task);
    }

    const index = reordered.findIndex((t) => t.id === activeTaskId);
    const previous = reordered[index - 1];
    const next = reordered[index + 1];
    const position =
      previous && next
        ? (previous.position + next.position) / 2
        : previous
          ? previous.position + 1000
          : next
            ? next.position / 2
            : 1000;

    updateTask.mutate(
      { taskId: activeTaskId, input: { status: destination, position } },
      { onError: (error) => toast.error(errorMessage(error, "Could not move the task")) },
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            canEdit={canEdit}
            onOpenTask={onOpenTask}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeTask ? (
          <div className="w-[286px] rotate-2 cursor-grabbing">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  canEdit,
  onOpenTask,
  onAddTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  canEdit: boolean;
  onOpenTask: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className="flex w-[300px] shrink-0 flex-col rounded-xl bg-slate-100/70">
      <header className={classNames("flex items-center gap-2 border-t-2 px-3 py-3", meta.column)}>
        <span className={classNames("h-2 w-2 rounded-full", meta.dot)} />
        <h3 className="text-sm font-semibold text-slate-700">{meta.label}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
          {tasks.length}
        </span>
        {canEdit && (
          <button
            onClick={() => onAddTask(status)}
            aria-label={`Add task to ${meta.label}`}
            className="ml-auto rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-brand-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={classNames(
          "scrollbar-thin flex min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-brand-50/60",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              disabled={!canEdit}
              onClick={() => onOpenTask(task.id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            {canEdit ? "Drop a task here" : "Nothing here"}
          </p>
        )}
      </div>
    </section>
  );
}

function SortableTask({
  task,
  disabled,
  onClick,
}: {
  task: Task;
  disabled: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={classNames(!disabled && "touch-none")}
    >
      <TaskCard task={task} dragging={isDragging} onClick={onClick} />
    </div>
  );
}
