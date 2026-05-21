import { useEffect, useState } from "react";

import type { ResolvedPageAsset } from "../data/types";
import { resolvePageAsset } from "../lib/page-asset-resolver";

type ResolvedPageAssetState = {
  asset: ResolvedPageAsset | null;
  isLoading: boolean;
};

export function useResolvedPageAsset(
  languageId: string,
  volumeId: string,
  page: number,
) {
  const [state, setState] = useState<ResolvedPageAssetState>({
    asset: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    setState((previousState) => ({
      asset:
        previousState.asset?.languageId === languageId &&
        previousState.asset?.volumeId === volumeId &&
        previousState.asset?.page === page
          ? previousState.asset
          : null,
      isLoading: true,
    }));

    void resolvePageAsset(languageId, volumeId, page, {
      cacheRemote: true,
    }).then((asset) => {
      if (cancelled) {
        return;
      }

      setState({
        asset,
        isLoading: false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [languageId, page, volumeId]);

  return state;
}
