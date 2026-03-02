const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/gm', async (req, res) => {
    const { situation, players, history } = req.body;
    if (!situation) return res.status(400).json({ error: '상황 없음' });

    try {
        console.log("요청:", situation);
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
                        content: 'You are a TRPG game master. Respond ONLY in this JSON format: {"narration":"story in Korean","choices":["choice1","choice2","choice3"]}'
                    },
                    {
                        role: 'user',
                        content: `상황: ${situation}`
                    }
                ],
                max_tokens: 500
            })
        });
        const data = await response.json();
        console.log("응답:", JSON.stringify(data));
        if (!data.choices || !data.choices[0]) return res.status(500).json({ error: '응답 오류' });
        const content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(content));
    } catch (err) {
        console.error("오류:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.send('OK'));

app.listen(process.env.PORT || 3000, () => console.log('서버 실행 중: ' + (process.env.PORT || 10000)));
