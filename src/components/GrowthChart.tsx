"use client";
import React from "react";

export default function GrowthChart({ data }: { data: { date: string; views: number; pins: number }[] }) {
  if (!data || data.length === 0) return <div>No growth data yet.</div>;

  // Prepare chart data
  const viewsPoints = data.map((d, i) => `${i * 40},${200 - d.views}`).join(" ");
  const pinsPoints = data.map((d, i) => `${i * 40},${200 - d.pins}`).join(" ");

  return (
    <svg width={data.length * 40} height={220} className="bg-gray-50 rounded">
      {/* Views line */}
      <polyline
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        points={viewsPoints}
      />
      {/* Pins line */}
      <polyline
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        points={pinsPoints}
      />
      {/* Axis labels */}
      {data.map((d, i) => (
        <text key={d.date} x={i * 40} y={215} fontSize={10} textAnchor="middle">{d.date.slice(5)}</text>
      ))}
    </svg>
  );
}
