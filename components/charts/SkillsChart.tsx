"use client";
import { Application } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props { apps: Application[]; }

const COLORS = ["#6e7fc4","#6366f1","#8b5cf6","#5a6ab0","#0d9488","#16a34a","#ca8a04","#dc2626"];

export default function SkillsChart({ apps }: Props) {
  const freq: Record<string, number> = {};
  apps.forEach(a => {
    (a.skills || "").split(",").map(s => s.trim()).filter(Boolean).forEach(s => {
      freq[s] = (freq[s] || 0) + 1;
    });
  });

  const data = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill, count]) => ({ skill, count }));

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No skills data yet — log some applications first.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" barCategoryGap="20%">
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: "#374151" }} tickLine={false} axisLine={false} width={100} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-md text-xs">
                <p className="font-semibold text-gray-700">{payload[0].payload.skill}</p>
                <p className="text-blue-600">{payload[0].value} job{payload[0].value !== 1 ? "s" : ""}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
