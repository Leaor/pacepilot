import type { GarminConnectionStatus } from "@/lib/garmin/garminTypes";

export function getMockGarminStatus(): GarminConnectionStatus {
  return {
    connected: false,
    mockMode: true,
    aiUseAllowed: false
  };
}
