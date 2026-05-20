import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { getPlanById, ReadingPlan } from "../data/plans";

const STORAGE_KEY = "shifa-shareef:active-plan";

type ActivePlanData = {
  planId: string;
  startedAt: string;
  completedDays: number[];
};

export function useReadingPlan() {
  const [activePlanData, setActivePlanData] = useState<ActivePlanData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadActivePlan = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ActivePlanData;
        setActivePlanData(parsed);
      }
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadActivePlan();
  }, []);

  const activePlan: ReadingPlan | null = activePlanData
    ? getPlanById(activePlanData.planId) ?? null
    : null;

  const startPlan = async (planId: string) => {
    const newPlanData: ActivePlanData = {
      planId,
      startedAt: new Date().toISOString(),
      completedDays: [],
    };
    setActivePlanData(newPlanData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPlanData));
  };

  const completePlanDay = async (day: number) => {
    if (!activePlanData) return;

    const updatedDays = [...activePlanData.completedDays];
    if (!updatedDays.includes(day)) {
      updatedDays.push(day);
      updatedDays.sort((a, b) => a - b);
    }

    const updated: ActivePlanData = {
      ...activePlanData,
      completedDays: updatedDays,
    };

    setActivePlanData(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearPlan = async () => {
    setActivePlanData(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const isDayCompleted = (day: number): boolean => {
    return activePlanData?.completedDays.includes(day) ?? false;
  };

  return {
    activePlan,
    activePlanData,
    isLoaded,
    startPlan,
    completePlanDay,
    clearPlan,
    isDayCompleted,
  };
}
