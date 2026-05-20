import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { DEFAULT_VOLUME_ID, getVolumeById } from "../data/volumes";
import type { ReadingPlan } from "../data/types";

type ActivePlanData = {
  planId: string;
  startedAt: string;
  completedDays: number[];
};

export function useReadingPlan(volumeId: string = DEFAULT_VOLUME_ID) {
  const [activePlanData, setActivePlanData] = useState<ActivePlanData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = `shifa-shareef:active-plan-${volumeId}`;

  const loadActivePlan = async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ActivePlanData;
        setActivePlanData(parsed);
      }
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    void loadActivePlan();
  }, [storageKey]);

  const activePlan: ReadingPlan | null = activePlanData
    ? getVolumeById(volumeId).plans.find((plan) => plan.id === activePlanData.planId) ??
      null
    : null;

  const startPlan = async (planId: string) => {
    const newPlanData: ActivePlanData = {
      planId,
      startedAt: new Date().toISOString(),
      completedDays: [],
    };
    setActivePlanData(newPlanData);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newPlanData));
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
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const clearPlan = async () => {
    setActivePlanData(null);
    await AsyncStorage.removeItem(storageKey);
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
