import { Asset } from "expo-asset";
import { useEffect, useState } from "react";

import { SHIFA_PDF_ASSET } from "../data/book";

let pdfUriPromise: Promise<string> | null = null;

async function loadPdfUri() {
  if (!pdfUriPromise) {
    pdfUriPromise = (async () => {
      const asset = Asset.fromModule(SHIFA_PDF_ASSET);
      await asset.downloadAsync();

      const assetUri = asset.localUri ?? asset.uri;
      if (!assetUri) {
        throw new Error("Unable to resolve bundled PDF asset URI.");
      }

      return assetUri;
    })();
  }

  return pdfUriPromise;
}

export function useBundledPdf() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadPdfUri()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setPdfUri(result);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the bundled PDF.";
        setError(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    pdfUri,
    error,
    isLoading,
  };
}
