<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# claudetree

**여러 Claude Code 세션을 병렬로 실행** — 각각 독립된 git worktree에서 동작합니다.

> **팁:** 모든 명령어에서 `claudetree` 대신 `ct`를 사용할 수 있습니다.

## 왜 claudetree인가?

Claude Code는 강력하지만, 하나의 디렉토리에서 한 번에 하나의 세션만 실행됩니다. 여러 이슈를 동시에 작업하거나, 수동 개입 없이 전체 작업을 Claude에게 위임하고 싶다면?

**claudetree가 해결합니다** — git worktree와 자동화된 Claude Code 오케스트레이션을 결합합니다.

### 주요 장점

| 장점 | 설명 |
|------|------|
| **멀티 세션 관리** | 여러 Claude 세션을 병렬로 실행, 각각 다른 이슈 작업 |
| **독립된 워크스페이스** | 각 작업은 고유한 git worktree 보유 — 브랜치 충돌 없음, 컨텍스트 오염 없음 |
| **Fire and Forget** | GitHub 이슈 URL만 전달하면 Claude가 나머지 처리: 코드 읽기, 구현, 테스트, 커밋, PR 생성 |
| **웹 대시보드** | 모든 세션을 실시간 UI로 모니터링 — 진행상황, 로그, 세션 관리 |
| **자동 워크플로우** | 작업 완료 시 Claude가 자동으로 커밋하고 PR 생성 |
| **독립 컨텍스트** | 각 Claude 세션은 자체 컨텍스트 유지, 작업 간 간섭 방지 |

### 활용 사례

- **병렬 버그 수정**: 여러 버그 수정을 동시에 진행
- **기능 개발**: 아키텍처에 집중하는 동안 Claude에게 기능 구현 위임
- **코드 리뷰**: 다른 PR을 리뷰하는 동안 Claude가 변경사항 구현
- **배치 처리**: 여러 이슈를 큐에 넣고 Claude가 순차 처리

## 중요: 토큰 사용량 경고

claudetree는 전체 세션을 Claude Code에 위임합니다:

- **높은 토큰 소비**: 각 세션이 자율적으로 실행되며 여러 API 호출 수행
- **비용 인식**: 단일 이슈 해결에 수천 개의 토큰 소비 가능
- **권장 대상**: Claude Pro/Team 플랜 또는 충분한 API 크레딧 보유 팀
- **사용량 모니터링**: `ct status`로 세션별 토큰 사용량과 비용 추적
- **예산 제어**: `--max-cost`로 비용 한도 초과 시 자동 중지

수동 제어를 원하면 `--no-session` 플래그로 Claude 없이 worktree만 생성할 수 있습니다.

## 작동 원리

```
Your Project (예: my-web-app/)
├── .claudetree/              ← `ct init`으로 생성
│   ├── config.json
│   ├── sessions.json
│   └── events/               ← 세션 로그
├── .worktrees/               ← Worktree 저장 위치
│   ├── issue-42-fix-login/   ← Claude 작업 공간
│   └── issue-55-add-auth/    ← 다른 Claude 작업 공간
├── src/
└── ...
```

**워크플로우는 간단합니다:**
1. GitHub 이슈가 있는 프로젝트
2. `ct start <issue-url>` 실행 — claudetree가 worktree 생성하고 Claude 시작
3. Claude가 이슈 읽기, 솔루션 구현, 테스트 실행, 커밋, PR 생성
4. CLI (`ct status`) 또는 웹 대시보드 (`ct web`)로 진행상황 모니터링

## 설치

```bash
npm install -g @claudetree/cli
# 또는
pnpm add -g @claudetree/cli
```

개발용:
```bash
git clone https://github.com/wonjangcloud9/claude-tree.git
cd claude-tree
pnpm install && pnpm build
cd packages/cli && pnpm link --global
```

## 빠른 시작

### 1단계: 프로젝트에서 초기화

```bash
cd ~/projects/my-web-app    # 본인 프로젝트로 이동
ct init                     # claudetree 초기화
```

### 2단계: GitHub 토큰 설정

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### 3단계: 이슈 작업 시작

```bash
# GitHub 이슈 URL로 — Claude 자동 시작
ct start https://github.com/you/my-web-app/issues/42

# Claude가 수행하는 작업:
# 1. Worktree와 브랜치 생성
# 2. 이슈 설명 읽기
# 3. 솔루션 구현
# 4. 테스트 실행
# 5. 커밋 및 PR 생성
```

### 4단계: 진행상황 모니터링

```bash
ct status    # CLI 상태 뷰 (진행바 & 비용)
ct status -w # Watch 모드 (자동 새로고침)
ct web       # 웹 대시보드 http://localhost:3000
```

**상태 출력 포함:**
- 세션 진행상황: `●─●─◉─○─○ Implementing`
- 토큰 사용량: `12,345 in / 3,456 out`
- 비용 추적: `$0.1234`

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `ct init` | 프로젝트에 claudetree 초기화 |
| `ct start <issue>` | Worktree 생성 및 Claude 세션 시작 |
| `ct list` | 모든 worktree 목록 |
| `ct status` | 모든 세션 상태 (진행상황 & 비용) |
| `ct stop [id]` | 세션 중지 |
| `ct web` | 웹 대시보드 시작 |
| `ct doctor` | 환경 설정 확인 (Claude CLI, Git, GitHub) |
| `ct demo` | 기능 탐색용 인터랙티브 데모 |

