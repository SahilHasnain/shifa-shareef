import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Pdf from "react-native-pdf";

import { BOOK_TITLE, SECTIONS, TOTAL_PAGES } from "../../data/book";
import { useBundledPdf } from "../../hooks/useBundledPdf";
import { useReadingProgress } from "../../hooks/useReadingProgress";

function clampPage(value: number) {
  return Math.min(Math.max(value, 1), TOTAL_PAGES);
}

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ page?: string }>();
  const page = clampPage(Number(params.page ?? 1) || 1);
  const { progress, saveProgress } = useReadingProgress();
  const { pdfUri, error, isLoading } = useBundledPdf();
  const currentSection =
    SECTIONS.find(
      (section) => page >= section.startPage && page <= section.endPage,
    ) ?? SECTIONS[0];

  useEffect(() => {
    if (progress?.lastPage !== page) {
      void saveProgress(page);
    }
  }, [page, progress?.lastPage, saveProgress]);

  const moveToPage = async (nextPage: number) => {
    const safePage = clampPage(nextPage);
    await saveProgress(safePage);
    router.replace(`/reader/${safePage}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECD9" }}>
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 10,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "#FBF7EE",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#173D31" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#173D31", fontSize: 13, fontWeight: "700" }}>
            {BOOK_TITLE}
          </Text>
          <Text style={{ color: "#55665D", fontSize: 15, fontWeight: "600" }}>
            {currentSection.title}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 18, paddingBottom: 18 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#FBF7EE",
            borderRadius: 28,
            padding: 22,
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 10 }}>
            <Text style={{ color: "#8A7A45", fontSize: 13, fontWeight: "700" }}>
              Page {page} of {TOTAL_PAGES}
            </Text>
            <Text style={{ color: "#173D31", fontSize: 26, fontWeight: "800" }}>
              Reading View
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              overflow: "hidden",
              borderRadius: 22,
              backgroundColor: "#EFE4C8",
              minHeight: 280,
            }}
          >
            {Platform.OS === "web" ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                  gap: 10,
                }}
              >
                <Text
                  style={{ color: "#173D31", fontSize: 17, fontWeight: "800" }}
                >
                  Native PDF reader is ready
                </Text>
                <Text
                  style={{
                    color: "#55665D",
                    fontSize: 14,
                    lineHeight: 21,
                    textAlign: "center",
                  }}
                >
                  This Phase 1.5 renderer targets Android and iOS. Web can be added
                  separately with a dedicated browser PDF view.
                </Text>
              </View>
            ) : isLoading ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <ActivityIndicator size="large" color="#173D31" />
                <Text style={{ color: "#55665D", fontSize: 14 }}>
                  Loading bundled PDF...
                </Text>
              </View>
            ) : error || !pdfUri ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                  gap: 10,
                }}
              >
                <Text
                  style={{ color: "#173D31", fontSize: 17, fontWeight: "800" }}
                >
                  PDF failed to load
                </Text>
                <Text
                  style={{
                    color: "#55665D",
                    fontSize: 14,
                    lineHeight: 21,
                    textAlign: "center",
                  }}
                >
                  {error ?? "Unknown PDF loading error."}
                </Text>
              </View>
            ) : (
              <Pdf
                source={{ uri: pdfUri, cache: true }}
                page={page}
                fitPolicy={0}
                enablePaging
                enableDoubleTapZoom
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                trustAllCerts={false}
                onPageChanged={(nextPage) => {
                  if (nextPage !== page) {
                    const safePage = clampPage(nextPage);
                    void saveProgress(safePage);
                    router.replace(`/reader/${safePage}`);
                  }
                }}
                onError={(pdfError) => {
                  console.log("PDF render error", pdfError);
                }}
                style={{ flex: 1, backgroundColor: "#EFE4C8" }}
              />
            )}
          </View>

          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "#E3D8B5",
              padding: 18,
              gap: 8,
              backgroundColor: "#F8F1DE",
            }}
          >
            <Text style={{ color: "#173D31", fontSize: 17, fontWeight: "800" }}>
              Current Section
            </Text>
            <Text style={{ color: "#31483E", fontSize: 15, lineHeight: 22 }}>
              {currentSection.description}
            </Text>
            <Text style={{ color: "#7B6E43", fontSize: 13, fontWeight: "700" }}>
              Estimated reading time: {currentSection.estimatedMinutes} minutes
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Pressable
                disabled={page <= 1}
                onPress={() => moveToPage(page - 1)}
                style={{
                  flex: 1,
                  opacity: page <= 1 ? 0.4 : 1,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "#D2C498",
                  paddingVertical: 14,
                  alignItems: "center",
                  marginRight: 8,
                }}
              >
                <Text style={{ color: "#173D31", fontWeight: "700" }}>Previous</Text>
              </Pressable>
              <Pressable
                disabled={page >= TOTAL_PAGES}
                onPress={() => moveToPage(page + 1)}
                style={{
                  flex: 1,
                  opacity: page >= TOTAL_PAGES ? 0.4 : 1,
                  borderRadius: 999,
                  backgroundColor: "#173D31",
                  paddingVertical: 14,
                  alignItems: "center",
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "#FFF9EA", fontWeight: "700" }}>Next</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => saveProgress(page)}
              style={{
                borderRadius: 999,
                backgroundColor: "#F0E1A7",
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#173D31", fontWeight: "800" }}>
                Save This Page
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
