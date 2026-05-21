import { Redirect, useLocalSearchParams } from "expo-router";

import { DEFAULT_LANGUAGE_ID } from "../../data/languages";
import { DEFAULT_VOLUME_ID } from "../../data/volumes";

export default function LegacyReaderRedirect() {
  const params = useLocalSearchParams<{ page?: string }>();
  const page = params.page ?? "1";

  return <Redirect href={`/reader/${DEFAULT_LANGUAGE_ID}/${DEFAULT_VOLUME_ID}/${page}` as any} />;
}
