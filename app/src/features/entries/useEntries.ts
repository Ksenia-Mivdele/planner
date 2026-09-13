import { useEffect, useState } from "react";
import { deleteEntry, listEntries, saveEntry } from "../../db/database";
import type { PlannerEntry } from "../../types/planner";

export function useEntries() {
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void listEntries()
      .then((nextEntries) => {
        if (isCurrent) {
          setEntries(nextEntries);
          setError(null);
        }
      })
      .catch(() => {
        if (isCurrent) setError("Не удалось загрузить записи.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const save = async (entry: PlannerEntry) => {
    await saveEntry(entry);
    setEntries((current) => [
      ...current.filter((item) => item.id !== entry.id),
      entry,
    ]);
  };

  const remove = async (id: string) => {
    await deleteEntry(id);
    setEntries((current) => current.filter((item) => item.id !== id));
  };

  return { entries, isLoading, error, remove, save };
}
