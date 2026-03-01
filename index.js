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
        console.log("요청 받음:", situation);
        console.log("API 키 확인:", GROQ_API_KEY ? "있음" : "없음!");

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
                        content: `You are a fantasy TRPG game master. Respond ONLY in this exact JSON format with no other text:
{"narration":"2-3 sentence story description in Korean","choices":["choice1 in Korean","choice2 in Korean","choice3 in Korean"]}`
                    },
                    {
                        role: 'user',
                        content: `상황: ${situation}, 플레이어: ${JSON.stringify(players)}, 히스토리: ${history || '게임시작'}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        const data = await response.json();
        console.log("Groq 전체 응답:", JSON.stringify(data));

        if (!data.choices || !data.choices[0]) {
            console.error("choices 없음:", JSON.stringify(data));
            return res.status(500).json({ error: '서버 오류', detail: JSON.stringify(data) });
        }

        const content = data.choices[0].message.content;
        console.log("content:", content);

        const clean = content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        console.log("파싱 성공!");
        res.json(parsed);

    } catch (error) {
        console.error('오류 상세:', error.message);
        res.status(500).json({ error: '서버 오류', detail: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'TRPG GM 서버 작동 중!' });
});

const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버 실행 중: ${PORT}`);
});
