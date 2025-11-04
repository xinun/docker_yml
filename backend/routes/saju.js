const express = require('express');
const router = express.Router();
const { ping, getByDate } = require('../utils/redis');
const { OpenAI } = require('openai'); // 👈 [1. OpenAI 라이브러리 추가]

// 👈 [2. OpenAI 클라이언트 초기화]
// docker-compose.yml에서 API 키를 자동으로 가져옵니다.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// 1. Redis 헬스 체크 API (기존과 동일)
router.get('/saju/healthz', async (_req, res) => {
  const p = await ping();
  return (p === 'PONG') ? res.send('ok') : res.status(500).send('ng');
});

// 2. 사주 분석 API (GPT 연동)
router.post('/analyze', async (req, res) => {
  try {
    // 1~3. Redis에서 데이터 조회 (기존과 동일)
    const { year, month, day, hour } = req.body;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
      return res.status(400).json({ ok: false, error: 'year, month, day를 올바르게 보내세요' });
    
    const r = await getByDate(dateStr);
    if (!r.data) return res.status(404).json({ ok: false, error: `데이터 없음 (${r.key})` });

    // 4. 간지 계산 (기존과 동일)
    const ganjiResult = calculateSajuGanji(r.data, parseInt(hour));

    // 👈 [5. GPT에게 보낼 프롬프트(명령어) 생성]
    // (이 프롬프트를 수정하면 GPT의 답변 품질이 달라집니다)
    const prompt = `
[사용자 정보]
- 연주 (태어난 해): ${ganjiResult.year}
- 월주 (태어난 월): ${ganjiResult.month}
- 일주 (태어난 일): ${ganjiResult.day}
- 시주 (태어난 시): ${ganjiResult.hour}

너는 전문 명리 해석가다. 입력되는 네 기둥(연주/월주/일주/시주)만을 근거로 평생운을 작성한다.
출력은 반드시 아래 7개 섹션을 이 순서·제목으로 작성한다:
1) 초년운(1~20세), 2) 중년운(21~50세), 3) 말년운(51세 이후),
4) 형제운, 5) 자식운, 6) 부부운, 7) 직업운.
규칙:
- 각 섹션은 300~400자로 작성. 300자 미만이면 보충해 300~400자로 맞춘다.
- 따뜻하고 현실적인 톤. ‘회원님’ 호칭 사용. 사주 용어는 풀어서 설명.
- 연·월·일·시 기둥의 조합으로 성향과 흐름을 추론하되, 단정 대신 확률·경향 표현을 사용.
- 중복 문장 금지. 과장·단순 점치는 어투 금지. 연령대 흐름은 시간순으로 기술.
- 추가 데이터(오행 수치, 신강/신약 등)는 추정하지 말고 언급하지 않는다.
출력 형식(정확히 이 포맷):
초년운
{본문 300~400자}

중년운
{본문 300~400자}

말년운
{본문 300~400자}

형제운
{본문 300~400자}

자식운
{본문 300~400자}

부부운
{본문 300~400자}

직업운
{본문 300~400자}


`;

    // 👈 [6. GPT API 호출]
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4-turbo", // 비용이 저렴한 모델 (또는 "gpt-4-turbo")
      messages: [{ role: "user", content: prompt }],
    });
    console.log('[GPT Response]', chatCompletion);
	  // GPT의 답변 텍스트만 추출
    const gptInterpretation = chatCompletion.choices[0].message.content;
    console.log('[GPT Interpretation]', gptInterpretation);
    // 👈 [7. 최종 결과 반환 (GPT 풀이 포함)]
    return res.json({
      ok: true,
      ganji: ganjiResult,
      interpretation: gptInterpretation, // 👈 GPT 풀이를 여기에 추가
      key: r.key,
      date: dateStr,
    });

  } catch (e) {
    // (기존 catch 블록)
    console.error('[saju-analyze] route error:', e);
    // 🌟 [수정] GPT 오류 메시지도 함께 표시
    if (e.response) {
      console.error('OpenAI Error Details:', e.response.data);
      return res.status(500).json({ ok: false, error: e.response.data.error.message });
    }
    return res.status(500).json({ ok: false, error: e.message || 'server error' });
  }
});

// --- 간지 계산 함수 (기존과 동일) ---
function calculateHourGanji(dayMasterHan, hour) {
    const hourInt = parseInt(hour);
    const gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const ji = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    if (!dayMasterHan || dayMasterHan === '?' || hour === undefined) return '??';
    
    let hourIndex = Math.floor((hourInt + 1) / 2) % 12;
    let ganIndex = (hourIndex + (gan.indexOf(dayMasterHan) * 2)) % 10;
    return gan[ganIndex] + ji[hourIndex];
}

function calculateSajuGanji(manseryukData, hour) {
    const yearGanji = manseryukData.cd_hyganjee || manseryukData.hyganjee || '??';
    const monthGanji = manseryukData.cd_hmganjee || manseryukData.hmganjee || '??';
    const dayGanji = manseryukData.cd_hdganjee || manseryukData.hdganjee || '??';
    const hourGanji = calculateHourGanji(dayGanji.substring(0, 1), hour) || '??';
    return { year: yearGanji, month: monthGanji, day: dayGanji, hour: hourGanji };
}

module.exports = router;
