"use client";

import { useEffect, useState } from "react";

export type ChartColors = {
  accent: string;
  accentSoft: string;
  foreground: string;
  muted: string;
  subtle: string;
  border: string;
  grid: string;
  surface: string;
  pending: string;
  assigned: string;
  onTheWay: string;
  completed: string;
  cancelled: string;
};

const lightChart: ChartColors = {
  accent: "#e9640b",
  accentSoft: "#fdf0e6",
  foreground: "#16181d",
  muted: "#62697a",
  subtle: "#99a0af",
  border: "#e5e7ec",
  grid: "#eceef2",
  surface: "#ffffff",
  pending: "#f5a524",
  assigned: "#175cd3",
  onTheWay: "#4f46e5",
  completed: "#0f7a56",
  cancelled: "#b42318",
};

const darkChart: ChartColors = {
  accent: "#f07820",
  accentSoft: "#2a1a0f",
  foreground: "#eef0f4",
  muted: "#9aa3b2",
  subtle: "#6b7382",
  border: "#2a303c",
  grid: "#222733",
  surface: "#14171d",
  pending: "#f0a04b",
  assigned: "#6b9fff",
  onTheWay: "#8b85ff",
  completed: "#3dba8b",
  cancelled: "#f07167",
};

export function useChartTheme(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(lightChart);

  useEffect(() => {
    const sync = () => {
      setColors(document.documentElement.classList.contains("dark") ? darkChart : lightChart);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
