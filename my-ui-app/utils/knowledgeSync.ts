import { db } from "@/app/config/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

export type KnowledgeArticleForSync = {
  accent: string;
  category: string;
  content?: string;
  date: string;
  icon: string;
  id: string;
  scamType: string;
  source: string;
  summary: string;
  title: string;
  url: string;
};

const KNOWLEDGE_ARTICLES_COLLECTION = "knowledgeArticles";
const KNOWLEDGE_SYNC_META_COLLECTION = "knowledgeSyncMeta";
const FIRESTORE_BATCH_LIMIT = 450;

const createStableDocId = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
};

export const syncKnowledgeArticlesToFirestore = async (
  articles: KnowledgeArticleForSync[],
  sourceKey = "npa"
) => {
  for (let startIndex = 0; startIndex < articles.length; startIndex += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = articles.slice(startIndex, startIndex + FIRESTORE_BATCH_LIMIT);

    chunk.forEach((article) => {
      const articleRef = doc(
        collection(db, KNOWLEDGE_ARTICLES_COLLECTION),
        createStableDocId(article.url || article.id || article.title)
      );

      batch.set(
        articleRef,
        {
          accent: article.accent,
          category: article.category,
          content: article.content ?? null,
          date: article.date,
          icon: article.icon,
          originalId: article.id,
          scamType: article.scamType,
          source: article.source,
          summary: article.summary,
          title: article.title,
          updatedAt: serverTimestamp(),
          url: article.url,
        },
        { merge: true }
      );
    });

    await batch.commit();
  }

  const metaBatch = writeBatch(db);
  const metaRef = doc(collection(db, KNOWLEDGE_SYNC_META_COLLECTION), sourceKey);

  metaBatch.set(
    metaRef,
    {
      articleCount: articles.length,
      lastSyncedAt: serverTimestamp(),
      note: "目前為預留同步功能；正式上線建議改由後端或 Cloud Functions 定時寫入。",
      sourceKey,
    },
    { merge: true }
  );

  await metaBatch.commit();
};
