"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PIE_COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e",
  "#a78bfa", "#34d399", "#fb923c", "#38bdf8", "#e879f9",
];

interface Props {
  byDay: { day: string; cost: number }[];
  byModel: { model: string; cost: number; calls: number }[];
  byStage: { stage: string; cost: number }[];
}

function formatUsd(v: number) {
  return `$${v.toFixed(4)}`;
}

export default function AdminLLMCharts({ byDay, byModel, byStage }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily cost line chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Daily Cost — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {byDay.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip formatter={(v: number) => formatUsd(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Cost (USD)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cost by model bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost by Model (this month)</CardTitle>
        </CardHeader>
        <CardContent>
          {byModel.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byModel} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v: number) => formatUsd(v)} />
                <Bar dataKey="cost" name="Cost (USD)" fill="#6366f1" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cost by stage pie chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost by Stage (this month)</CardTitle>
        </CardHeader>
        <CardContent>
          {byStage.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byStage}
                  dataKey="cost"
                  nameKey="stage"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ stage, percent }) => `${stage} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {byStage.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatUsd(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
