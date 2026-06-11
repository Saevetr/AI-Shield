import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 未來要把警政署資料存進 Firestore 時，可以打開下面這行。
// 目前先註解，避免前端直接寫資料庫被 Firestore 安全規則擋住。
// import { syncKnowledgeArticlesToFirestore } from "@/utils/knowledgeSync";

const NPA_LIST_URL = "https://www.npa.gov.tw/ch/app/news/list?id=2139&module=news";
const NPA_BASE_URL = "https://www.npa.gov.tw";
const ARTICLES_PER_PAGE = 5;
const LATEST_ARTICLE_COUNT = 20;
const NPA_LIST_PAGE_COUNT = 8;
const MAX_ARTICLES_PER_CATEGORY = 50;

const categories = ["最新文章", "詐騙手法", "防詐技巧", "法規資訊"] as const;

type Category = (typeof categories)[number];

const categoryLabels: Record<Category, string> = {
  最新文章: "新聞",
  詐騙手法: "手法",
  防詐技巧: "技巧",
  法規資訊: "法規",
};

type Article = {
  accent: string;
  category: Category;
  content?: string;
  date: string;
  icon: keyof typeof Ionicons.glyphMap;
  id: string;
  scamType: string;
  source: string;
  summary: string;
  title: string;
  url: string;
};

type KnowledgeGuide = {
  commonTactics: string[];
  description: string;
  preventionSteps: string[];
  warningSigns: string[];
};

const curatedKnowledgeArticles: Article[] = [
  {
    accent: "#397bf2",
    category: "詐騙手法",
    content:
      "詐騙集團常假冒賣貨便客服，聲稱訂單異常、系統錯誤或需要重新驗證帳戶，誘導使用者點擊非官方連結。進入假頁面後，可能要求輸入帳號密碼、信用卡資料或簡訊驗證碼。遇到訂單問題時，應回到官方 App 或官方網站查詢，不要透過陌生連結處理。",
    date: "常見情報",
    icon: "headset-outline",
    id: "curated-ecpay-fake-service",
    scamType: "假客服",
    source: "防詐情報整理",
    summary: "賣貨便假客服會以訂單異常、重新驗證或退款為由，誘導點擊釣魚連結。",
    title: "賣貨便假客服詐騙",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#22c55e",
    category: "詐騙手法",
    content:
      "LINE 帳號冒用常見於好友帳號遭盜用後，詐騙者以急用錢、代收款、幫忙購買點數或加入投資群組等理由聯繫。遇到熟人突然要求轉帳或提供驗證碼，應改用電話、視訊或其他通訊方式確認本人，不要只相信聊天室內容。",
    date: "常見情報",
    icon: "chatbubble-ellipses-outline",
    id: "curated-line-account-abuse",
    scamType: "帳號冒用",
    source: "防詐情報整理",
    summary: "LINE 帳號冒用會假借好友或群組名義，要求轉帳、借帳戶或提供驗證碼。",
    title: "LINE 帳號冒用",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#22c55e",
    category: "詐騙手法",
    content:
      "假投資詐騙常以高報酬、穩賺不賠、名人推薦或內線消息吸引加入。初期可能讓使用者看到假獲利，後續再以出金手續費、稅金、保證金等理由要求追加付款。投資前應確認平台是否合法，不要把資金轉入私人帳戶或不明交易平台。",
    date: "常見情報",
    icon: "trending-up-outline",
    id: "curated-fake-investment",
    scamType: "假投資",
    source: "防詐情報整理",
    summary: "假投資會用高報酬與名人背書包裝，誘導匯款到不明平台或私人帳戶。",
    title: "假投資高報酬話術",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#ef4444",
    category: "詐騙手法",
    content:
      "電話詐騙常假冒檢警、法院、銀行或電信業者，聲稱帳戶涉案、身分遭冒用或欠費異常，要求被害人配合偵查、轉帳到安全帳戶或交出提款卡。真正機關不會用電話要求轉帳，也不會要求交付帳戶資料。",
    date: "常見情報",
    icon: "call-outline",
    id: "curated-phone-fake-agency",
    scamType: "電話詐騙",
    source: "防詐情報整理",
    summary: "電話詐騙會假冒檢警、銀行或公務機關，以涉案或欠費恐嚇誘導轉帳。",
    title: "電話假檢警詐騙手法",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#f97316",
    category: "詐騙手法",
    content:
      "釣魚簡訊會偽裝成物流、銀行、電信、罰單或會員通知，要求點擊短網址完成認證、補繳費用或更新資料。進入假網站後，可能竊取個資、帳號密碼、信用卡資料與簡訊驗證碼。",
    date: "常見情報",
    icon: "link-outline",
    id: "curated-phishing-sms",
    scamType: "釣魚簡訊",
    source: "防詐情報整理",
    summary: "釣魚簡訊會用假物流、假銀行或假帳單通知，誘導點擊連結輸入個資。",
    title: "釣魚簡訊詐騙手法",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#64748b",
    category: "詐騙手法",
    content:
      "人頭帳戶詐騙會以租借帳戶、代收款、求職薪轉或辦貸款為名，要求提供存摺、提款卡、網銀帳密或收取款項後轉出。帳戶若被用於詐騙金流，可能面臨警示帳戶、偵查或法律責任。",
    date: "常見情報",
    icon: "wallet-outline",
    id: "curated-mule-account",
    scamType: "人頭帳戶",
    source: "防詐情報整理",
    summary: "人頭帳戶詐騙會要求借帳戶、代收款或提供提款卡，可能讓自己捲入犯罪金流。",
    title: "人頭帳戶詐騙手法",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "遇到 LINE 好友突然借錢、要求代收款或提供驗證碼，先不要回覆關鍵資料。請改用電話、視訊或其他通訊方式確認本人，並截圖保存對話。若確認帳號遭冒用，可提醒共同好友並通報平台。",
    date: "應對技巧",
    icon: "chatbubble-ellipses-outline",
    id: "curated-tip-line",
    scamType: "LINE 應對",
    source: "防詐情報整理",
    summary: "LINE 可疑訊息先用其他方式確認本人，不轉帳、不代收款、不給驗證碼。",
    title: "遇到 LINE 詐騙怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "接到自稱檢警、銀行、客服或公務機關電話時，不要在通話中操作轉帳，也不要依照對方指示下載 App 或加入 LINE。先掛斷，自己查官方電話回撥，或撥打 165 查證。",
    date: "應對技巧",
    icon: "call-outline",
    id: "curated-tip-phone",
    scamType: "電話應對",
    source: "防詐情報整理",
    summary: "可疑電話先掛斷、自己查官方電話、撥 165，不在通話中轉帳或提供資料。",
    title: "遇到電話詐騙怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "收到簡訊或私訊連結時，先檢查網址是否為官方網域，不要用訊息中的連結登入帳號或輸入信用卡。若是包裹、銀行、電信或繳費通知，請手動開啟官方 App 或官方網站查詢。",
    date: "應對技巧",
    icon: "shield-checkmark-outline",
    id: "curated-tip-link",
    scamType: "連結應對",
    source: "防詐情報整理",
    summary: "遇到連結先查官方網址，改從官方 App 或網站登入，不在陌生頁面輸入資料。",
    title: "遇到釣魚連結怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "看到高報酬投資、名人推薦、保證獲利或內線群組時，不要急著匯款。先查公司與平台是否合法，確認是否為金管會核准機構，並避免將資金匯入私人帳戶或來路不明的平台。",
    date: "應對技巧",
    icon: "analytics-outline",
    id: "curated-tip-investment",
    scamType: "投資應對",
    source: "防詐情報整理",
    summary: "高報酬投資先查合法性，不信保證獲利，不匯款到私人帳戶。",
    title: "遇到假投資話術怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "遇到自稱賣貨便、物流、銀行或平台客服聯繫時，不要從對方傳來的連結登入，也不要依指示操作 ATM 或網銀。請回到官方 App、官方網站或平台內客服查詢訂單狀態，任何要求提供驗證碼、信用卡或帳密的流程都應停止。",
    date: "應對技巧",
    icon: "headset-outline",
    id: "curated-tip-fake-service",
    scamType: "假客服應對",
    source: "防詐情報整理",
    summary: "假客服訊息先回官方平台查證，不點連結、不操作 ATM、不提供驗證碼。",
    title: "遇到賣貨便或假客服怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "遇到檢警、法院或公務機關來電聲稱帳戶涉案時，先掛斷電話，自己查官方電話或撥打 165、110 查證。真正的公務機關不會要求監管帳戶、線上做筆錄、交出提款卡，也不會要求保密不能告訴家人。",
    date: "應對技巧",
    icon: "business-outline",
    id: "curated-tip-fake-agency",
    scamType: "假檢警應對",
    source: "防詐情報整理",
    summary: "假檢警或假機關來電先掛斷查證，不轉帳、不交帳戶、不接受監管帳戶話術。",
    title: "遇到假檢警詐騙怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "遇到求職、貸款或朋友要求借帳戶、收款後轉出、提供提款卡或網銀帳密時，應立即拒絕。帳戶若被用於詐騙金流，可能變成警示帳戶並涉及偵查；若已交出資料，請立刻聯絡銀行停用並向警方報案。",
    date: "應對技巧",
    icon: "wallet-outline",
    id: "curated-tip-mule-account",
    scamType: "帳戶應對",
    source: "防詐情報整理",
    summary: "帳戶、提款卡、網銀帳密不能借人；若已交付，要立刻聯絡銀行與警方。",
    title: "遇到借帳戶或人頭帳戶要求怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "網購遇到價格明顯低於行情、要求離開平台私下匯款、只用通訊軟體聯繫或拒絕平台保障機制時，要先停止交易。建議使用平台內建付款與客服，查看賣家評價、出貨紀錄與商品資訊，不要為了折扣改用陌生連結或私人帳戶付款。",
    date: "應對技巧",
    icon: "cart-outline",
    id: "curated-tip-online-shopping",
    scamType: "網購應對",
    source: "防詐情報整理",
    summary: "網購可疑時留在平台內交易，不私下匯款，不點賣家外部連結。",
    title: "遇到網購詐騙怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "交友或感情關係中，若對方很快談到投資、急用錢、包裹卡關、醫療費或要求借帳戶，請先停下來查證。不要因為關係壓力匯款或提供個資，必要時請信任的親友一起看對話內容，也可撥打 165 諮詢。",
    date: "應對技巧",
    icon: "heart-outline",
    id: "curated-tip-romance",
    scamType: "交友應對",
    source: "防詐情報整理",
    summary: "交友對象提到匯款、投資或借帳戶時先停下來，請親友一起查證。",
    title: "遇到交友詐騙怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#397bf2",
    category: "防詐技巧",
    content:
      "遇到快速核貸、免審核、低利率或代辦貸款廣告時，先確認是否為合法金融機構。貸款前要求先繳保證金、手續費、解凍金，或要求寄送提款卡、存摺與網銀資料，都應視為高風險訊號。",
    date: "應對技巧",
    icon: "cash-outline",
    id: "curated-tip-fake-loan",
    scamType: "貸款應對",
    source: "防詐情報整理",
    summary: "貸款前先查合法機構，不先繳費、不交提款卡、不提供網銀資料。",
    title: "遇到假貸款詐騙怎麼辦",
    url: "https://165.npa.gov.tw/",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "刑法第 339 條規定，以詐術使人交付財物，或取得財產上不法利益者，可能成立詐欺罪；未遂犯也處罰。此條是一般詐欺案件常見的基本法條。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-criminal-339",
    scamType: "刑法第339條",
    source: "全國法規資料庫",
    summary: "一般詐欺罪基礎條文：以詐術使人交付財物或取得不法利益，未遂也處罰。",
    title: "刑法第339條：詐欺罪",
    url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=339",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "刑法第 339-4 條是加重詐欺罪，包含冒用政府機關或公務員名義、三人以上共同犯之、透過網際網路等傳播工具對公眾散布、以科技方法製作不實影像聲音等情形。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-criminal-339-4",
    scamType: "刑法第339-4條",
    source: "全國法規資料庫",
    summary: "加重詐欺罪包含假冒公務機關、三人以上共犯、網路散布與科技偽造等情形。",
    title: "刑法第339-4條：加重詐欺罪",
    url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=339-4",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "洗錢防制法與犯罪所得金流處理有關，若協助收受、持有、轉移或掩飾不明款項來源，可能產生法律風險。借帳戶、代收款或轉移不明款項都應避免。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-aml",
    scamType: "洗錢防制法",
    source: "全國法規資料庫",
    summary: "詐騙金流可能牽涉洗錢風險，切勿借帳戶、賣帳戶或代收不明款項。",
    title: "洗錢防制法：詐欺金流與人頭帳戶",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0380131",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "詐欺犯罪危害防制條例是反詐專法，重點包含金融、電信、網路廣告平台、第三方支付、電商等防詐措施，以及被害人保護與詐欺犯罪處理機制。此類規範適合放在防詐情報站作為整體反詐制度說明。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-fraud-prevention-act",
    scamType: "反詐專法",
    source: "全國法規資料庫",
    summary: "反詐專法整理金融、電信、網路平台、支付與電商等防詐義務和被害人保護方向。",
    title: "詐欺犯罪危害防制條例：反詐專法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0080226",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "組織犯罪防制條例與詐騙集團、多人分工、招募成員等情境相關。詐騙案件若涉及三人以上、持續性或牟利性的有結構性組織，可能會和組織犯罪規範一起被討論。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-organized-crime",
    scamType: "組織犯罪",
    source: "全國法規資料庫",
    summary: "詐騙集團若具有多人分工、持續性或牟利性，可能涉及組織犯罪防制條例。",
    title: "組織犯罪防制條例：詐騙集團與分工",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=C0000013",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "個人資料保護法規範個人資料的蒐集、處理與利用。釣魚網站、假客服或假投資平台常要求姓名、電話、身分證字號、金融資料或驗證資訊，若涉及不當取得或利用個資，就和個資保護風險有關。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-personal-data",
    scamType: "個資保護",
    source: "全國法規資料庫",
    summary: "釣魚網站或假平台蒐集姓名、電話、身分證字號與金融資料時，會牽涉個資保護風險。",
    title: "個人資料保護法：釣魚網站與個資外洩",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "刑法第 210 條與偽造、變造私文書有關，第 216 條則處理行使偽造或變造文書。假檢警、假公文、假投資證明或假平台文件等情境，除了詐欺外，也可能牽涉偽造文書或行使偽造文書問題。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-forgery",
    scamType: "偽造文書",
    source: "全國法規資料庫",
    summary: "假公文、假證明、假投資文件等詐騙素材，可能牽涉刑法偽造文書與行使偽造文書。",
    title: "刑法第210、216條：假公文與偽造文書",
    url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=216",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "刑法第 358 條與無故輸入他人帳號密碼、破解保護措施或利用漏洞入侵電腦相關；第 359 條則與無故取得、刪除或變更他人電磁紀錄相關。盜用帳號、盜 LINE 或竄改資料時，可能和這類電腦犯罪規範有關。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-computer-crime",
    scamType: "盜帳號",
    source: "全國法規資料庫",
    summary: "盜用帳號、入侵系統或變更他人電磁紀錄，可能牽涉刑法電腦犯罪規範。",
    title: "刑法第358、359條：盜帳號與電腦犯罪",
    url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=358",
  },
  {
    accent: "#845ef7",
    category: "法規資訊",
    content:
      "刑法第 30 條整理幫助犯概念。借帳戶、提供提款卡、代收款或協助轉出款項，若被用於詐騙金流，除了可能涉及洗錢風險，也可能被討論是否幫助他人犯罪。",
    date: "法規整理",
    icon: "document-text-outline",
    id: "curated-law-aiding",
    scamType: "幫助犯",
    source: "全國法規資料庫",
    summary: "借帳戶、交提款卡或代收款若協助詐騙金流，可能被討論是否涉及幫助犯。",
    title: "刑法第30條：幫助犯與借帳戶風險",
    url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=30",
  },
];

