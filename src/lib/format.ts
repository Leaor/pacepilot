export function formatPace(secondsPerKm?: number): string {
  if (!secondsPerKm) {
    return "--";
  }

  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}/km`;
}

export function formatKm(value?: number): string {
  if (typeof value !== "number") {
    return "--";
  }

  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} km`;
}
