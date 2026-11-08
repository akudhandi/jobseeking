"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#0f766e",
];

interface Point {
  name: string;
  count: number;
}

export function VerticalBars({
  data,
  height = 280,
  angle = -30,
}: {
  data: Point[];
  height?: number;
  angle?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" angle={angle} textAnchor="end" interval={0} fontSize={12} height={60} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Jumlah" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, height = 320 }: { data: Point[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={140} fontSize={12} />
        <Tooltip />
        <Bar dataKey="count" name="Jumlah" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 280 }: { data: Point[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, height = 280 }: { data: { bucket: string; count: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" fontSize={12} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="count" name="Lowongan" stroke="#2563eb" strokeWidth={2} dot />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface SalaryBarPoint {
  name: string;
  min: number;
  max: number;
}

export function SalaryRangeBars({ data, height = 340 }: { data: SalaryBarPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          fontSize={12}
          tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}jt`}
        />
        <YAxis type="category" dataKey="name" width={150} fontSize={12} />
        <Tooltip formatter={(v: number) => `Rp ${(v / 1_000_000).toFixed(1)}jt`} />
        <Legend />
        <Bar dataKey="min" name="Rata2 min" fill="#93c5fd" radius={[0, 4, 4, 0]} />
        <Bar dataKey="max" name="Rata2 max" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
