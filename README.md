#  MBTI & 사주(만세력) 분석 웹 (Kubernetes Edition)  Docker & k8s

MBTI 성향 테스트 기반의 방명록과 만세력 데이터를 활용한 사주 분석 기능을 제공하는 Node.js 기반 웹 애플리케이션입니다. 이 프로젝트는 **Docker Compose**를 이용한 로컬 테스트와 **Kubernetes(K8s)** 클러스터 배포를 모두 지원하도록 설계되었습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Pug](https://img.shields.io/badge/Pug-A86454?style=for-the-badge&logo=pug&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![GCP](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

---

## 🏗️ 시스템 아키텍처

이 프로젝트는 쿠버네티스 환경에 최적화된 **3-Tier 마이크로서비스 아키텍처**를 기반으로 합니다.

1.  **Frontend (Pug.js + Express):** `Deployment`로 배포. 사용자에게 웹페이지(Pug 템플릿)를 렌더링하고, 폼 데이터를 받아 백엔드 API를 호출하는 게이트웨이 역할을 합니다.
2.  **Backend (Node.js + Express):** `Deployment`로 배포. 프런트엔드로부터 API 요청을 받아 비즈니스 로직(MBTI, 사주)을 처리합니다.
3.  **Database (MongoDB):** `StatefulSet`으로 배포. MBTI 방명록 데이터(읽기/쓰기)를 영구적으로 저장합니다.
4.  **Cache (GCP Memorystore for Redis):** 사주 분석을 위한 7만여 건의 만세력 데이터를 고속으로 조회하기 위한 **외부 관리형 서비스(Managed Service)**입니다.



### 🌐 하이브리드 클라우드 연결 (VPN & Redis)

이 아키텍처의 핵심은 VM 기반의 **Kubernetes 클러스터**와 **GCP 클라우드**를 연결하는 하이브리드 구성입니다.

* **VPN (IPsec):** `k8s-master` 노드에 설치된 **strongSwan(IPsec)**과 **GCP Cloud VPN**이 VPN 터널을 구축하여, K8s 클러스터(VM 네트워크)와 GCP VPC(Redis 네트워크) 간의 안전한 사설 통신을 보장합니다.
* **Redis (Cache):** K8s의 백엔드 Pod는 이 VPN 터널을 통해 GCP Memorystore(Redis)의 사설 IP(`10.178.0.7`)로 직접 만세력 데이터를 고속 조회합니다.

---

## 🚀 시작하기 (로컬 개발 테스트)

`k8s-master` 노드에서 `docker compose`를 사용하여 K8s 배포 전 빠르게 로컬 테스트를 진행할 수 있습니다.

1.  (필수) GCP VPN 연결 및 `strongSwan`이 `ESTABLISHED` 상태여야 합니다.
2.  (필수) `backend`의 `routes/sajuRouter.js`에 GCP Memorystore IP가 올바르게 입력되어 있는지 확인합니다.
3.  프로젝트 루트에서 다음 명령어로 모든 서비스를 빌드하고 실행합니다.

    ```bash
    docker compose build
    docker compose up -d
    ```

4.  웹 브라우저에서 `http://[k8s-master_IP]:8000`로 접속합니다.

---

## 🚢 Kubernetes 배포 (프로덕션)

(이 프로젝트가 `/k8s` 디렉토리에 K8s 매니페스트(YAML) 파일들을 포함하고 있다고 가정합니다.)

1.  **VPN 확인:** `k8s-master` 노드의 `strongSwan` VPN 연결이 활성화되어 있는지 확인합니다.
2.  **라우팅 설정:** 모든 **워커 노드(Worker Nodes)**가 VPN 게이트웨이(`k8s-master`)를 통해 GCP Redis 대역(`10.178.0.0/20`)으로 라우팅되도록 `ip route add` 규칙이 설정되어 있는지 확인합니다.
3.  **GCP 방화벽 확인:** GCP 방화벽이 K8s 클러스터의 모든 노드 대역(`leftsubnet`)으로부터의 Redis(`tcp:6379`) 트래픽을 허용하는지 확인합니다.
4.  **배포:** `kubectl`을 사용하여 리소스를 배포합니다.

    ```bash
    # 예시: k8s YAML 파일들이 있는 디렉토리에서 실행
    kubectl apply -f ./k8s/
    ```


<img width="1916" height="913" alt="image" src="https://github.com/user-attachments/assets/862ef7a8-7f26-476b-a564-572570683e3e" />
<img width="1899" height="923" alt="image" src="https://github.com/user-attachments/assets/38443361-052a-4018-90e5-d3f8d9291a54" />
<img width="1441" height="910" alt="image" src="https://github.com/user-attachments/assets/66323830-8358-49bd-a360-ff485b77fa03" />
<img width="741" height="825" alt="image" src="https://github.com/user-attachments/assets/3f743be2-c738-4015-aadb-8f286325470f" />


