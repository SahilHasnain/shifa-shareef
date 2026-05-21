import { Redirect, useLocalSearchParams } from "expo-router";

import { DEFAULT_LANGUAGE_ID } from "../../../data/languages";

export default function LegacyVolumeReaderRedirect() {
  const params = useLocalSearchParams<{ volumeId?: string; page?: string }>();
  const volumeId = params.volumeId ?? "volume1";
  const page = params.page ?? "1";

  return <Redirect href={`/reader/${DEFAULT_LANGUAGE_ID}/${volumeId}/${page}` as any} />;
}
