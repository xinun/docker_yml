// frontend/app.js
const express = require('express');
const path = require('path');
const app = express();
const axios = require('axios'); // 👈 백엔드 API 호출을 위해 axios 사용

// --- 환경 변수에서 백엔드 주소 가져오기 ---
// K8s YAML의 'GUESTBOOK_API_ADDR' (예: 'backend-service:8080')
// const GUESTBOOK_API_ADDR = process.env.GUESTBOOK_API_ADDR;
// const BACKEND_URI = `http://${GUESTBOOK_API_ADDR}/api/messages`;
// const SAJU_API_URI = `http://${GUESTBOOK_API_ADDR}/api/analyze`; // 사주 API URI

// --- Pug 템플릿 엔진 설정 ---
const questions = require('./questions'); // './questions.js'를 require
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// --- 미들웨어 설정 ---
app.use(express.static('public')); // 'public' 폴더 (이미지, CSS 등) 사용
app.use(express.urlencoded({ extended: false })); // Pug 폼 데이터 파싱

// --- MBTI 홈 페이지 렌더링 ---
app.get("/", (req, res) => {
    // 백엔드 API를 호출하여 기존 방명록 목록을 가져옵니다.
    axios.get(BACKEND_URI)
        .then(response => {
            // 성공 시, DB 데이터와 질문 데이터를 Pug 템플릿으로 전달
            res.render("home", {
                messages: response.data || [],
                questions: questions 
            });
        }).catch(error => {
            // 백엔드 연결 실패 시 (예: 서버 시작 중)
            console.error('Error fetching messages:', error.message);
            res.render("home", {
                messages: [], // 빈 목록
                questions: questions // 질문 데이터는 그대로 전달
            });
        });
});

// --- 사주 페이지 렌더링 ---
app.get("/saju", (req, res) => {
    // 빈 'saju.pug' 템플릿을 렌더링합니다.
    res.render("saju", { sajuResult: null, error: null });
});

// --- 사주 분석 요청 처리 ---
app.post('/saju-analyze', (req, res) => {
    // 1. saju.pug 폼에서 데이터를 받습니다.
    const { name, year, month, day, hour } = req.body;
    
    // 2. 백엔드 사주 API (POST /api/analyze)를 호출합니다.
    axios.post('/api/analyze', { year, month, day, hour })
        .then(response => {
            // 3. 백엔드에서 받은 결과(간지, GPT 풀이)에 'name'을 추가합니다.
            const sajuResultWithContext = { ...response.data, name: name };
            // 4. 결과를 saju.pug 템플릿에 전달하여 다시 렌더링합니다.
            res.render("saju", { sajuResult: sajuResultWithContext, error: null });
        }).catch(error => {
            // 5. 백엔드 API 호출 실패 시
            console.error('Saju API Error:', error.message);
            res.render("saju", { sajuResult: null, error: '사주 데이터를 가져오는 데 실패했습니다.' });
        });
});

// --- MBTI 방명록 작성 처리 ---
app.post('/post', (req, res) => {
    // 1. Pug 폼에서 전송된 데이터 추출
    const userAgent = req.headers['user-agent'];
    const tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [];
    const scores = { 
        E: req.body.scoreE,
        S: req.body.scoreS, 
        T: req.body.scoreT, 
        J: req.body.scoreJ 
    };
    
    // 2. 백엔드로 전송할 데이터 객체 구성 (🌟 새 필드 포함)
    const dataToSend = {
        name: req.body.name,
        date: req.body.date,
        mbti: req.body.mbti,
        memo: req.body.memo,
        tags: tags,
        scores: scores,
        userAgent: userAgent,
        
        // 🌟 'index.pug'에서 추가한 직업/이미지 데이터
        mbtiImage: req.body.mbtiImage, 
        mbtiJob: req.body.mbtiJob,
        mbtiComment: req.body.mbtiComment // 👈 추가
    };

    // 3. 백엔드 API (POST /api/messages) 호출
    axios.post('/api/messages', dataToSend)
        .then(response => {
            // 성공 시 홈으로 리다이렉트 (새로고침)
            res.redirect('/'); 
        })
        .catch(error => {
            console.error('Error creating message via backend:', error.message);
            res.redirect('/'); 
        });
});

// --- 좋아요 처리 ---
app.post('/like/:id', (req, res) => {
    const messageId = req.params.id;
    
    // 백엔드 API (PATCH /api/messages/:id/like) 호출
    axios.patch(`/api/messages/${messageId}/like`)
        .then(response => {
            // 성공 시, 업데이트된 '좋아요' 숫자를 JSON으로 반환
            res.status(200).json(response.data);
        })
        .catch(error => {
            console.error('Error proxying like request:', error.message);
            res.status(500).json({ error: 'Proxy Error' });
        });
});

// --- 서버 실행 ---
const PORT = process.env.PORT || 80; // K8s YAML의 컨테이너 포트와 일치
app.listen(PORT, () => {
    console.log(`Frontend Server listening on port ${PORT}`);
});
