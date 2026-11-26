const RISK_GROUPS = {
    emotional: {
        label: "情緒勒索",
        weights: {
            threat: 30,
            panic: 25,
            guilt: 15,
            sympathy: 15,
            emotionalControl: 15
        }
    },
    trust: {
        label: "信任施壓",
        weights: {
            impersonation: 25,
            authority: 20,
            falseTrust: 15,
            urgency: 20,
            preventVerification: 20
        }
    },
    financial: {
        label: "金錢要求",
        weights: {
            transfer: 30,
            deposit: 25,
            giftCardCrypto: 15,
            unknownFee: 15,
            unusualPayment: 15
        }
    }
};

const ALLOWED_LEVELS = [0, 1, 2, 3, 4];

function calculateRisk(features) {
    if (!features || typeof features !== "object") {
        throw new Error("Missing risk features");
    }

    const rawScores = {};

    const signals = Object.entries(RISK_GROUPS).map(
        ([groupKey, group]) => {
            const values = features[groupKey];

            if (!values || typeof values !== "object") {
                throw new Error(
                    "Missing risk group: " + groupKey
                );
            }

            let score = 0;

            for (const [key, weight] of
                Object.entries(group.weights)) {

                const level = values[key];

                if (!ALLOWED_LEVELS.includes(level)) {
                    throw new Error(
                        "Invalid risk level: " + key
                    );
                }

                score += weight * (level / 4);
            }

            rawScores[groupKey] = score;

            return {
                label: group.label,
                score: Math.round(score),
                strongEvidence: Object.keys(group.weights).some(
                    feature => values[feature] === 4
                )
            };
        }
    );

    const overallScore = Math.round(
        rawScores.emotional * 0.3 +
        rawScores.trust * 0.3 +
        rawScores.financial * 0.4
    );

    const highestScore = Math.max(
        ...Object.values(rawScores)
    );

    const strongEvidence = Object.values(
        RISK_GROUPS
    ).some((group, index) => {
        const key = Object.keys(RISK_GROUPS)[index];

        return Object.keys(group.weights).some(
            feature => features[key][feature] === 4
        );
    });

    let riskLevel = "low";

    if (overallScore >= 70 ||
        highestScore >= 70 ||
        strongEvidence) {
        riskLevel = "high";
    } else if (
        overallScore >= 40 ||
        highestScore >= 40
    ) {
        riskLevel = "medium";
    }

    return {
        signals,
        overallScore,
        riskLevel,
        strongEvidence
    };
}

module.exports = {
    RISK_GROUPS,
    calculateRisk
};
