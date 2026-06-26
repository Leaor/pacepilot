export type Shoe = {
  id: string;
  brand: string;
  model: string;
  nickname?: string;
  startingDistanceKm: number;
  retirementDistanceKm: number;
  retired: boolean;
};

export type ShoeMileageSummary = {
  currentDistanceKm: number;
  percentUsed: number;
  remainingKm: number;
  retirementWarning: boolean;
};

export function summarizeShoeMileage(shoe: Shoe, assignedActivityDistancesKm: number[]): ShoeMileageSummary {
  const currentDistanceKm = Math.round((shoe.startingDistanceKm + assignedActivityDistancesKm.reduce((sum, distance) => sum + distance, 0)) * 10) / 10;
  const percentUsed = Math.min(100, Math.round((currentDistanceKm / shoe.retirementDistanceKm) * 100));
  const remainingKm = Math.max(0, Math.round((shoe.retirementDistanceKm - currentDistanceKm) * 10) / 10);

  return {
    currentDistanceKm,
    percentUsed,
    remainingKm,
    retirementWarning: percentUsed >= 85 || remainingKm <= 80
  };
}
