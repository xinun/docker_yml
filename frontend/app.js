// frontend/app.js (수정 완료 버전)

const express = require('express');
const path = require('path');
const app = express();
const axios = require('axios'); // 👈 백엔드 API 호출을 위해 axios 사용

// --- 환경 변수에서 백엔드 주소 가져오기 및 URI 정의 ---
// 🌟 1. 환경 변수 활성화 및 URI 정의
const GUESTBOOK_API_ADDR =
  process.env.GUESTBOOK_API_ADDR ||
  "mbti-backend.backend.svc.cluster.local:8080";

const BACKEND_URI = `http://${GUESTBOOK_API_ADDR}/api/messages`;
const SAJU_API_URI = `http://${GUESTBOOK_API_ADDR}/api/analyze`;

// --- Pug 템플릿 엔진 설정 ---
const questions = require('./questions'); // './questions.js'를 require
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// --- 미들웨어 설정 ---
app.use(express.static('public')); // 'public' 폴더 (이미지, CSS 등) 사용
// 🌟 JSON 바디 파싱 미들웨어 추가 (사주 분석 폼 데이터 처리에 필요)
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Pug 폼 데이터 파싱

// --- MBTI 홈 페이지 렌더링 ---
app.get("/", (req, res) => {
    axios.get(BACKEND_URI)
        .then(response => {
            res.render("home", {
                messages: response.data || [],
                questions: questions 
            });
        }).catch(error => {
            console.error('Error fetching messages:', error.message);
            res.render("home", {
                messages: [], 
                questions: questions 
            });
        });
});


// --- 사주 페이지 렌더링 ---
app.get("/saju", (req, res) => {
    // 템플릿이 서버 측 렌더링될 때 오류가 없도록 빈 값 전달
    res.render("saju", { sajuResult: null, error: null });
});

// --- 사주 분석 요청 처리 (🌟 JSON 프록시로 변경) ---
app.post('/saju-analyze', (req, res) => {
    // req.body는 AJAX 요청(JSON)을 가정합니다.
    const { name, year, month, day, hour } = req.body;
    
    // 🌟 1. 백엔드 사주 API (POST /api/analyze) 호출 (올바른 내부 URI 사용)
    axios.post(SAJU_API_URI, { year, month, day, hour })
        .then(response => {
            // 🌟 2. Pug 렌더링 대신, 백엔드에서 받은 JSON 데이터를 클라이언트에 바로 프록시
            //    name 필드를 추가하여 클라이언트 JS가 사용할 수 있도록 합니다.
            const sajuResultWithContext = { ...response.data, name: name };
            res.status(200).json(sajuResultWithContext); // ⬅️ 응답 방식을 JSON으로 변경
        }).catch(error => {
            // 3. 백엔드 API 호출 실패 시 오류 JSON 반환
            const statusCode = error.response?.status || 500;
            console.error('Saju API Error:', error.message);
            res.status(statusCode).json({ ok: false, error: '사주 분석 API 호출 실패: ' + error.message });
        });
});

// --- MBTI 방명록 작성 처리 ---
// 🚨 이 라우터는 프론트엔드에서 폼 전송(application/x-www-form-urlencoded)을 받으므로 JSON 대신 x-www-form-urlencoded를 처리해야 합니다.
app.post('/post', (req, res) => {
    const userAgent = req.headers['user-agent'];
    const tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [];
    const scores = { 
        E: req.body.scoreE,
        S: req.body.scoreS, 
        T: req.body.scoreT, 
        J: req.body.scoreJ 
    };
    
    const dataToSend = {
        name: req.body.name,
        date: req.body.date,
        mbti: req.body.mbti,
        memo: req.body.memo,
        tags: tags,
        scores: scores,
        userAgent: userAgent,
        mbtiImage: req.body.mbtiImage, 
        mbtiJob: req.body.mbtiJob,
        mbtiComment: req.body.mbtiComment
    };

    // 백엔드 API (POST /api/messages) 호출
    axios.post(BACKEND_URI, dataToSend)
        .then(response => {
            res.redirect('/'); 
        })
        .catch(error => {
            console.error('Error creating message via backend:', error.message);
            // 에러 시 리다이렉트 대신 에러 페이지 렌더링을 고려할 수 있습니다.
            res.redirect('/'); 
        });
});

// --- 좋아요 처리 ---
app.post('/like/:id', (req, res) => {
    const messageId = req.params.id;
    const LIKE_API_URI = `http://${GUESTBOOK_API_ADDR}/api/messages/${messageId}/like`;
    
    axios.patch(LIKE_API_URI)
        .then(response => {
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