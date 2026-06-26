export type GarminConnectionStatus = {
  connected: boolean;
  lastSyncAt?: string;
  mockMode: boolean;
  aiUseAllowed: boolean;
};
