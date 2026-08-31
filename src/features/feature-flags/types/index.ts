export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
}

export interface SetFeatureFlagPayload {
  enabled: boolean;
}