const fallbackArticles: Article[] = [
  ...curatedKnowledgeArticles,
  {
    accent: "#5c92f5",
    category: "最新文章",
    date: "114-06-17",
    icon: "business-outline",
    id: "fallback-agency",
    scamType: "假冒公務機關",
    source: "內政部警政署",
    summary: "假冒公務機關來電常以身分遭冒用、帳戶涉案等話術製造恐慌。",
    title: "假冒公務機關詐騙案件升溫，刑事局呼籲民眾謹記「防詐三要」",
    url: "https://www.npa.gov.tw/ch/app/news/view?id=2139&module=news&serno=f896f821-337e-43c8-b652-25d553f7da38",
  },
  {
    accent: "#ff9f43",
    category: "最新文章",
    date: "113-12-01",
    icon: "link-outline",
    id: "fallback-phishing",
    scamType: "釣魚連結",
    source: "內政部警政署",
    summary: "釣魚簡訊與電子郵件會誘導民眾點擊短網址，進一步竊取個資或信用卡資訊。",
    title: "刑事局攜手 NCC 共同防制釣魚簡訊，阻斷詐騙來源",
    url: "https://www.npa.gov.tw/ch/app/news/view?id=2139&module=news&serno=f0a71d25-073b-48c8-959a-02117a240e25",
  },
];

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const stripTags = (value: string) =>
  decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

const toAbsoluteUrl = (href: string) => {
  const normalizedHref = decodeHtml(href);

  if (normalizedHref.startsWith("http")) {
    return normalizedHref;
  }

  return `${NPA_BASE_URL}${normalizedHref.startsWith("/") ? "" : "/"}${normalizedHref}`;
};

