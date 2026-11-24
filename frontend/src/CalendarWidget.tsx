import type { Layer } from "./domain";
import { DEFAULT_CALENDAR_DATE, calendarGrid } from "./calendar";
export default function Calendar({
  layer: l,
  date = DEFAULT_CALENDAR_DATE,
  aod = false,
}: {
  layer: Layer;
  date?: string;
  aod?: boolean;
}) {
  const grid = calendarGrid(date, l.calendarStart),
    color = aod ? l.aodColor || "#777777" : l.color;
  const size = aod ? l.aodSize || l.size : l.size;
  return (
    <g data-calendar-date={date}>
      {grid.headers.map((day, i) => (
        <text
          key={i}
          x={((i + 0.5) * l.w) / 7}
          y={l.h / 8}
          fill={aod ? color : l.calendarHeaderColor || "#7891aa"}
          fontSize={size}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {day}
        </text>
      ))}
      {grid.cells.map((day, i) => {
        const x = (((i % 7) + 0.5) * l.w) / 7,
          y = ((Math.floor(i / 7) + 1.5) * l.h) / 4;
        return (
          <g
            key={day.key}
            data-calendar-cell={day.key}
            data-today={day.today ? "true" : "false"}
          >
            {day.today && (
              <circle
                cx={x}
                cy={y}
                r={Math.min(l.w / 7, l.h / 4) * 0.43}
                fill={aod ? color : l.calendarTodayColor || "#70c7ff"}
              />
            )}
            <text
              x={x}
              y={y}
              fill={
                day.today
                  ? l.calendarTodayText || "#07131d"
                  : aod
                    ? color
                    : day.adjacent
                      ? l.calendarMutedColor || "#586a7f"
                      : color
              }
              fontSize={size}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {day.day}
            </text>
          </g>
        );
      })}
    </g>
  );
}
