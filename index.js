const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 주사위별 역할 정의
const diceRoles = {
    6:   { name: "일상 판정", desc: "일상적인 행동. 비교적 쉬운 도전.", weight: 1 },
    8:   { name: "전투 판정", desc: "전투나 기술적 행동. 적당한 난이도.", weight: 1.5 },
    12:  { name: "특수 판정", desc: "특수 능력이나 마법. 높은 난이도.", weight: 2 },
    20:  { name: "운명 판정", desc: "운명을 가르는 중요한 순간. 매우 높은 난이도.", weight: 3 },
    100: { name: "기적 판정", desc: "전설적인 행동. 극히 희귀한 도전.", weight: 5 }
};

// 직업별 특성
const classTraits = {
    "전사":   "강인한 체력과 근접전 특화. 방패와 검으로 적을 압도한다.",
    "마법사": "강력한 마법 공격. 체력은 약하지만 원거리에서 적을 섬멸한다.",
    "도적":   "빠른 기동력과 암습 특화. 함정 해제와 잠금 해제에 능숙하다.",
    "성직자": "신성한 치유 마법. 파티원을 지원하고 언데드에게 강하다.",
    "궁수":   "원거리 정밀 사격. 높은 곳에서 적을 저격하고 덫을 설치한다.",
    "음유시인":"음악으로 파티원을 강화. 적을 매혹하고 정보 수집에 능하다."
};

app.post('/gm', async (req, res) => {
    const { situation, players, history, diceResult } = req.body;

    if (!situation) {
        return res.status(400).json({ error: '상황 정보가 없습니다' });
    }

    try {
        console.log("요청:", situation);

        // 플레이어 정보
        let playerInfo = "";
        if (players) {
            for (const [name, cls] of Object.entries(players)) {
                const trait = classTraits[cls] || "알 수 없는 직업";
                playerInfo += `\n- ${name} (${cls}): ${trait}`;
            }
        }

        // 주사위 결과 분석
        let diceText = "";
        let diceContext = "";

        if (diceResult) {
            const { playerName, diceType, value, isCritical, isFail } = diceResult;
            const role = diceRoles[diceType] || { name: "일반 판정", desc: "일반적인 도전", weight: 1 };
            const successRate = Math.floor((value / diceType) * 100);

            // 주사위 종류별 맥락
            const roleContext = `[${role.name}] ${role.desc}`;

            if (isCritical) {
                diceText = `⚡ [${role.name}] ${playerName}이 D${diceType}에서 ${value} 크리티컬!`;
                diceContext = `${roleContext}\n크리티컬 성공! 상상을 초월하는 완벽한 성공. 주사위 종류(${role.name})에 걸맞는 전설적인 결과가 발생한다. 매우 극적으로 묘사하라.`;
            } else if (isFail) {
                diceText = `💀 [${role.name}] ${playerName}이 D${diceType}에서 ${value} 대실패!`;
                diceContext = `${roleContext}\n대실패! ${role.name}에서 최악의 결과. 단순 실패가 아닌 심각한 부작용이나 위기가 발생한다. D${diceType}의 중요도(${role.weight}배)만큼 상황이 악화된다.`;
            } else if (successRate >= 80) {
                diceText = `✅ [${role.name}] ${playerName}이 D${diceType}에서 ${value} 대성공!`;
                diceContext = `${roleContext}\n대성공! ${role.name}답게 인상적인 성과를 거둔다.`;
            } else if (successRate >= 50) {
                diceText = `👍 [${role.name}] ${playerName}이 D${diceType}에서 ${value} 성공!`;
                diceContext = `${roleContext}\n성공! 하지만 ${role.name}의 난이도(${role.weight}배)를 고려하면 약간의 대가가 따른다.`;
            } else if (successRate >= 30) {
                diceText = `😰 [${role.name}] ${playerName}이 D${diceType}에서 ${value} 아슬아슬!`;
                diceContext = `${roleContext}\n아슬아슬한 결과. ${role.name}에서 부분 성공. 복잡한 상황이 생긴다.`;
            } else {
                diceText = `❌ [${role.name}] ${playerName}이 D${diceType}에서 ${value} 실패!`;
                diceContext = `${roleContext}\n실패! ${role.name}의 난이도(${role.weight}배)만큼 상황이 나빠진다.`;
            }
        }

        const fullSituation = situation + (diceText ? "\n" + diceText : "");

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `당신은 15년 경력의 베테랑 판타지 TRPG 게임 마스터입니다.

세계관: 마법과 검이 공존하는 중세 판타지. 드래곤, 던전, 마법사 길드가 존재한다.

주사위 시스템:
- D6: 일상 판정 (쉬운 도전)
- D8: 전투/기술 판정 (보통 난이도)
- D12: 특수 능력 판정 (높은 난이도)
- D20: 운명 판정 (매우 중요한 순간)
- D100: 기적 판정 (전설적 도전)
주사위 종류가 클수록 결과의 파급력이 크다.

플레이어:${playerInfo}

${diceContext ? "【현재 판정 결과】\n" + diceContext : ""}

서술 규칙:
1. 주사위 종류와 결과를 반드시 스토리에 반영하라
2. D20, D100은 특히 극적으로 묘사하라
3. 플레이어 직업 특성을 자연스럽게 반영하라
4. 2~3문장으로 몰입감 있게 서술하라
5. 선택지는 10자 이내로 짧게, 결과가 확연히 다른 3가지로 구성하라
6. 항상 긴장감과 위험 요소를 포함하라

반드시 아래 JSON만 응답하라:
{"narration":"스토리 2~3문장","choices":["선택지1","선택지2","선택지3"]}`
                    },
                    {
                        role: 'user',
                        content: `현재 상황: ${fullSituation}
이전 스토리: ${history || '모험의 시작'}`
                    }
                ],
                temperature: 0.85,
                max_tokens: 600
            })
        });

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
            console.error("오류:", JSON.stringify(data));
            return res.status(500).json({ error: '서버 오류' });
        }

        const content = data.choices[0].message.content;
        const clean = content.replace(/```json|```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(clean);
        } catch(e) {
            const match = clean.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            } else {
                throw new Error("JSON 파싱 실패");
            }
        }

        console.log("성공!");
        res.json(parsed);

    } catch (error) {
        console.error('오류:', error.message);
        res.status(500).json({ error: '서버 오류', detail: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'TRPG GM 서버 작동 중!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버 실행 중: ${PORT}`);
});