const getNpaListUrl = (page: number) => {
  if (page === 1) {
    return NPA_LIST_URL;
  }

  return `${NPA_LIST_URL}&page=${page}`;
};

const getArticleVisual = (category: Category) => {
  if (category === "詐騙手法") {
    return { accent: "#ff6b6b", icon: "alert-circle-outline" as const };
  }

  if (category === "防詐技巧") {
    return { accent: "#397bf2", icon: "shield-checkmark-outline" as const };
  }

  if (category === "法規資訊") {
    return { accent: "#845ef7", icon: "document-text-outline" as const };
  }

  return { accent: "#5c92f5", icon: "newspaper-outline" as const };
};

const classifyArticle = (title: string, summary = ""): Category => {
  const text = `${title} ${summary}`;

  if (/法規|條例|刑法|洗錢防制法|法令|修法|修正|草案|命令|規定|辦法|要點|法律責任/.test(text)) {
    return "法規資訊";
  }

  if (/詐騙|詐欺|假冒|假客服|假投資|投資|客服|ATM|LINE|網購|賣貨便|報稅|自然人憑證|釣魚|簡訊|人頭帳戶|帳戶|洗錢|匯款|轉帳|公務機關|檢警|法院|地檢署|交友|解除分期|實名認證|高報酬|名人|保證獲利/.test(text)) {
    return "詐騙手法";
  }

  if (/防詐|反詐|宣導|提醒|三要|查證|165|110|不要|切勿|提高警覺|小心|避免|保護|保存|呼籲|示警|千萬|別信|勿點|冷靜|守則|攻略|懶人包|小撇步|教你|如何/.test(text)) {
    return "防詐技巧";
  }

  return "最新文章";
};

const isArticleInCategory = (article: Article, category: Category) => {
  return article.category === category;
};

const classifyScamType = (title: string, summary = "") => {
  const text = `${title} ${summary}`;

  if (/假檢警|檢警|法院|地檢署|公務機關|監管帳戶|偵查不公開|視訊筆錄/.test(text)) {
    return "假冒公務機關";
  }

  if (/投資|股票|虛擬|幣|獲利|理財|出金|高報酬|交易平台/.test(text)) {
    return "假投資";
  }

  if (/客服|ATM|分期|解除|賣貨便|實名認證|報稅|自然人憑證/.test(text)) {
    return "假客服";
  }

  if (/釣魚|簡訊|連結|短網址|網址|Email|電子郵件|個資|信用卡/.test(text)) {
    return "釣魚連結";
  }

  if (/網購|賣家|訂單|包裹|商城|拍賣|購物|商品|低價/.test(text)) {
    return "網購詐騙";
  }

  if (/LINE|群組|通訊軟體|好友|帳號|社群/.test(text)) {
    return "社群帳號";
  }

  if (/貸款|借款|融資|代辦/.test(text)) {
    return "假貸款";
  }

  if (/中獎|抽獎|獎品|保證金|稅金/.test(text)) {
    return "假中獎";
  }

  return "一般防詐";
};

const extractTitle = (rawText: string) => {
  const titleWithoutMeta = rawText
    .replace(/更新日期：\S+\s*/g, "")
    .replace(/分類：.*?發布單位：.*?\s*/g, "")
    .trim();

  return titleWithoutMeta.replace(/^\s*.*?\d+[.．、]\s*/, "").trim();
};

