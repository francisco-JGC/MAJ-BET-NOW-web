import { http } from '@/shared/api/http';

import type {
  FeatureFlag,
  SetFeatureFlagPayload,
} from '@/features/feature-flags/types';

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const { data } = await http.get<FeatureFlag[]>('/feature-flags');
  return data;
}

export async function setFeatureFlag(
  key: string,
  payload: SetFeatureFlagPayload,
): Promise<FeatureFlag> {
  const { data } = await http.patch<FeatureFlag>(
    `/feature-flags/${key}`,
    payload,
  );
  return data;
}
