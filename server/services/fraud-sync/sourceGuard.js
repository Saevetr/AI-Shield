const BASELINE = Object.freeze({
  total: 104541,
  unique: 96780
});

const MIN_RETAIN_RATIO = 0.9;
const MAX_INVALID_RATIO = 0.01;

function validateSourceData(cleaned) {
  if (
    !cleaned ||
    !cleaned.stats ||
    !Array.isArray(cleaned.records)
  ) {
    throw new Error("政府資料格式錯誤");
  }

  const stats = cleaned.stats;

  const fields = [
    "total",
    "invalidDomain",
    "invalidMonth",
    "duplicates",
    "valid",
    "unique"
  ];

  for (const field of fields) {
    if (
      !Number.isSafeInteger(stats[field]) ||
      stats[field] < 0
    ) {
      throw new Error(
        `資料統計格式錯誤：${field}`
      );
    }
  }

  if (stats.total === 0 || stats.unique === 0) {
    throw new Error("政府資料異常為空");
  }

  const invalid =
    stats.invalidDomain +
    stats.invalidMonth;

  if (
    stats.total !== stats.valid + invalid ||
    stats.valid !== stats.unique + stats.duplicates ||
    stats.unique !== cleaned.records.length
  ) {
    throw new Error("政府資料統計不一致");
  }

  const minTotal = Math.ceil(
    BASELINE.total * MIN_RETAIN_RATIO
  );

  const minUnique = Math.ceil(
    BASELINE.unique * MIN_RETAIN_RATIO
  );

  if (stats.total < minTotal) {
    throw new Error("政府原始資料量異常下降");
  }

  if (stats.unique < minUnique) {
    throw new Error("政府有效網域數量異常下降");
  }

  const invalidRatio = invalid / stats.total;

  if (invalidRatio > MAX_INVALID_RATIO) {
    throw new Error("政府無效資料比例過高");
  }

  return {
    passed: true,
    total: stats.total,
    unique: stats.unique,
    invalid,
    invalidRatio,
    minTotal,
    minUnique
  };
}

module.exports = {
  BASELINE,
  MIN_RETAIN_RATIO,
  MAX_INVALID_RATIO,
  validateSourceData
};