const buildArticleSummary = (title: string, scamType: string, category: Category) => {
  const text = title.replace(/[「」"“”]/g, "").trim();
  const topic = text.length > 26 ? `${text.slice(0, 26)}...` : text;

  if (/賣貨便|實名認證|客服|解除分期|ATM/.test(text)) {
    return `${topic}，留意假客服用認證、分期或金流問題誘導操作。`;
  }

  if (/報稅|自然人憑證|內政部|憑證/.test(text)) {
    return `${topic}，確認報稅或憑證更新資訊是否來自官方管道。`;
  }

  if (/投資|股票|虛擬|幣|獲利|高報酬|名人|保證/.test(text)) {
    return `${topic}，看到高報酬、名人背書或保證獲利都要先查證。`;
  }

  if (/LINE|群組|好友|帳號|社群|交友|男友|女友/.test(text)) {
    return `${topic}，留意社群邀請、感情話術、轉帳或借帳戶要求。`;
  }

  if (/人頭帳戶|帳戶|洗錢|提款卡|存摺/.test(text)) {
    return `${topic}，帳戶、提款卡、驗證碼都不能交給他人使用。`;
  }

  if (/釣魚|簡訊|連結|短網址|網址|Email|電子郵件/.test(text)) {
    return `${topic}，點擊連結前先確認來源，避免個資與卡號外流。`;
  }

  if (/網購|購物|賣家|訂單|包裹|低價|商品/.test(text)) {
    return `${topic}，低價商品、私下匯款或可疑客服都要再次查證。`;
  }

  if (/檢警|法院|地檢署|公務機關|監管帳戶|偵查/.test(text)) {
    return `${topic}，公務機關不會要求監管帳戶或線上交付金錢。`;
  }

  if (/貸款|借款|融資|代辦/.test(text)) {
    return `${topic}，先繳保證金、手續費或提供帳戶都可能是陷阱。`;
  }

  if (/中獎|抽獎|獎品|保證金|稅金/.test(text)) {
    return `${topic}，要求先付稅金、保證金或提供帳戶資料都要拒絕。`;
  }

  if (category === "法規資訊") {
    return `${topic}，整理相關規範與處理資訊。`;
  }

  if (category === "防詐技巧") {
    return `${topic}，整理${scamType}的防範提醒與查證方向。`;
  }

  return `${topic}，整理${scamType}相關案例與注意事項。`;
};

const isFraudRelatedArticle = (article: Article) => {
  const text = article.scamType === "一般防詐"
    ? article.title
    : `${article.title} ${article.summary} ${article.scamType}`;
  const unrelatedKeywords = /透明晶質獎|推廣講習|績優|表揚|頒獎|活動成果|徵才|招募志工|交通安全|治安會報/;
  const coreFraudKeywords =
    /詐騙|詐欺|詐團|反詐|防詐|165|車手|人頭帳戶|洗錢|假檢警|假冒|釣魚|盜用|冒用|解除分期|監管帳戶|高報酬|保證獲利|投資詐騙|網購詐騙|交友詐騙|貸款詐騙|假客服|假投資|假貸款|假中獎/;
  const scamMethodKeywords =
    /LINE|客服|ATM|賣貨便|報稅|自然人憑證|簡訊|短網址|信用卡|個資|匯款|轉帳|帳戶|提款卡|存摺|網購|包裹|投資|股票|虛擬貨幣|交易平台|群組|貸款|借款|中獎|交友|檢警|法院|地檢署|公務機關/;

  if (unrelatedKeywords.test(article.title)) {
    return false;
  }

  return coreFraudKeywords.test(text) || (article.scamType !== "一般防詐" && scamMethodKeywords.test(text));
};

const parseArticleList = (html: string): Article[] => {
  const matches = [...html.matchAll(/<a[^>]+href="([^"]*\/ch\/app\/news\/view[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const seenUrls = new Set<string>();

  return matches
    .map((match, index) => {
      const url = toAbsoluteUrl(match[1]);
      const rawText = stripTags(match[2]);
      const date = rawText.match(/更新日期：([\d-]+)/)?.[1] ?? "最新";
      const title = extractTitle(rawText);
      const category = classifyArticle(title, rawText);
      const scamType = classifyScamType(title, rawText);
      const visual = getArticleVisual(category);
      const summary = buildArticleSummary(title, scamType, category);

      return {
        ...visual,
        category,
        date,
        id: `${date}-${index}-${title}`,
        scamType,
        source: "內政部警政署",
        summary,
        title,
        url,
      };
    })
    .filter((article) => {
      if (!article.title || seenUrls.has(article.url) || !isFraudRelatedArticle(article)) {
        return false;
      }

      seenUrls.add(article.url);
      return true;
    });
};

const toLatestArticle = (article: Article): Article => ({
  ...article,
  accent: "#5c92f5",
  category: "最新文章",
  icon: "newspaper-outline",
});

const parseArticleDetail = (html: string, article: Article) => {
  const text = stripTags(html.replace(/<head[\s\S]*?<\/head>/gi, ""));
  const titlePattern = article.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const articleStartMatch = text.match(
    new RegExp(`發布單位：[^\\s]+(?:\\s+[^\\s]+)*?\\s+${titlePattern}`)
  );
  const titleIndex = articleStartMatch
    ? text.indexOf(article.title, articleStartMatch.index)
    : text.lastIndexOf(article.title);
  const slicedText = titleIndex >= 0
    ? text.slice(titleIndex + article.title.length)
    : text.replace(/[\s\S]*發布單位：[^ ]+\s*/, "");
  const endMarkers = [
    "Image: 無預覽圖",
    "相關圖片：",
    "關閉視窗",
    "回上一頁",
    "瀏覽人次：",
    "展開/收合",
    "警政署",
    "內政部警政署版權所有",
  ];
  const endIndex = endMarkers
    .map((marker) => slicedText.indexOf(marker))
    .filter((index) => index > 0)
    .sort((a, b) => a - b)[0];
  const body = (endIndex ? slicedText.slice(0, endIndex) : slicedText)
    .replace(/Image: 無預覽圖/g, "")
    .replace(/更新日期：\S+/g, "")
    .replace(/分類：.*?發布單位：.*?\s*/g, "")
    .replace(/發布單位：\S+/g, "")
    .replace(/記者會現場/g, "")
    .replace(/關閉視窗/g, "")
    .replace(/相關圖片：[\s\S]*/g, "")
    .replace(/回上一頁[\s\S]*/g, "")
    .replace(/瀏覽人次：[\s\S]*/g, "")
    .replace(/^[-\s｜|:：]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  return body || article.summary;
};

const splitArticleParagraphs = (content: string) => {
  const cleanedContent = content
    .replace(/更新日期：\S+/g, "")
    .replace(/分類：.*?發布單位：.*?\s*/g, "")
    .replace(/發布單位：\S+/g, "")
    .replace(/相關圖片：[\s\S]*/g, "")
    .replace(/Image: 無預覽圖/g, "")
    .replace(/關閉視窗/g, "")
    .replace(/回上一頁[\s\S]*/g, "")
    .replace(/瀏覽人次：[\s\S]*/g, "")
    .replace(/內政部警政署版權所有[\s\S]*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = cleanedContent
    .replace(/([。！？])\s*/g, "$1\n")
    .split("\n")
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];

  sentences.forEach((sentence) => {
    const previousParagraph = paragraphs[paragraphs.length - 1];

    if (previousParagraph && previousParagraph.length < 80) {
      paragraphs[paragraphs.length - 1] = `${previousParagraph}${sentence}`;
      return;
    }

    paragraphs.push(sentence);
  });

  return paragraphs.length > 0 ? paragraphs : [content];
};

const getKnowledgeGuide = (article: Article, content = ""): KnowledgeGuide => {
  const text = `${article.title} ${article.summary} ${content}`;

  if (article.category === "防詐技巧" && /LINE|帳號/.test(text)) {
    return {
      description: "遇到 LINE 可疑訊息時，先確認對方是不是真本人，再決定要不要回覆或處理。",
      commonTactics: ["改用電話或視訊確認本人", "截圖保存對話內容", "提醒共同好友並通報可疑帳號"],
      warningSigns: ["突然要求借錢或轉帳", "要求代收款或借帳戶", "要求提供驗證碼或加入陌生群組"],
      preventionSteps: ["不要只相信聊天室文字", "不要提供驗證碼、帳密或金融資料", "確認遭冒用時立即封鎖並通報平台"],
    };
  }

  if (article.category === "防詐技巧" && /賣貨便|假客服|客服|解除分期|ATM|實名認證/.test(text)) {
    return {
      description: "遇到自稱客服要求處理訂單、金流或認證時，先回到官方平台查詢，不要照對方連結操作。",
      commonTactics: ["回官方 App 或網站查訂單", "使用平台內建客服確認", "截圖保存對方訊息與連結"],
      warningSigns: ["要求點連結重新認證", "要求操作 ATM 或網銀", "要求提供卡號、帳密或驗證碼"],
      preventionSteps: ["不要點陌生客服連結", "不要在通話中操作付款流程", "已輸入資料時立即聯絡銀行與平台客服"],
    };
  }

  if (article.category === "防詐技巧" && /假檢警|檢警|法院|地檢署|公務機關|監管帳戶/.test(text)) {
    return {
      description: "遇到假檢警或假機關來電時，最有效的方法是掛斷後自行查證，不在通話中配合轉帳或交資料。",
      commonTactics: ["先掛斷電話", "自行查官方電話回撥", "撥打 165 或 110 查證"],
      warningSigns: ["聲稱帳戶涉案", "要求監管帳戶或保密", "要求線上筆錄、交提款卡或現金"],
      preventionSteps: ["公務機關不會用電話要求轉帳", "不要交出帳戶、存摺或提款卡", "保存號碼、對話與假公文"],
    };
  }

  if (article.category === "防詐技巧" && /電話|檢警|銀行|客服|公務機關/.test(text)) {
    return {
      description: "接到可疑電話時，最重要的是停止通話中的操作，改用官方管道回查。",
      commonTactics: ["先掛斷電話，不照指示操作", "自行查官方電話再回撥", "撥打 165 或 110 查證"],
      warningSigns: ["要求轉帳到安全帳戶", "要求下載 App 或加入 LINE", "要求保密不能告訴家人"],
      preventionSteps: ["通話中不操作網銀或 ATM", "不交出提款卡、存摺或帳戶資料", "保留號碼、錄音或通話紀錄方便報案"],
    };
  }

  if (article.category === "防詐技巧" && /連結|釣魚|簡訊|網址|信用卡/.test(text)) {
    return {
      description: "遇到簡訊、私訊或 Email 連結時，先確認網域和來源，不要急著登入或輸入資料。",
      commonTactics: ["手動開啟官方 App 或網站", "檢查網址是否為官方網域", "截圖保存可疑訊息"],
      warningSigns: ["短網址或拼字相似的假網址", "要求輸入卡號、驗證碼或帳密", "用包裹、帳單、罰款製造急迫感"],
      preventionSteps: ["不要從陌生連結登入帳號", "不要在可疑頁面輸入信用卡資料", "已輸入資料時立刻聯絡銀行並更改密碼"],
    };
  }

  if (article.category === "防詐技巧" && /投資|高報酬|獲利|平台|金管會/.test(text)) {
    return {
      description: "看到高報酬投資或名人推薦時，先查合法性與金流去向，不要被獲利截圖催促匯款。",
      commonTactics: ["查詢平台與公司是否合法", "確認是否為主管機關核准機構", "避免資金匯入私人帳戶"],
      warningSigns: ["保證獲利或穩賺不賠", "出金前要求繳稅金、保證金", "只透過群組或通訊軟體指導操作"],
      preventionSteps: ["不信保證獲利話術", "不下載來路不明交易 App", "投資前先請家人或專業人士一起查證"],
    };
  }

  if (article.category === "防詐技巧" && /人頭帳戶|借帳戶|帳戶|提款卡|存摺|代收款|網銀/.test(text)) {
    return {
      description: "任何借帳戶、收款再轉出或要求提供提款卡的要求，都可能讓帳戶捲入詐騙金流。",
      commonTactics: ["立即拒絕借帳戶", "不要代收或轉出不明款項", "已交出資料時立刻聯絡銀行"],
      warningSigns: ["高薪收購或租借帳戶", "求職要求提款卡或網銀", "款項來源不明卻要求快速轉出"],
      preventionSteps: ["不借帳戶、不賣帳戶", "不提供存摺、提款卡與網銀密碼", "帳戶異常時立刻報案並停用"],
    };
  }

  if (article.category === "防詐技巧" && /網購|賣家|訂單|包裹|商城|拍賣|購物|低價/.test(text)) {
    return {
      description: "網購遇到低價、私下匯款或外部連結時，先回到平台內確認，避免離開平台保障。",
      commonTactics: ["留在平台內付款與溝通", "查看賣家評價與出貨紀錄", "保留商品頁、對話與付款證明"],
      warningSigns: ["價格明顯低於行情", "要求私下匯款或轉帳", "要求點外部連結或加私人帳號"],
      preventionSteps: ["不離開平台交易", "不為折扣改用私人帳戶付款", "可疑賣場先搜尋評價與通報紀錄"],
    };
  }

  if (article.category === "防詐技巧" && /交友|感情|男友|女友|戀愛|醫療費|包裹/.test(text)) {
    return {
      description: "交友對象若很快談到金錢、投資或借帳戶，請放慢節奏並請可信任的人一起查證。",
      commonTactics: ["請親友一起看對話", "要求視訊或多管道確認身分", "保留聊天與匯款紀錄"],
      warningSigns: ["很快建立親密關係", "要求匯款、投資或代收包裹", "拒絕見面或視訊卻持續要錢"],
      preventionSteps: ["不因感情壓力匯款", "不提供帳戶與個資", "遇到金錢要求先撥 165 諮詢"],
    };
  }

  if (article.category === "防詐技巧" && /貸款|借款|融資|代辦|核貸/.test(text)) {
    return {
      description: "貸款前應先確認機構是否合法，任何先繳費或交帳戶資料的要求都要提高警覺。",
      commonTactics: ["查詢是否為合法金融機構", "保留廣告與對話紀錄", "向官方客服或銀行查證"],
      warningSigns: ["未核貸先收保證金或手續費", "要求寄提款卡或存摺", "宣稱免審核、快速撥款且條件過好"],
      preventionSteps: ["不先繳任何名目費用", "不交付提款卡與網銀資料", "改向合法銀行或官方管道申辦"],
    };
  }

  if (article.category === "防詐技巧") {
    return {
      description: article.summary,
      commonTactics: ["先停下來，不照對方節奏操作", "改用官方管道或其他方式確認", "保存對話、電話與轉帳紀錄"],
      warningSigns: ["要求立刻轉帳", "要求提供驗證碼或帳密", "不讓你向親友或官方查證"],
      preventionSteps: splitArticleParagraphs(article.content ?? article.summary).slice(0, 3),
    };
  }

  if (article.id === "curated-law-criminal-339") {
    return {
      description: "刑法第 339 條是一般詐欺罪的基礎條文，重點在以詐術使人交付財物，或取得財產上不法利益。",
      commonTactics: ["以詐術使人交付財物", "取得財產上不法利益", "未遂犯也會處罰"],
      warningSigns: ["用不實資訊誘導付款", "讓被害人誤信而交付財物", "涉及不法所有意圖"],
      preventionSteps: ["保留對話與匯款紀錄", "撥打 165 或向警方報案", "實際責任仍由司法機關判斷"],
    };
  }

  if (article.id === "curated-law-criminal-339-4") {
    return {
      description: "刑法第 339-4 條整理加重詐欺情形，例如假冒政府機關、三人以上共犯、網路散布或科技偽造。",
      commonTactics: ["冒用政府機關或公務員名義", "三人以上共同詐欺", "透過網路或媒體對公眾散布"],
      warningSigns: ["假檢警或假公文", "多人分工聯繫", "網路廣告或群組大量散布"],
      preventionSteps: ["不要依指示轉帳或交付帳戶", "截圖保存假公文與對話", "撥打 165、110 或向派出所查證"],
    };
  }

  if (article.id === "curated-law-aml") {
    return {
      description: "洗錢防制法與犯罪所得金流處理有關，詐騙案件中常見風險是帳戶被拿來收款、轉帳或掩飾金流。",
      commonTactics: ["借帳戶或租帳戶", "代收款後再轉出", "提供提款卡、網銀帳密或驗證碼"],
      warningSigns: ["高薪收購帳戶", "求職要求提供帳戶資料", "款項來源不明卻要求代轉"],
      preventionSteps: ["不借帳戶、不賣帳戶", "拒絕代收不明款項", "帳戶異常應立即聯絡銀行與警方"],
    };
  }

  if (article.id === "curated-law-fraud-prevention-act") {
    return {
      description: "詐欺犯罪危害防制條例是整體反詐制度的核心法規，涵蓋防詐措施、跨機關合作、平台與業者義務及被害人保護。",
      commonTactics: ["金融、電信、網路平台防詐措施", "第三方支付與電商防詐義務", "詐欺犯罪被害人保護"],
      warningSigns: ["帳戶、門號或平台被濫用", "廣告或支付流程疑似詐騙", "被害款項需要即時通報與攔阻"],
      preventionSteps: ["遇詐騙先保存證據並報案", "向 165 或金融機構確認止付流程", "以官方公告與主管機關資訊為準"],
    };
  }

  if (article.id === "curated-law-organized-crime") {
    return {
      description: "組織犯罪防制條例可用來理解詐騙集團、多人分工、招募與資助犯罪組織等法律風險。",
      commonTactics: ["三人以上分工實施詐術", "招募車手或帳戶提供者", "資助或協助犯罪組織活動"],
      warningSigns: ["群組內有明確分工", "工作內容只負責收款、提款或轉帳", "要求加入不明團隊執行任務"],
      preventionSteps: ["拒絕加入不明高薪工作", "不擔任車手或提供帳戶", "發現招募犯罪訊息可截圖通報"],
    };
  }

  if (article.id === "curated-law-personal-data") {
    return {
      description: "個人資料保護法可用來理解釣魚網站、假客服與假平台蒐集或利用個資的風險。",
      commonTactics: ["蒐集姓名、電話與身分證字號", "要求上傳證件或金融資料", "利用個資再次冒名或詐騙"],
      warningSigns: ["表單要求過多敏感資料", "網址不是官方網域", "要求提供驗證碼、卡號或證件照片"],
      preventionSteps: ["只在官方管道填寫資料", "不在陌生頁面上傳證件", "個資外洩時盡快更改密碼並聯絡相關機構"],
    };
  }

  if (article.id === "curated-law-forgery") {
    return {
      description: "刑法第 210、216 條可用來理解假公文、假證明、假投資文件等偽造文書或行使偽造文書風險。",
      commonTactics: ["製作假公文或假證件", "傳送假投資證明或假合約", "用偽造文件取得信任"],
      warningSigns: ["文件格式粗糙或來源不明", "公文要求私下轉帳", "拒絕提供官方查證管道"],
      preventionSteps: ["用官方電話或網站查證文件", "保留文件截圖與傳送紀錄", "可疑公文不要依指示付款"],
    };
  }

  if (article.id === "curated-law-computer-crime") {
    return {
      description: "刑法第 358、359 條可用來理解盜帳號、入侵系統、取得或變更電磁紀錄等電腦犯罪風險。",
      commonTactics: ["輸入他人帳密登入", "利用漏洞入侵帳號或系統", "刪除、變更或取得他人資料"],
      warningSigns: ["LINE 或社群帳號突然被登入", "密碼重設通知不是本人操作", "資料或訊息被不明修改"],
      preventionSteps: ["立即更改密碼並啟用雙重驗證", "登出所有裝置並通報平台", "保留登入通知與異常紀錄"],
    };
  }

  if (article.id === "curated-law-aiding") {
    return {
      description: "刑法第 30 條可用來理解借帳戶、交提款卡、代收款等行為若協助犯罪，可能被討論幫助犯風險。",
      commonTactics: ["提供帳戶或提款卡", "代收詐騙款項後轉出", "協助提領或搬運現金"],
      warningSigns: ["高薪低工時但只處理金流", "要求保密或快速轉帳", "對方不說明款項來源"],
      preventionSteps: ["不借帳戶、不賣帳戶", "拒絕代收不明款項", "已交付帳戶時立即聯絡銀行與警方"],
    };
  }

  if (/客服|ATM|分期|解除|賣貨便|實名認證|報稅|自然人憑證/.test(text)) {
    return {
      description: "詐騙者常假冒客服或官方通知，要求重新認證、解除分期或操作金流流程。",
      commonTactics: ["聲稱訂單或帳戶異常", "要求點擊連結完成認證", "引導操作 ATM 或輸入信用卡資料"],
      warningSigns: ["非官方管道聯繫", "要求提供驗證碼", "催促立即處理避免損失"],
      preventionSteps: ["回到官方 App 或網站查詢", "不要點陌生連結", "不提供帳號、卡號與簡訊驗證碼"],
    };
  }

  if (/投資|股票|虛擬|幣|獲利|理財|出金|高報酬|交易平台|名人|保證/.test(text)) {
    return {
      description: "假投資會用高報酬與成功案例吸引加入，後續再以出金、稅金或保證金騙取金錢。",
      commonTactics: ["強調穩賺不賠或保證獲利", "冒用名人或專家背書", "要求轉入不明平台或私人帳戶"],
      warningSigns: ["報酬異常高", "出金前要求再繳費", "只透過通訊軟體指導操作"],
      preventionSteps: ["查證平台是否合法", "不要相信保證獲利", "投資前先向金管會或官方管道確認"],
    };
  }

  if (/LINE|群組|通訊軟體|好友|帳號|社群|交友|男友|女友/.test(text)) {
    return {
      description: "社群與通訊軟體詐騙常透過好友、感情或群組信任感，誘導轉帳、投資或交出帳號。",
      commonTactics: ["假冒好友或客服帳號", "邀請加入投資或福利群組", "以感情關係要求金錢協助"],
      warningSigns: ["突然更換帳號聯繫", "要求借帳戶或代收款", "不願視訊或用官方方式確認身分"],
      preventionSteps: ["用其他管道確認本人", "不要代收轉帳", "可疑帳號先封鎖並通報"],
    };
  }

  if (/釣魚|簡訊|連結|短網址|網址|Email|電子郵件|個資|信用卡/.test(text)) {
    return {
      description: "釣魚連結會偽裝成官方通知、物流或帳務訊息，誘導輸入個資、帳密或信用卡資料。",
      commonTactics: ["傳送短網址或假官方頁面", "要求登入帳號重新驗證", "以包裹、帳單或活動名義誘導點擊"],
      warningSigns: ["網址拼字可疑", "要求輸入卡號或驗證碼", "訊息語氣急迫或帶有威脅"],
      preventionSteps: ["手動輸入官方網址", "不在陌生頁面輸入個資", "收到可疑簡訊可撥 165 查證"],
    };
  }

  if (/網購|賣家|訂單|包裹|商城|拍賣|購物|商品|低價/.test(text)) {
    return {
      description: "網購詐騙常利用低價商品、假賣家或假客服，誘導私下匯款或轉往不明交易流程。",
      commonTactics: ["用低價商品吸引下單", "要求離開平台私下交易", "假冒客服處理訂單問題"],
      warningSigns: ["價格明顯低於行情", "只接受匯款或轉帳", "賣場評價與資料不足"],
      preventionSteps: ["使用平台內建付款與客服", "確認賣家評價", "不要私下匯款或點外部連結"],
    };
  }

  if (/檢警|法院|地檢署|公務機關|監管帳戶|偵查|洗錢|帳戶涉案/.test(text)) {
    return {
      description: "假冒公務機關會製造涉案恐慌，要求配合偵查、監管帳戶或交付金錢。",
      commonTactics: ["聲稱身分遭冒用或帳戶涉案", "出示假公文或假證件", "要求轉帳到監管帳戶"],
      warningSigns: ["要求保密不能告訴家人", "用視訊或通訊軟體辦案", "要求交出存摺、提款卡或現金"],
      preventionSteps: ["掛斷後撥打 165 或 110 查證", "公務機關不會監管帳戶", "保留通話與訊息紀錄"],
    };
  }

  if (/貸款|借款|融資|代辦/.test(text)) {
    return {
      description: "假貸款詐騙會以快速核貸、免審核吸引民眾，再要求先付費或提供帳戶。",
      commonTactics: ["宣稱快速撥款或免信用審核", "要求先繳保證金、手續費", "要求提供帳戶作金流包裝"],
      warningSigns: ["未核貸先收費", "要求寄送提款卡", "貸款條件好得不合理"],
      preventionSteps: ["找合法金融機構辦理", "不交付帳戶或提款卡", "任何先付款要求都要查證"],
    };
  }

  if (article.category === "法規資訊") {
    return {
      description: "整理防詐相關規範、公告或處理原則，協助理解權責與通報方向。",
      commonTactics: ["掌握公告重點", "理解規範適用範圍", "確認與詐欺防制相關的處理流程"],
      warningSigns: ["資訊來源不明", "引用法規卻要求轉帳", "假冒官方公告誘導填資料"],
      preventionSteps: ["以官方網站公告為準", "遇疑問可撥 165 查證", "保留資料並循正式管道處理"],
    };
  }

  return {
    description: "整理常見詐騙案例與防範重點，協助快速辨識可疑話術。",
    commonTactics: ["假冒可信任單位", "製造急迫感", "要求轉帳或提供個資"],
    warningSigns: ["來源不明", "要求保密", "要求提供帳號、密碼或驗證碼"],
    preventionSteps: ["先查證再行動", "不要點陌生連結", "必要時撥打 165 諮詢"],
  };
};

const getGuideSectionLabels = (category: Category) => {
  if (category === "法規資訊") {
    return {
      common: "條文重點",
      prevention: "處理建議",
      warning: "注意情境",
    };
  }

  if (category === "防詐技巧") {
    return {
      common: "應對步驟",
      prevention: "實際做法",
      warning: "警覺訊號",
    };
  }

  return {
    common: "常見話術",
    prevention: "防範方法",
    warning: "危險訊號",
  };
};

const getArticleCardTitle = (article: Article) => {
  return article.category === "最新文章" ? article.title : article.scamType;
};

const scamMethodTagRules = [
  { label: "假檢警", pattern: /假檢警|檢警|法院|地檢署|公務機關|監管帳戶|偵查不公開|視訊筆錄/ },
  { label: "假投資", pattern: /投資|股票|虛擬貨幣|虛擬|幣|獲利|理財|出金|高報酬|交易平台|名人|保證獲利/ },
  { label: "假客服", pattern: /客服|ATM|分期|解除|賣貨便|實名認證|報稅|自然人憑證/ },
  { label: "釣魚連結", pattern: /釣魚|簡訊|連結|短網址|網址|Email|電子郵件|個資|信用卡/ },
  { label: "網購詐騙", pattern: /網購|賣家|訂單|包裹|商城|拍賣|購物|商品|低價/ },
  { label: "LINE 詐騙", pattern: /LINE|群組|通訊軟體|好友|帳號|社群/ },
  { label: "假貸款", pattern: /貸款|借款|融資|代辦|核貸/ },
  { label: "假中獎", pattern: /中獎|抽獎|獎品|保證金|稅金/ },
  { label: "交友詐騙", pattern: /交友|感情|男友|女友|戀愛/ },
  { label: "人頭帳戶", pattern: /人頭帳戶|借帳戶|帳戶|提款卡|存摺|代收款|洗錢|車手/ },
];

const getArticleMethodTags = (article: Article) => {
  if (article.category !== "最新文章") {
    return [article.scamType, article.category];
  }

  const text = `${article.title} ${article.summary} ${article.scamType}`;
  const methodTags = scamMethodTagRules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => rule.label);

  if (methodTags.length > 0) {
    return methodTags.slice(0, 3);
  }

  return [article.scamType === "一般防詐" ? "詐騙新聞" : article.scamType];
};

const parseArticleDate = (dateText: string) => {
  const match = dateText.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) {
    return null;
  }

  const rawYear = Number(match[1]);
  const year = rawYear < 1911 ? rawYear + 1911 : rawYear;
  const month = Number(match[2]);
  const day = Number(match[3]);

  return new Date(year, month - 1, day);
};

const shouldShowNewsBadge = (article: Article) => {
  if (article.category !== "最新文章") {
    return false;
  }

  const articleDate = parseArticleDate(article.date);

  if (!articleDate) {
    return false;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfArticleDate = new Date(
    articleDate.getFullYear(),
    articleDate.getMonth(),
    articleDate.getDate()
  );
  const diffDays = (startOfToday.getTime() - startOfArticleDate.getTime()) / 86400000;

  return diffDays >= 0 && diffDays <= 3;
};

export default function KnowledgeScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>("最新文章");
  const [articles, setArticles] = useState<Article[]>(fallbackArticles);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadArticles = async () => {
    setIsLoading(true);

    try {
      const listUrls = Array.from({ length: NPA_LIST_PAGE_COUNT }, (_, index) => getNpaListUrl(index + 1));
      const listResponses = await Promise.allSettled(
        listUrls.map(async (url) => {
          const response = await fetch(url);

          if (!response.ok) {
            return "";
          }

          return response.text();
        })
      );
      const seenKeys = new Set<string>();
      const latestArticles = listResponses
        .flatMap((result, index) => {
          if (result.status !== "fulfilled") {
            return [];
          }

          return parseArticleList(result.value);
        })
        .map(toLatestArticle)
        .slice(0, LATEST_ARTICLE_COUNT);
      const parsedArticles = [...curatedKnowledgeArticles, ...latestArticles]
        .filter((article) => {
          const articleKey = article.id.startsWith("curated-") ? article.id : article.url || article.id;

          if (seenKeys.has(articleKey)) {
            return false;
          }

          seenKeys.add(articleKey);
          return true;
        });

      if (parsedArticles.length > 0) {
        setArticles(parsedArticles);

        // 未來要同步到資料庫時，打開上方 import 後再打開這行。
        // 若這行卡住，多半是 Firestore rules 不允許前端寫入；
        // 正式做法建議移到 Cloud Functions 或後端定時同步。
        // await syncKnowledgeArticlesToFirestore(parsedArticles);
      }
    } catch {
      setArticles(fallbackArticles);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArticles();
  }, []);

  const activeArticles = useMemo(() => {
    return articles
      .filter((article) => isArticleInCategory(article, activeCategory))
      .slice(0, MAX_ARTICLES_PER_CATEGORY);
  }, [activeCategory, articles]);

  const totalPages = Math.max(1, Math.ceil(activeArticles.length / ARTICLES_PER_PAGE));
  const pagedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    return activeArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
  }, [activeArticles, currentPage]);
  const selectedArticleContent = selectedArticle?.content ?? selectedArticle?.summary ?? "";
  const selectedArticleParagraphs = useMemo(
    () => splitArticleParagraphs(selectedArticleContent),
    [selectedArticleContent]
  );
  const selectedKnowledgeGuide = useMemo(
    () => selectedArticle ? getKnowledgeGuide(selectedArticle, selectedArticleContent) : null,
    [selectedArticle, selectedArticleContent]
  );
  const selectedGuideLabels = selectedArticle ? getGuideSectionLabels(selectedArticle.category) : null;

  const openArticle = async (article: Article) => {
    setSelectedArticle(article);

    if (article.content) {
      return;
    }

    setIsDetailLoading(true);

    try {
      const response = await fetch(article.url);
      const html = await response.text();
      const content = parseArticleDetail(html, article);
      const nextArticle = { ...article, content };

      setSelectedArticle(nextArticle);
      setArticles((currentArticles) =>
        currentArticles.map((currentArticle) =>
          currentArticle.id === article.id ? nextArticle : currentArticle
        )
      );
    } catch {
      setSelectedArticle({ ...article, content: article.summary });
    } finally {
      setIsDetailLoading(false);
    }
  };

  if (selectedArticle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedArticle(null)}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>防詐情報站</Text>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => void Linking.openURL(selectedArticle.url)}
            activeOpacity={0.75}
          >
            <Ionicons name="open-outline" size={22} color="#397bf2" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.articleHeroCard}>
            <View style={styles.articleHeroTop}>
              <View style={[styles.detailIcon, { backgroundColor: `${selectedArticle.accent}1f` }]}>
                <Ionicons name={selectedArticle.icon} size={28} color={selectedArticle.accent} />
              </View>
                <View style={styles.articleMetaPillGroup}>
                  {selectedArticle.category !== "最新文章" && (
                    <View style={[styles.categoryPill, { backgroundColor: `${selectedArticle.accent}1f` }]}>
                      <Text style={[styles.categoryPillText, { color: selectedArticle.accent }]}>
                        {selectedArticle.category}
                      </Text>
                    </View>
                  )}
                  <View style={styles.scamTypePill}>
                    <Text style={styles.scamTypePillText}>{selectedArticle.scamType}</Text>
                  </View>
                <Text style={styles.sourceText}>內政部警政署</Text>
              </View>
            </View>

            <Text style={styles.detailTitle}>{selectedArticle.title}</Text>
            <Text style={styles.detailSummary}>{selectedKnowledgeGuide?.description}</Text>

            <View style={styles.detailMetaRow}>
              <View style={styles.detailMetaItem}>
                <Ionicons name="calendar-outline" size={15} color="#8aa4c5" />
                <Text style={styles.detailMeta}>{selectedArticle.date}</Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#8aa4c5" />
                <Text style={styles.detailMeta}>官方資料</Text>
              </View>
            </View>
          </View>

          {!!selectedKnowledgeGuide && (
            <View style={styles.knowledgeGuideCard}>
              <Text style={styles.bodySectionTitle}>防詐整理</Text>

              <View style={styles.guideSection}>
                <View style={styles.guideTitleRow}>
                  <Ionicons name="chatbubbles-outline" size={18} color="#397bf2" />
                  <Text style={styles.guideTitle}>{selectedGuideLabels?.common}</Text>
                </View>
                {selectedKnowledgeGuide.commonTactics.map((item) => (
                  <Text key={item} style={styles.guideBullet}>• {item}</Text>
                ))}
              </View>

              <View style={styles.guideSection}>
                <View style={styles.guideTitleRow}>
                  <Ionicons name="warning-outline" size={18} color="#ff9f43" />
                  <Text style={styles.guideTitle}>{selectedGuideLabels?.warning}</Text>
                </View>
                <View style={styles.warningTagWrap}>
                  {selectedKnowledgeGuide.warningSigns.map((item) => (
                    <View key={item} style={styles.warningTag}>
                      <Text style={styles.warningTagText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.guideSectionLast}>
                <View style={styles.guideTitleRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#22c55e" />
                  <Text style={styles.guideTitle}>{selectedGuideLabels?.prevention}</Text>
                </View>
                {selectedKnowledgeGuide.preventionSteps.map((item) => (
                  <View key={item} style={styles.checkRow}>
                    <Ionicons name="checkmark-circle" size={17} color="#22c55e" />
                    <Text style={styles.checkText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.detailBodyCard}>
            {isDetailLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#397bf2" />
                <Text style={styles.loadingText}>正在載入警政署文章...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.bodySectionTitle}>官方資料摘錄</Text>
                {selectedArticleParagraphs.map((paragraph, index) => (
                  <View
                    key={`${paragraph}-${index}`}
                    style={[styles.paragraphBlock, index === 0 && styles.firstParagraphBlock]}
                  >
                    <Text style={styles.detailBodyText}>{paragraph}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.officialButton}
            onPress={() => void Linking.openURL(selectedArticle.url)}
            activeOpacity={0.82}
          >
            <Text style={styles.officialButtonText}>查看警政署原文</Text>
            <Ionicons name="open-outline" size={18} color="#ffffff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const primaryArticle = pagedArticles[0];
  const primaryGuide = primaryArticle ? getKnowledgeGuide(primaryArticle) : null;
  const primaryGuideLabels = primaryArticle ? getGuideSectionLabels(primaryArticle.category) : null;
  const secondaryArticles = pagedArticles.slice(1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={36} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>防詐情報站</Text>
        <TouchableOpacity style={styles.headerIconButton} onPress={loadArticles} activeOpacity={0.75}>
          {isLoading ? (
            <ActivityIndicator color="#397bf2" size="small" />
          ) : (
            <Ionicons name="refresh" size={22} color="#397bf2" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.categoryGrid}>
        {categories.map((category) => {
          const isActive = category === activeCategory;

          return (
            <TouchableOpacity
              key={category}
              style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
              onPress={() => {
                setActiveCategory(category);
                setCurrentPage(1);
              }}
              activeOpacity={0.82}
            >
              <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                {categoryLabels[category]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {primaryArticle && primaryGuide ? (
          <>
            <TouchableOpacity
              style={styles.mainKnowledgeCard}
              onPress={() => void openArticle(primaryArticle)}
              activeOpacity={0.86}
            >
              <View style={styles.mainCardTop}>
                <View style={[styles.mainIconCircle, { backgroundColor: `${primaryArticle.accent}18` }]}>
                  <Ionicons name={primaryArticle.icon} size={34} color={primaryArticle.accent} />
                </View>
                <View style={styles.mainTitleWrap}>
                  <Text style={styles.mainKnowledgeTitle}>{getArticleCardTitle(primaryArticle)}</Text>
                  <View style={styles.tagWrap}>
                    {shouldShowNewsBadge(primaryArticle) && (
                      <Text style={styles.newsTag}>NEW!</Text>
                    )}
                    {getArticleMethodTags(primaryArticle).map((tag) => (
                      <Text key={tag} style={styles.blueTag}>{tag}</Text>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.mainDescription}>{primaryGuide.description}</Text>

              <View style={styles.knowledgeSection}>
                <View style={styles.sectionIconCircle}>
                  <Ionicons name="chatbubble-ellipses" size={17} color="#397bf2" />
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.knowledgeSectionTitle}>{primaryGuideLabels?.common}</Text>
                  {primaryGuide.commonTactics.map((item) => (
                    <Text key={item} style={styles.tacticBullet}>• {item}</Text>
                  ))}
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.knowledgeSection}>
                <View style={[styles.sectionIconCircle, styles.warningIconCircle]}>
                  <Ionicons name="warning" size={17} color="#ef4444" />
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.knowledgeSectionTitle}>{primaryGuideLabels?.warning}</Text>
                  <View style={styles.dangerTagWrap}>
                    {primaryGuide.warningSigns.map((item) => (
                      <Text key={item} style={styles.dangerTag}>{item}</Text>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.knowledgeSection}>
                <View style={styles.sectionIconCircle}>
                  <Ionicons name="shield-checkmark" size={17} color="#397bf2" />
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.knowledgeSectionTitle}>{primaryGuideLabels?.prevention}</Text>
                  {primaryGuide.preventionSteps.map((item) => (
                    <View key={item} style={styles.safeStepRow}>
                      <Ionicons name="checkmark-circle" size={18} color="#397bf2" />
                      <Text style={styles.safeStepText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.infoStrip}>
                <Ionicons name="information-circle" size={20} color="#397bf2" />
                <Text style={styles.infoStripText}>如有疑慮，請先查證或撥打 165 反詐騙專線</Text>
              </View>
            </TouchableOpacity>

            {secondaryArticles.length > 0 && (
              <View style={styles.moreHeader}>
                <Text style={styles.moreTitle}>更多防詐情報</Text>
                <Text style={styles.moreCount}>{activeArticles.length} 筆資料</Text>
              </View>
            )}

            <View style={styles.compactCardList}>
              {secondaryArticles.map((article) => (
                <TouchableOpacity
                  key={article.id}
                  style={styles.compactCard}
                  onPress={() => void openArticle(article)}
                  activeOpacity={0.84}
                >
                  <View style={[styles.compactIconCircle, { backgroundColor: `${article.accent}18` }]}>
                  <Ionicons name={article.icon} size={25} color={article.accent} />
                  </View>
                  <View style={styles.compactContent}>
                    <Text style={styles.compactTitle} numberOfLines={1}>{getArticleCardTitle(article)}</Text>
                    <View style={styles.compactTagRow}>
                      {shouldShowNewsBadge(article) && (
                        <Text style={styles.newsTagSmall}>NEW!</Text>
                      )}
                      {getArticleMethodTags(article).map((tag) => (
                        <Text key={tag} style={styles.blueTagSmall}>{tag}</Text>
                      ))}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={28} color="#6b7280" />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.paginationBar}>
              <TouchableOpacity
                style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                activeOpacity={0.78}
              >
                <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? "#b8c5d8" : "#397bf2"} />
                <Text style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}>
                  上一頁
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                {currentPage} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                activeOpacity={0.78}
              >
                <Text style={[styles.pageButtonText, currentPage === totalPages && styles.pageButtonTextDisabled]}>
                  下一頁
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={currentPage === totalPages ? "#b8c5d8" : "#397bf2"}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={38} color="#b8c5d8" />
            <Text style={styles.emptyTitle}>這個分類目前沒有資料</Text>
            <Text style={styles.emptyText}>可以切換其他分類，或按右上角重新抓取資料。</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    height: 66,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  headerIconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    backgroundColor: "#f3f9ff",
  },
  scrollContent: {
    paddingBottom: 70,
    paddingTop: 10,
  },
  knowledgeHero: {
    minHeight: 150,
    backgroundColor: "#f3f9ff",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 18,
    paddingHorizontal: 68,
    overflow: "hidden",
  },
  heroBackButton: {
    position: "absolute",
    left: 10,
    top: 34,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  heroRefreshButton: {
    position: "absolute",
    right: 14,
    top: 40,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  heroTitle: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#647083",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  patternDotLarge: {
    position: "absolute",
    right: 44,
    top: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d5e8ff",
  },
  patternDotSmall: {
    position: "absolute",
    right: 88,
    top: 62,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d5e8ff",
  },
  patternHex: {
    position: "absolute",
    width: 52,
    height: 52,
    borderWidth: 2,
    borderColor: "#dcecff",
    transform: [{ rotate: "30deg" }],
  },
  patternHexTop: {
    right: 16,
    top: 48,
  },
  patternHexBottom: {
    right: 98,
    top: 32,
    opacity: 0.75,
  },
  categoryGrid: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#f3f9ff",
    borderBottomColor: "#e7eef8",
    borderBottomWidth: 1,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  categoryButton: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9bb6d9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: "#1677f2",
    shadowColor: "#1677f2",
    shadowOpacity: 0.28,
  },
  categoryText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  categoryTextActive: {
    color: "#ffffff",
  },
  mainKnowledgeCard: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
    marginHorizontal: 4,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: "#9bb6d9",
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
  },
  mainCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mainIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  mainTitleWrap: {
    flex: 1,
  },
  mainKnowledgeTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 7,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  blueTag: {
    color: "#1664c8",
    fontSize: 13,
    fontWeight: "900",
    backgroundColor: "#e6f1ff",
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  newsTag: {
    color: "#e11d48",
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: "#ffe4e6",
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mainDescription: {
    color: "#5b6678",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginBottom: 10,
  },
  knowledgeSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
  },
  sectionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eaf2ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  warningIconCircle: {
    backgroundColor: "#fff0f0",
  },
  sectionContent: {
    flex: 1,
  },
  knowledgeSectionTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 7,
  },
  tacticBullet: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 22,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#dce4ee",
  },
  dangerTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  dangerTag: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "900",
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  safeStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 7,
  },
  safeStepText: {
    flex: 1,
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  infoStrip: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#eaf2ff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 8,
  },
  infoStripText: {
    flex: 1,
    color: "#1664c8",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  compactCardList: {
    marginHorizontal: 4,
    marginTop: 10,
    gap: 8,
  },
  moreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 17,
    marginTop: 16,
    marginBottom: 8,
  },
  moreTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  moreCount: {
    color: "#8aa4c5",
    fontSize: 12,
    fontWeight: "800",
  },
  compactCard: {
    minHeight: 68,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    shadowColor: "#9bb6d9",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 3,
  },
  compactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  compactTagRow: {
    flexDirection: "row",
    gap: 8,
  },
  blueTagSmall: {
    color: "#1664c8",
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: "#e6f1ff",
    borderRadius: 9,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newsTagSmall: {
    color: "#e11d48",
    fontSize: 11,
    fontWeight: "900",
    backgroundColor: "#ffe4e6",
    borderRadius: 9,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  fixedTabBar: {
    flexGrow: 0,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  tabRow: {
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  tabButton: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7fb",
  },
  tabButtonActive: {
    backgroundColor: "#e8f1ff",
  },
  tabText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#397bf2",
  },
  featuredCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    marginHorizontal: 14,
    marginTop: 14,
    padding: 18,
    shadowColor: "#9bb6d9",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
  },
  featuredTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  featuredIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredMeta: {
    alignItems: "flex-end",
  },
  featuredTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  featuredTag: {
    color: "#397bf2",
    fontSize: 12,
    fontWeight: "800",
  },
  featuredScamTag: {
    color: "#607697",
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "#f1f5f9",
    borderRadius: 9,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  featuredTime: {
    color: "#8da0bb",
    fontSize: 12,
    fontWeight: "700",
  },
  featuredTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 28,
  },
  featuredDescription: {
    color: "#607697",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 8,
  },
  featuredFooter: {
    height: 38,
    borderRadius: 13,
    backgroundColor: "#f2f7ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    marginTop: 16,
  },
  featuredFooterText: {
    color: "#397bf2",
    fontSize: 13,
    fontWeight: "800",
  },
  quickCheckCard: {
    borderRadius: 20,
    backgroundColor: "#eaf2ff",
    marginHorizontal: 14,
    marginTop: 14,
    padding: 15,
  },
  quickCheckHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  quickCheckTitle: {
    color: "#1c4fba",
    fontSize: 14,
    fontWeight: "900",
  },
  quickCheckText: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeaderCompact: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionHint: {
    color: "#8da0bb",
    fontSize: 12,
    fontWeight: "800",
  },
  articleList: {
    marginHorizontal: 14,
    gap: 12,
  },
  paginationBar: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 4,
    marginTop: 12,
    paddingHorizontal: 10,
  },
  pageButton: {
    minWidth: 86,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#edf4ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 3,
  },
  pageButtonDisabled: {
    backgroundColor: "#f5f8fc",
  },
  pageButtonText: {
    color: "#397bf2",
    fontSize: 12,
    fontWeight: "900",
  },
  pageButtonTextDisabled: {
    color: "#b8c5d8",
  },
  pageIndicator: {
    color: "#607697",
    fontSize: 13,
    fontWeight: "900",
  },
  articleRow: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  articleTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  articleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  articleTextGroup: {
    flex: 1,
  },
  articleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  articleTagGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
  articleTag: {
    color: "#397bf2",
    fontSize: 11,
    fontWeight: "900",
  },
  articleScamTag: {
    color: "#607697",
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "#f1f5f9",
    borderRadius: 9,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  articleTime: {
    color: "#9aacc8",
    fontSize: 11,
    fontWeight: "800",
  },
  articleTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  articleDescription: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 10,
  },
  knowledgePreviewBlock: {
    borderRadius: 14,
    backgroundColor: "#f8fbff",
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 10,
    gap: 7,
  },
  knowledgePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  knowledgePreviewLabel: {
    width: 58,
    color: "#397bf2",
    fontSize: 11,
    fontWeight: "900",
  },
  knowledgePreviewText: {
    flex: 1,
    color: "#5e7190",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    minHeight: 190,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginHorizontal: 14,
  },
  emptyTitle: {
    color: "#5e7190",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#9aacc8",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
  detailContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 56,
  },
  articleHeroCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#9bb6d9",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  articleHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  articleMetaPillGroup: {
    alignItems: "flex-end",
    gap: 5,
  },
  categoryPill: {
    minHeight: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  scamTypePill: {
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  scamTypePillText: {
    color: "#607697",
    fontSize: 11,
    fontWeight: "900",
  },
  sourceText: {
    color: "#8aa4c5",
    fontSize: 11,
    fontWeight: "800",
  },
  detailTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 31,
  },
  detailSummary: {
    color: "#607697",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 10,
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  detailMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailMeta: {
    color: "#8aa4c5",
    fontSize: 12,
    fontWeight: "800",
  },
  detailBodyCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 16,
    minHeight: 260,
  },
  knowledgeGuideCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 16,
  },
  bodySectionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  guideSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7",
    paddingTop: 12,
    paddingBottom: 14,
  },
  guideSectionLast: {
    paddingTop: 12,
  },
  guideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 9,
  },
  guideTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  guideBullet: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 3,
  },
  warningTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  warningTag: {
    borderRadius: 12,
    backgroundColor: "#fff4e6",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  warningTagText: {
    color: "#c56a00",
    fontSize: 12,
    fontWeight: "900",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginBottom: 8,
  },
  checkText: {
    flex: 1,
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  paragraphBlock: {
    borderTopWidth: 1,
    borderTopColor: "#edf2f7",
    paddingTop: 14,
    marginTop: 12,
  },
  firstParagraphBlock: {
    borderTopWidth: 0,
    marginTop: 0,
    paddingTop: 0,
  },
  detailBodyText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 12,
  },
  officialButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#397bf2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  officialButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  loadingBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "700",
  },
});
