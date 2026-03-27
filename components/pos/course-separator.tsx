interface CourseSeparatorProps {
  courseNumber: number;
}

export function CourseSeparator({ courseNumber }: CourseSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t border-dashed border-border" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Course {courseNumber}
      </span>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  );
}
