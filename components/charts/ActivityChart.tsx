"use client";
import { Application } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props { apps: Application[]; }

export default function ActivityChart({ apps }: Props) {
  const today  = new Date();
  const data   = Array.from({ length: 30 }, (_, i) => {
    const d     = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const key   = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const count = apps.filter(a => a.date === key).length;
    return { label, key, count };
  });

  const todayKey = today.toISOString().slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
          interval={4} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} width={20} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-md text-xs">
                <p className="font-semibold text-gray-700">{payload[0].payload.label}</p>
                <p className="text-blue-600">{payload[0].value} application{payload[0].value !== 1 ? "s" : ""}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.key === todayKey ? "#5a6ab0" : "#6e7fc4"} opacity={d.count === 0 ? 0.2 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
