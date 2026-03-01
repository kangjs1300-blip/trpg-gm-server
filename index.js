const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/gm', async (req, res) => {
    const { situation, players, history } = req.body;

    if (!situation) {
        return res.status(400).json({ error: '상황 정보가 없습니다' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [
                    {
                        role: 'system',
                        content: `너는 판타지 TRPG 게임의 GM(게임 마스터)이야.
플레이어들의 행동에 따라 스토리를 진행해줘.
항상 다음 JSON 형식으로만 응답해:
{
  "narration": "상황 설명 (2~3문장)",
  "choices": ["선택지1", "선택지2", "선택지3"]
}
한국어로 응답하고, 판타지 세계관에 맞게 흥미롭게 만들어줘.`
                    },
                    {
                        role: 'user',
                        content: `현재 상황: ${situation}
플레이어 직업: ${JSON.stringify(players)}
이전 스토리: ${history || '게임 시작'}`
                    }
                ],
                temperature: 0.8,
                max_tokens: 500
            })
        });

        const data = await response.json();
        console.log("Groq 응답:", JSON.stringify(data));
if (!data.choices || !data.choices[0]) {
    console.error("Groq 응답 오류:", JSON.stringify(data));
    return res.status(500).json({ error: '서버 오류' });
}
const content = data.choices[0].message.content;

        // JSON 파싱
        const clean = content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        res.json(parsed);

    } catch (error) {
        console.error('Groq API 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'TRPG GM 서버 작동 중!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버 실행 중: ${PORT}`);
});
