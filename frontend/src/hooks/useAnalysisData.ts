import { useEffect, useState } from "react";
import type { AnalysisData } from "../types/analysis";

export function useAnalysisData(taskId: string) {
  const [data, setData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    fetch(`api/analysis/${taskId}`)
      .then(res => res.json())
      .then(setData);
  }, [taskId]);

  return data;
}