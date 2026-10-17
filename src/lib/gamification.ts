"use client";

import { createId, useLocalCollection } from "./local-data";

export type PointEntry = { id: string; amount: number; type: "earn" | "spend" | "adjustment"; sourceType: string; sourceId: string; description: string; createdAt: string };
export type Reward = { id: string; title: string; description: string; cost: number; active: boolean; createdAt: string };
export type Redemption = { id: string; rewardId: string; title: string; cost: number; redeemedAt: string };

export function useGamification() {
  const [entries, setEntries] = useLocalCollection<PointEntry>("foco-point-ledger", []);
  const [rewards, setRewards] = useLocalCollection<Reward>("foco-rewards", []);
  const [redemptions, setRedemptions] = useLocalCollection<Redemption>("foco-redemptions", []);
  const balance = entries.reduce((total, entry) => total + entry.amount, 0);
  const lifetimeEarned = entries.filter((entry) => entry.amount > 0).reduce((total, entry) => total + entry.amount, 0);

  function awardPoints(amount: number, sourceType: string, sourceId: string, description: string) {
    setEntries((current) => current.some((entry) => entry.sourceType === sourceType && entry.sourceId === sourceId) ? current : [{ id: createId("points"), amount, type: "earn", sourceType, sourceId, description, createdAt: new Date().toISOString() }, ...current]);
  }

  function purchaseReward(reward: Reward) {
    if (balance < reward.cost || !reward.active) return false;
    const redemption: Redemption = { id: createId("redemption"), rewardId: reward.id, title: reward.title, cost: reward.cost, redeemedAt: new Date().toISOString() };
    setRedemptions((current) => [redemption, ...current]);
    setEntries((current) => [{ id: createId("points"), amount: -reward.cost, type: "spend", sourceType: "reward_redemption", sourceId: redemption.id, description: `Compra: ${reward.title}`, createdAt: redemption.redeemedAt }, ...current]);
    return true;
  }

  return { entries, rewards, setRewards, redemptions, balance, lifetimeEarned, awardPoints, purchaseReward };
}
