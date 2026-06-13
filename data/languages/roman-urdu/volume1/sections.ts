import type { Section } from "../../../types";

export const ROMAN_URDU_VOLUME1_TOTAL_PAGES = 306;

const ROMAN_URDU_VOLUME1_SECTION_DEFINITIONS = [
  {
    id: "front-matter-muqaddima",
    title: "Publisher Note, Musannif Aur Muqaddima",
    startPage: 1,
    endPage: 23,
    estimatedMinutes: 46,
    description:
      "Publisher's note, Musannif ke baare mein, Urdu tarjama karne waale, aur Muqaddima ka guided opening.",
  },
  {
    id: "pehli-qism-quran-sana",
    title: "Quran Mein Huzoor Ki Shaan-o-Azmat",
    startPage: 24,
    endPage: 56,
    estimatedMinutes: 66,
    description:
      "Aayato mein Huzoor alaihissalam ki shaan aur Quran mein Huzoor ki sana ka mutalea.",
  },
  {
    id: "khalqe-azeem-awsaaf",
    title: "Hulya, Akhlaaq Aur Awsaaf-e-Mubarak",
    startPage: 57,
    endPage: 97,
    estimatedMinutes: 82,
    description:
      "Huzoor alaihissalam ke hulya, nazafat, fahm, fasahat, karam, shuja'at, haya aur akhlaaq ka bayaan.",
  },
  {
    id: "qadr-manzilat-ahadees",
    title: "Meraj, Shafaat Aur Asma-e-Mubarak",
    startPage: 98,
    endPage: 117,
    estimatedMinutes: 40,
    description:
      "Huzoor ke zikr ki rif'at, Shab-e-Meraj, shafa'at, Kausar, asma-e-girami aur fazail.",
  },
  {
    id: "mojizaat-aijaz-e-quran",
    title: "Nubuwwat, Wahy Aur Aijaz-e-Quran",
    startPage: 118,
    endPage: 127,
    estimatedMinutes: 20,
    description:
      "Nubuwwat, Rasool aur wahy ki tehqeeq ke saath Quran ke aijaz ki bunyadi wujoohaat.",
  },
  {
    id: "mojizaat-hissi-ghaibi",
    title: "Mojizaat: Chand, Paani, Dua Aur Ghaib",
    startPage: 128,
    endPage: 152,
    estimatedMinutes: 50,
    description:
      "Chand phatna, paani ka mojiza, darakht, jamadaat, haiwanaat, ijabat-e-dua aur ghaibi khabrein.",
  },
  {
    id: "dusri-qism-itteba-sunnat",
    title: "Huqooq-e-Ummat Aur Itteba-e-Sunnat",
    startPage: 153,
    endPage: 160,
    estimatedMinutes: 16,
    description:
      "Ummat par Huzoor alaihissalam ke huqooq aur sunnat ki itteba ke wujoob ka pehla mabhas.",
  },
  {
    id: "muhabbat-khairkhwahi",
    title: "Muhabbat-e-Rasool Aur Uski Alamaat",
    startPage: 161,
    endPage: 171,
    estimatedMinutes: 22,
    description:
      "Huzoor se muhabbat, uski alamat, muhabbat ki haqeeqat aur khairkhwahi ke wujoob ka bayaan.",
  },
  {
    id: "tazeem-tauqeer-huqooq",
    title: "Tazeem-e-Rasool, Ahle Bait Aur Sahaba",
    startPage: 172,
    endPage: 183,
    estimatedMinutes: 24,
    description:
      "Sahaba ka adab, wafat ke baad tazeem, Ahle bait, Azwaaj, Sahaba aur maqamaat-e-mutabarraka ki hurmat.",
  },
  {
    id: "durood-salam-ziyarat",
    title: "Durood-o-Salam, Ziyarat Aur Masjid-e-Nabawi",
    startPage: 184,
    endPage: 196,
    estimatedMinutes: 26,
    description:
      "Durood shareef ki farziyat, mauqe, kaifyat, fazeelat, Qabre Anwar ki ziyarat aur Masjid-e-Nabawi ke aadab.",
  },
  {
    id: "teesri-qism-ismat-ambiya",
    title: "Ismat-e-Ambiya Aur Wahy Ke Masail",
    startPage: 197,
    endPage: 219,
    estimatedMinutes: 46,
    description:
      "Umoore deeniya, ismat-e-ambiya, wahy, aitrazaat ke jawabaat aur ismat-e-malaika ka mutalea.",
  },
  {
    id: "ahwale-bashariya",
    title: "Ahwale Bashariya, Jaadu Aur Dunyawi Umoor",
    startPage: 220,
    endPage: 244,
    estimatedMinutes: 50,
    description:
      "Ambiya par awa'arize bashariya, Huzoor ke dunyawi aqwaal-o-af'aal, jaadu, Qirtaas aur ibtela ki hikmat.",
  },
  {
    id: "chauthi-qism-tauheen-ahkam",
    title: "Tauheen-e-Rasool Aur Ahkam-e-Sharaiyya",
    startPage: 245,
    endPage: 251,
    estimatedMinutes: 14,
    description:
      "Huzoor ki tauheen, Gustakh-e-Rasool ke hukm aur tauheen paida karne wale alfaaz ka muqaddama.",
  },
  {
    id: "qatl-wajib-dalail",
    title: "Gustakhi Ke Alfaaz Aur Qatl Ke Dalail",
    startPage: 252,
    endPage: 274,
    estimatedMinutes: 46,
    description:
      "Dalail, munafiqeen ke qatl na karne ki hikmat, anjane mein tauheen, mushtabe aqwaal aur taqreer ki tambeehaat.",
  },
  {
    id: "uqubat-tauba-zimmi",
    title: "Gustakh Ki Uqubat, Tauba Aur Zimmi",
    startPage: 275,
    endPage: 283,
    estimatedMinutes: 18,
    description:
      "Gustakh ki uqubat, muddat wa kaifyat-e-tauba, shahadat ke masail, zimmi aur meeraas ke ahkam.",
  },
  {
    id: "shaane-ilahi-takfeer",
    title: "Shaane Ilahi, Takfeer Aur Kufr Ke Masail",
    startPage: 284,
    endPage: 291,
    estimatedMinutes: 16,
    description:
      "Shaane ilahi ke khilaf kalimaat, taaweel karne walon ki takfeer, kufr ke maqoole aur muftari ke ahkam.",
  },
  {
    id: "kalima-kufr-tauheen",
    title: "Quran, Ambiya, Ahle Bait Aur Sahaba Ki Hurmat",
    startPage: 292,
    endPage: 306,
    estimatedMinutes: 30,
    description:
      "Be ikhteyar kalima-e-kufr, Ambiya, farishton, Quran, Ahle bait, Azwaaj aur Sahaba ki tauheen ke ahkam.",
  },
] as const satisfies ReadonlyArray<
  Pick<
    Section,
    | "id"
    | "title"
    | "startPage"
    | "endPage"
    | "estimatedMinutes"
    | "description"
  >
>;

export const ROMAN_URDU_VOLUME1_SECTIONS: Section[] =
  ROMAN_URDU_VOLUME1_SECTION_DEFINITIONS.map((section) => ({
    ...section,
    startProgressPercent:
      (section.startPage - 1) / ROMAN_URDU_VOLUME1_TOTAL_PAGES,
    endProgressPercent: section.endPage / ROMAN_URDU_VOLUME1_TOTAL_PAGES,
  }));
