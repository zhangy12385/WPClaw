// Fixed RelayStation URL
export const RELAY_STATION_URL = 'https://www.wangpai.one';

// Available model IDs
export const RELAY_STATION_MODELS = [
  'gpt-5.4',
] as const;

type RelayStationModel = (typeof RELAY_STATION_MODELS)[number];

interface RelayStationStepProps {
  onConfigured: (configured: boolean) => void;
  onApiKeyChange: (key: string) => void;
}

export function RelayStationStep({
  onConfigured,
  onApiKeyChange
}: RelayStationStepProps) {
  // This step is deprecated - AccountStep now handles relay station config
  return null;
}
