interface CourseSeparatorProps {
  courseNumber: number;
  name?: string;
  color?: string | null;
  itemCount?: number;
  isActive?: boolean;
}

export function CourseSeparator({
  courseNumber,
  name,
  color,
  itemCount,
  isActive = false,
}: CourseSeparatorProps) {
  const label = name ?? `Πιάτο ${courseNumber}`;
  const lineStyle: React.CSSProperties = color
    ? { borderColor: color, opacity: isActive ? 1 : 0.7 }
    : {};
  const textStyle: React.CSSProperties = color ? { color } : {};

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="flex-1 border-t"
        style={
          color
            ? lineStyle
            : isActive
              ? { borderStyle: "solid" }
              : { borderStyle: "dashed" }
        }
      />
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={color ? textStyle : {}}
      >
        {label}
        {itemCount !== undefined && ` · ${itemCount}`}
      </span>
      <div
        className="flex-1 border-t"
        style={
          color
            ? lineStyle
            : isActive
              ? { borderStyle: "solid" }
              : { borderStyle: "dashed" }
        }
      />
    </div>
  );
}
