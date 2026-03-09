"use client";

import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f87171",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#60a5fa",
];

type ChartData = {
  type: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
};

export default function ChartBlock({ data }: { data: ChartData }) {
  // Transform data for Recharts format
  const chartData = data.labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    data.datasets.forEach((ds) => {
      point[ds.label] = ds.data[i] ?? 0;
    });
    return point;
  });

  return (
    <div className="my-4 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 text-center">
        📊 {data.title}
      </h3>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          {data.type === "pie" ? (
            <PieChart>
              <Pie
                data={chartData.map((d) => ({
                  name: d.name,
                  value: d[data.datasets[0]?.label] as number,
                }))}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend
                wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }}
              />
            </PieChart>
          ) : data.type === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tick={{ fill: "#94a3b8" }}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend
                wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }}
              />
              {data.datasets.map((ds, i) => (
                <Line
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[i % COLORS.length], r: 4 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tick={{ fill: "#94a3b8" }}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend
                wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }}
              />
              {data.datasets.map((ds, i) => (
                <Bar
                  key={ds.label}
                  dataKey={ds.label}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