### Start 옵션

```bash
ct start <issue> [options]

Options:
  -p, --prompt <prompt>      Claude용 커스텀 프롬프트
  -s, --skill <skill>        스킬 활성화 (tdd, review)
  -T, --template <template>  세션 템플릿 (bugfix, feature, refactor, review)
  -b, --branch <branch>      커스텀 브랜치명
  -t, --token <token>        GitHub 토큰
  --max-cost <cost>          USD 예산 한도 (초과 시 자동 중지)
  --lint <command>           세션 후 lint 실행 (예: "npm run lint")
  --gate                     lint 실패 시 세션 실패 처리
  --no-session               Worktree만 생성 (Claude 없이)
```

### 예시

```bash
# 완전 자동화 — Claude가 모든 것 처리
ct start https://github.com/you/repo/issues/42

# Worktree만 생성, 나중에 수동으로 Claude 실행
ct start 42 --no-session

# TDD 워크플로우 (테스트 먼저, 구현 후)
ct start 42 --skill tdd

# 예산 제한 ($0.50 최대)
ct start 42 --max-cost 0.50

# Lint 게이트 (lint 실패 시 세션 실패)
ct start 42 --lint "npm run lint" --gate

# 템플릿 사용
ct start 42 --template bugfix

# 전체 옵션
ct start 42 -s tdd --max-cost 1.00 --lint "npm run lint" --gate
```

## 설정

`ct init` 후, `.claudetree/config.json` 편집:

```json
{
  "worktreeDir": ".worktrees",
  "github": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

GitHub API 접근을 위해 `GITHUB_TOKEN` 환경 변수 설정.

## 웹 대시보드

웹 대시보드에서 모든 세션을 실시간으로 모니터링.

```bash
ct web    # http://localhost:3000
```

### 기능

**세션 목록 (메인 페이지)**
- 모든 활성 세션을 카드로 표시
- 상태별 색상 코드 (running/pending/completed/failed)
- 보호된 세션 (develop/main)은 삭제 불가

**세션 상세 페이지**

| 패널 | 설명 |
|------|------|
| **터미널 출력** | 실시간 Claude 출력 스트리밍 |
| **타임라인** | 작업 이력 (파일 변경, 커밋, 테스트) |
| **도구 승인** | Claude가 사용한 도구 (Read, Write, Bash 등) |
| **코드 리뷰** | 승인/거절 버튼이 있는 변경 요약 |

### 실시간 업데이트

- 포트 3001의 WebSocket 서버
- 세션 상태 변경 시 자동 새로고침
- Claude 출력 라이브 스트리밍

## 내장 스킬

### TDD 워크플로우
```bash
ct start 42 --skill tdd
```
엄격한 테스트 주도 개발 적용:
1. **RED** — 실패하는 테스트 먼저 작성 (commit: `test: ...`)
2. **GREEN** — 통과를 위한 최소 구현 (commit: `feat: ...`)
3. **REFACTOR** — 코드 정리 (commit: `refactor: ...`)

### 코드 리뷰
```bash
ct start 42 --skill review
```
CRITICAL / WARNING / INFO 레벨의 철저한 코드 리뷰

## 세션 템플릿

템플릿은 일반적인 작업에 대해 미리 설정된 프롬프트를 제공:

```bash
ct start 42 --template bugfix     # 버그 수정 집중
ct start 42 --template feature    # 기능 구현
ct start 42 --template refactor   # 코드 리팩토링
ct start 42 --template review     # 코드 리뷰
```

## 아키텍처

```
packages/
├── cli/      # CLI 명령어 (Commander.js)
├── core/     # 도메인 + 인프라
│   ├── application/  # SessionManager
│   ├── domain/       # Repository 인터페이스
│   └── infra/
│       ├── git/          # GitWorktreeAdapter
│       ├── claude/       # ClaudeSessionAdapter
│       ├── github/       # GitHubAdapter (Octokit)
│       ├── storage/      # File repositories
│       └── websocket/    # WebSocketBroadcaster
├── shared/   # TypeScript 타입
└── web/      # Next.js 대시보드
```

## 브랜치 전략

```
main      ← 안정 릴리스 (npm publish)
  ↑
develop   ← 통합 (PR 대상)
  ↑
feature/* ← 작업 브랜치 (claudetree가 생성)
```

PR은 자동으로 `develop` 브랜치를 대상으로 생성됩니다.

## 비교

| 기능 | 수동 Claude | claudetree |
|------|-------------|------------|
| 다중 세션 | 한 번에 하나 | 무제한 병렬 |
| 컨텍스트 분리 | 공유 디렉토리 | 별도 worktree |
| 이슈 통합 | 복사-붙여넣기 | 자동 가져오기 |
| 진행 모니터링 | 터미널만 | 웹 대시보드 |
| PR 생성 | 수동 | 자동 |
| 세션 관리 | 수동 | 중앙 집중 |

## 제한사항

- **토큰 비용**: 자율 세션은 상당한 토큰 소비 (`--max-cost`로 제한)
- **Claude 가용성**: Claude Code CLI 설치 필요 (`ct doctor`로 확인)
- **Git worktrees**: 프로젝트가 git 저장소여야 함
- **GitHub 통합**: 현재 이슈 가져오기는 GitHub만 지원

## 기여

개발 가이드라인은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 라이선스

MIT
