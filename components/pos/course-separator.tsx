interface CourseSeparatorProps {
  courseNumber: number;
  itemCount?: number;
  isActive?: boolean;
}

export function CourseSeparator({
  courseNumber,
  itemCount,
  isActive = false,
}: CourseSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex-1 border-t ${
          isActive ? "border-primary/60" : "border-dashed border-border"
        }`}
      />
      <span
        className={`text-xs font-medium uppercase tracking-wide ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        Course {courseNumber}
        {itemCount !== undefined && ` · ${itemCount}`}
      </span>
      <div
        className={`flex-1 border-t ${
          isActive ? "border-primary/60" : "border-dashed border-border"
        }`}
      />
    </div>
  );
}
