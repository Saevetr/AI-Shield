const test = require("node:test");
const assert = require("node:assert/strict");

const {
    RISK_GROUPS,
    calculateRisk
} = require("../risk-scoring");

function makeFeatures(level = 0) {
    return Object.fromEntries(
        Object.entries(RISK_GROUPS).map(
            ([key, group]) => [
                key,
                Object.fromEntries(
                    Object.keys(group.weights).map(
                        feature => [feature, level]
                    )
                )
            ]
        )
    );
}

test("各組權重總和必須為100", () => {
    for (const group of Object.values(RISK_GROUPS)) {
        assert.equal(
            Object.values(group.weights)
                .reduce((a, b) => a + b, 0),
            100
        );
    }
});

test("無風險線索時全部為0分", () => {
    const result = calculateRisk(makeFeatures(0));

    assert.equal(result.overallScore, 0);
    assert.equal(result.riskLevel, "low");

    for (const signal of result.signals) {
        assert.equal(signal.score, 0);
    }
});

test("全部最高證據強度時為100分", () => {
    const result = calculateRisk(makeFeatures(4));

    assert.equal(result.overallScore, 100);
    assert.equal(result.riskLevel, "high");

    for (const signal of result.signals) {
        assert.equal(signal.score, 100);
    }
});

test("全部中等證據強度時為50分", () => {
    const result = calculateRisk(makeFeatures(2));

    assert.equal(result.overallScore, 50);
    assert.equal(result.riskLevel, "medium");
});

test("情緒勒索加權計算正確", () => {
    const features = makeFeatures();

    features.emotional.threat = 4;
    features.emotional.panic = 3;

    const result = calculateRisk(features);

    assert.equal(result.signals[0].score, 49);
    assert.equal(result.overallScore, 15);
});

test("單一強烈線索仍觸發高風險警告", () => {
    const features = makeFeatures();

    features.financial.transfer = 4;

    const result = calculateRisk(features);

    assert.equal(result.signals[2].score, 30);
    assert.equal(result.overallScore, 12);
    assert.equal(result.riskLevel, "high");
    assert.equal(result.strongEvidence, true);
});

test("三大指標必須獨立計算", () => {
    const features = makeFeatures();

    features.trust.urgency = 3;

    const result = calculateRisk(features);

    assert.equal(result.signals[0].score, 0);
    assert.equal(result.signals[1].score, 15);
    assert.equal(result.signals[2].score, 0);
});

test("拒絕超出範圍的證據強度", () => {
    const features = makeFeatures();

    features.emotional.threat = 5;

    assert.throws(() => calculateRisk(features));
});

test("拒絕負數證據強度", () => {
    const features = makeFeatures();

    features.financial.transfer = -1;

    assert.throws(() => calculateRisk(features));
});

test("拒絕缺少的風險特徵", () => {
    const features = makeFeatures();

    delete features.trust.urgency;

    assert.throws(() => calculateRisk(features));
});

test("拒絕缺少的風險分類", () => {
    const features = makeFeatures();

    delete features.financial;

    assert.throws(() => calculateRisk(features));
});

test("拒絕非數字證據強度", () => {
    const features = makeFeatures();

    features.emotional.threat = "4";

    assert.throws(() => calculateRisk(features));
});
