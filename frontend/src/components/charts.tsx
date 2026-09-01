"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/types";
import { chart } from "@/lib/theme";

type TipPayload = { payload?: SeriesPoint; value?: number }[];

function tickStep(len: number) {
  if (len <= 8) return 0;
  if (len <= 31) return 3;
  return 9;
}

function ChartTip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: TipPayload;
  unit: "bookings" | "revenue";
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-panel">
      <p className="text-[11px] font-medium text-subtle">{p.full}</p>
      {unit === "bookings" ? (
        <>
          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
            {p.bookings} bookings
          </p>
          <p className="text-[11px] tabular-nums text-muted">{p.completed} completed</p>
        </>
      ) : (
        <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
          ${p.revenue.toLocaleString("en-US")}
        </p>
      )}
    </div>
  );
}

const axisCommon = {
  tickLine: false,
  axisLine: false,
  tick: { fill: chart.subtle, fontSize: 11 },
};

export function BookingsLine({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" interval={tickStep(data.length)} {...axisCommon} />
        <YAxis width={48} {...axisCommon} />
        <Tooltip
          cursor={{ stroke: chart.border, strokeWidth: 1 }}
          content={<ChartTip unit="bookings" />}
        />
        <Line
          type="monotone"
          dataKey="bookings"
          stroke={chart.accent}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: chart.accent, stroke: chart.surface, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          stroke={chart.subtle}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenueArea({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.accent} stopOpacity={0.22} />
            <stop offset="100%" stopColor={chart.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" interval={tickStep(data.length)} {...axisCommon} />
        <YAxis
          width={54}
          tickFormatter={(v: number) => "$" + Math.round(v / 1000) + "k"}
          {...axisCommon}
        />
        <Tooltip
          cursor={{ stroke: chart.border, strokeWidth: 1 }}
          content={<ChartTip unit="revenue" />}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={chart.accent}
          strokeWidth={2}
          fill="url(#revFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const statusColors: Record<string, string> = {
  pending: chart.pending,
  assigned: chart.assigned,
  on_the_way: chart.onTheWay,
  completed: chart.completed,
  cancelled: chart.cancelled,
};

export function StatusDonut({
  data,
}: {
  data: { key: string; name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={64}
          outerRadius={94}
          paddingAngle={2}
          stroke={chart.surface}
          strokeWidth={2}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={statusColors[d.key]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ServiceBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
        barSize={16}
      >
        <CartesianGrid stroke={chart.grid} horizontal={false} />
        <XAxis type="number" {...axisCommon} />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          tickLine={false}
          axisLine={false}
          tick={{ fill: chart.muted, fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: chart.grid }}
          contentStyle={{
            borderRadius: 10,
            border: "1px solid " + chart.border,
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(16,24,40,0.1)",
          }}
        />
        <Bar dataKey="value" fill={chart.accent} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
