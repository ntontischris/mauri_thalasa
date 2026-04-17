"use client";

import { useMemo, useState, useTransition, type KeyboardEvent } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseColorPicker } from "./course-color-picker";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  reorderCourses,
  assignCategoryCourse,
} from "@/lib/actions/courses";
import type { DbCategory, DbCourse } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface CoursesManagerProps {
  initialCourses: DbCourse[];
  initialCategories: DbCategory[];
}

const UNASSIGNED_ID = "__unassigned__";

export function CoursesManager({
  initialCourses,
  initialCategories,
}: CoursesManagerProps) {
  const [courses, setCourses] = useState<DbCourse[]>(initialCourses);
  const [categories, setCategories] = useState<DbCategory[]>(initialCategories);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const categoriesByCourse = useMemo(() => {
    const map = new Map<string, DbCategory[]>();
    map.set(UNASSIGNED_ID, []);
    for (const c of courses) map.set(c.id, []);
    for (const cat of categories) {
      const key = cat.course_id ?? UNASSIGNED_ID;
      const list = map.get(key) ?? [];
      list.push(cat);
      map.set(key, list);
    }
    return map;
  }, [courses, categories]);

  const unassignedCount = categoriesByCourse.get(UNASSIGNED_ID)?.length ?? 0;

  // --- Courses CRUD ---

  const handleCreateCourse = () => {
    startTransition(async () => {
      const r = await createCourse({ name: "Νέο Πιάτο" });
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Αποτυχία");
        return;
      }
      setCourses((prev) => [...prev, r.data!]);
    });
  };

  const handleRenameCourse = (id: string, name: string) => {
    const previous = courses.find((c) => c.id === id);
    if (!previous || previous.name === name) return;
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    startTransition(async () => {
      const r = await updateCourse({ id, name });
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setCourses((prev) => prev.map((c) => (c.id === id ? previous : c)));
      }
    });
  };

  const handleChangeColor = (id: string, color: string | null) => {
    const previous = courses.find((c) => c.id === id);
    if (!previous) return;
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
    startTransition(async () => {
      const r = await updateCourse({ id, color });
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setCourses((prev) => prev.map((c) => (c.id === id ? previous : c)));
      }
    });
  };

  const handleDeleteCourse = (id: string) => {
    const course = courses.find((c) => c.id === id);
    if (!course) return;
    const assigned = categoriesByCourse.get(id)?.length ?? 0;
    const message =
      assigned > 0
        ? `Διαγραφή "${course.name}"; ${assigned} κατηγορίες θα γίνουν ανενεργές.`
        : `Διαγραφή "${course.name}";`;
    if (!window.confirm(message)) return;

    const previousCourses = courses;
    const previousCategories = categories;
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setCategories((prev) =>
      prev.map((cat) =>
        cat.course_id === id ? { ...cat, course_id: null } : cat,
      ),
    );
    startTransition(async () => {
      const r = await deleteCourse({ id });
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setCourses(previousCourses);
        setCategories(previousCategories);
      }
    });
  };

  // --- Courses reorder ---

  const handleCoursesReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = courses.findIndex((c) => c.id === active.id);
    const newIndex = courses.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = courses;
    const reordered = arrayMove(courses, oldIndex, newIndex).map((c, i) => ({
      ...c,
      sort_order: i + 1,
    }));
    setCourses(reordered);
    startTransition(async () => {
      const r = await reorderCourses({
        orderedIds: reordered.map((c) => c.id),
      });
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setCourses(previous);
      }
    });
  };

  // --- Category assignment ---

  const handleCategoryDragStart = (event: DragStartEvent) => {
    setDraggingCategoryId(String(event.active.id));
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    setDraggingCategoryId(null);
    const { active, over } = event;
    if (!over) return;
    const categoryId = String(active.id);
    const target = String(over.id);
    const newCourseId = target === UNASSIGNED_ID ? null : target;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat || cat.course_id === newCourseId) return;

    const previous = categories;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, course_id: newCourseId } : c,
      ),
    );
    startTransition(async () => {
      const r = await assignCategoryCourse({
        categoryId,
        courseId: newCourseId,
      });
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setCategories(previous);
      }
    });
  };

  const draggingCategory = draggingCategoryId
    ? (categories.find((c) => c.id === draggingCategoryId) ?? null)
    : null;

  return (
    <div className="space-y-6">
      {/* Courses strip (sortable horizontal) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Πιάτα (Σειρά Σερβιρίσματος)</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCoursesReorder}
          >
            <div className="flex flex-wrap items-center gap-2">
              <SortableContext
                items={courses.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                {courses.map((course) => (
                  <SortableCourseChip
                    key={course.id}
                    course={course}
                    onRename={(name) => handleRenameCourse(course.id, name)}
                    onColorChange={(color) =>
                      handleChangeColor(course.id, color)
                    }
                    onDelete={() => handleDeleteCourse(course.id)}
                    disabled={isPending}
                  />
                ))}
              </SortableContext>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateCourse}
                disabled={isPending}
              >
                <Plus className="mr-1 size-4" />
                Νέο Πιάτο
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Σύρετε τα πιάτα για να αλλάξετε σειρά. Κλικ στο κύκλο για χρώμα.
            </p>
          </DndContext>
        </CardContent>
      </Card>

      {unassignedCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {unassignedCount}{" "}
              {unassignedCount === 1 ? "κατηγορία" : "κατηγορίες"} χωρίς πιάτο
            </p>
            <p className="text-sm text-muted-foreground">
              Τα προϊόντα τους δεν εμφανίζονται στις παραγγελίες μέχρι να τους
              ανατεθεί πιάτο.
            </p>
          </div>
        </div>
      )}

      {/* Assignment board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleCategoryDragStart}
        onDragEnd={handleCategoryDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseColumn
              key={course.id}
              id={course.id}
              title={course.name}
              color={course.color}
              categories={categoriesByCourse.get(course.id) ?? []}
              isActive={draggingCategoryId !== null}
            />
          ))}
          <CourseColumn
            id={UNASSIGNED_ID}
            title="Ανενεργές"
            color={null}
            categories={categoriesByCourse.get(UNASSIGNED_ID) ?? []}
            isActive={draggingCategoryId !== null}
            variant="unassigned"
          />
        </div>

        <DragOverlay>
          {draggingCategory && (
            <CategoryCardPreview name={draggingCategory.name} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// --- Sortable course chip ---

function SortableCourseChip({
  course,
  onRename,
  onColorChange,
  onDelete,
  disabled,
}: {
  course: DbCourse;
  onRename: (name: string) => void;
  onColorChange: (color: string | null) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });
  const [name, setName] = useState(course.name);
  const [editing, setEditing] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(course.name);
      setEditing(false);
      return;
    }
    onRename(trimmed);
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    else if (e.key === "Escape") {
      setName(course.name);
      setEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-sm"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Μετακίνηση"
      >
        <GripVertical className="size-4" />
      </button>

      <CourseColorPicker
        value={course.color}
        onChange={onColorChange}
        disabled={disabled}
      />

      {editing ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className="h-7 w-32 text-sm"
          disabled={disabled}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium hover:text-primary"
          disabled={disabled}
        >
          {course.name}
        </button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
        aria-label="Διαγραφή"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

// --- Course column (droppable) ---

function CourseColumn({
  id,
  title,
  color,
  categories,
  isActive,
  variant = "course",
}: {
  id: string;
  title: string;
  color: string | null;
  categories: DbCategory[];
  isActive: boolean;
  variant?: "course" | "unassigned";
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "flex flex-col transition-colors",
        variant === "unassigned" && "bg-muted/40 border-dashed",
        isActive && "ring-1 ring-border",
        isOver && "ring-2 ring-primary",
      )}
      style={color ? { borderTopColor: color, borderTopWidth: 3 } : {}}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span style={color ? { color } : {}}>{title}</span>
          <Badge variant="outline">{categories.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.length === 0 ? (
          <p className="py-3 text-center text-xs italic text-muted-foreground">
            Σύρετε κατηγορίες εδώ
          </p>
        ) : (
          categories.map((cat) => (
            <DraggableCategoryCard key={cat.id} category={cat} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// --- Draggable category card ---

function DraggableCategoryCard({ category }: { category: DbCategory }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab touch-none rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-sm transition",
        "hover:border-primary/60 hover:shadow-md",
        isDragging && "opacity-40",
      )}
    >
      {category.name}
    </div>
  );
}

function CategoryCardPreview({ name }: { name: string }) {
  return (
    <div className="cursor-grabbing rounded-md border-2 border-primary bg-card px-3 py-2 text-sm font-medium shadow-lg">
      {name}
    </div>
  );
}
