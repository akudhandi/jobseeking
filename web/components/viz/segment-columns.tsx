"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SingleSeriesTooltip } from "./chart-tooltip";
import { useMeasure } from "./use-measure";

export interface ColumnDatum {
  label: string;
  fullLabel?: string;
  value: number;
  highlight?: boolean;
}

const MARGIN = { top: 14, right: 6, left: 0, bottom: 2 };
const X_AXIS_HEIGHT = 26;

interface ShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ColumnDatum;
}

/**
 * One period per thin column, with the current period marked by a hatched band
 * and a dashed drop line. The band is drawn by the shape itself rather than by
 * a Recharts reference area so it lines up exactly with its column.
 */
export function SegmentColumns({
  data,
  height = 264,
  color = "#0B0B0D",
  highlightColor = "#FF4D2E",
  seriesLabel = "Lowongan",
  unit = "",
  yTickFormatter,
  className,
}: {
  data: ColumnDatum[];
  height?: number;
  color?: string;
  highlightColor?: string;
  seriesLabel?: string;
  unit?: string;
  /** Only passable from a client parent: functions cannot cross a server boundary. */
  yTickFormatter?: (value: number) => string;
  className?: string;
}) {
  const { ref, box } = useMeasure<HTMLDivElement>();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const hatchId = `hatch-${uid}`;

  const measured = box.height || height;
  const plotHeight = Math.max(0, measured - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT);

  const renderColumn = (props: unknown): React.ReactElement => {
    const { x = 0, y = 0, width = 0, height: barHeight = 0, payload } = props as ShapeProps;
    const centre = x + width / 2;
    const marked = Boolean(payload?.highlight);
    return (
      <g>
        {marked ? (
          <g>
            <rect
              x={centre - 11}
              y={MARGIN.top}
              width={22}
              height={plotHeight}
              rx={11}
              fill={`url(#${hatchId})`}
            />
            <line
              x1={centre}
              x2={centre}
              y1={y}
              y2={MARGIN.top + plotHeight}
              stroke={highlightColor}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          </g>
        ) : null}
        <rect
          x={x}
          y={y}
          width={width}
          height={Math.max(barHeight, 2)}
          rx={2}
          fill={marked ? highlightColor : color}
          opacity={marked ? 1 : 0.82}
        />
      </g>
    );
  };

  return (
    <div ref={ref} className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN} barCategoryGap="28%">
          <defs>
            <pattern
              id={hatchId}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke={highlightColor}
                strokeWidth="1.5"
                opacity="0.35"
              />
            </pattern>
          </defs>
          <CartesianGrid vertical horizontal={false} stroke="#F1F1F4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={X_AXIS_HEIGHT}
            tick={{ fill: "#8A8E96", fontSize: 11 }}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: "#A0A3AA", fontSize: 10 }}
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            cursor={{ fill: "rgba(11,11,13,0.035)" }}
            content={<SingleSeriesTooltip seriesLabel={seriesLabel} unit={unit} />}
          />
          <Bar dataKey="value" barSize={3} shape={renderColumn} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
