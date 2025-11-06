<img width="1916" height="913" alt="image" src="https://github.com/user-attachments/assets/862ef7a8-7f26-476b-a564-572570683e3e" />
<img width="1899" height="923" alt="image" src="https://github.com/user-attachments/assets/38443361-052a-4018-90e5-d3f8d9291a54" />
<img width="1441" height="910" alt="image" src="https://github.com/user-attachments/assets/66323830-8358-49bd-a360-ff485b77fa03" />
#  MBTI & 사주(만세력) 분석 웹

MBTI 성향 테스트 기반의 방명록과 만세력 데이터를 활용한 사주 분석 기능을 제공하는 Node.js 기반 웹 애플리케이션입니다.

---

## 🛠️ 기술 스택 (Tech Stack)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Pug](https://img.shields.io/badge/Pug-A86454?style=for-the-badge&logo=pug&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GCP](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

---

## ✨ 주요 기능

* **MBTI 기능:** 100개 문항의 MBTI 테스트 및 결과 기반 방명록 작성 (MongoDB 연동).
* **사주(만세력) 기능:** 생년월일시를 입력받아 만세력 데이터를 조회하고 사주 팔자(간지)를 표시 (GCP Redis 연동).
* **페이지 분리:** MBTI와 사주 기능 페이지가 분리되어 있으며, 상단 네비게이션으로 이동 가능.

---

## 🏗️ 시스템 아키텍처

이 프로젝트는 3-Tier 아키텍처를 기반으로 하며, Docker Compose를 통해 로컬 VM 환경에서 실행됩니다.

1.  **Frontend (Pug.js + Express):** `frontend` 컨테이너. 사용자에게 웹페이지(Pug 템플릿)를 렌더링하고, 폼 데이터를 받아 백엔드 API를 호출하는 게이트웨이 역할을 합니다.
2.  **Backend (Node.js + Express):** `backend` 컨테이너. 프런트엔드로부터 API 요청을 받아 비즈니스 로직을 처리합니다.
3.  **Database (MongoDB):** `mongodb` 컨테이너. MBTI 방명록 데이터(읽기/쓰기)를 영구적으로 저장합니다.
4.  **Cache (GCP Memorystore for Redis):** 사주 분석을 위한 7만여 건의 만세력 데이터를 고속으로 조회하기 위한 캐시 저장소입니다.



### 🌐 하이브리드 클라우드 연결 (VPN)

이 아키텍처의 핵심은 VM 네트워크와 GCP VPC 네트워크를 연결하는 것입니다.

* VM(Docker)에서 실행되는 백엔드 서버는 GCP 외부 사설망에 있는 **GCP Memorystore(Redis)**에 접속해야 합니다.
* 이를 해결하기 위해 **GCP Cloud VPN**과 VM의 **strongSwan(IPsec)**을 사용하여 **VM 네트워크**와 **GCP VPC 네트워크** 간의 안전한 VPN 터널을 구축했습니다.
* 백엔드 서버는 이 VPN 터널을 통해 Redis의 사설 IP(`10.178.0.7`)로 직접 데이터를 조회합니다.

---

## 🚀 시작하기

1.  프로젝트 루트에 `docker-compose.yml` 파일이 있는지 확인합니다.
2.  (필수) GCP VPN 및 Memorystore 연결이 사전 설정되어 있어야 합니다.
3.  (필수) VM(Master Node)에 `strongSwan`이 설치 및 설정되어 `ipsec status`가 `ESTABLISHED` 상태여야 합니다.
4.  (필수) `backend`의 `routes/sajuRouter.js` (또는 `app.js`)에 GCP Memorystore IP가 올바르게 입력되어 있는지 확인합니다.
5.  다음 명령어로 모든 서비스를 빌드하고 실행합니다.

    ```bash
    docker compose build
    docker compose up -d
    ```

6.  웹 브라우저에서 `http://[VM_IP]:8000` (docker-compose.yml에 설정된 포트)로 접속합니다.
