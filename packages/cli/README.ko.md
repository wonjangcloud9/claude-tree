<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@claudetree/cli"><img src="https://img.shields.io/npm/v/@claudetree/cli.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@claudetree/cli"><img src="https://img.shields.io/npm/dm/@claudetree/cli.svg" alt="npm downloads"></a>
  <a href="https://github.com/wonjangcloud9/claude-tree/actions/workflows/ci.yml"><img src="https://github.com/wonjangcloud9/claude-tree/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="node version">
</p>

# @claudetree/cli

**GitHub Issue URL -> 자율 구현 -> Pull Request.** 수동 개입 제로.

claudetree는 여러 Claude Code 세션을 병렬로 실행합니다. 각 세션은 독립된 git worktree에서 동작합니다. GitHub 이슈를 넘기고, 자리를 비운 뒤, 돌아오면 PR이 올라와 있습니다.

## Claude Code가 못 하는 것 (claudetree는 가능)

| 기능 | Claude Code | claudetree |
|------|-------------|------------|
| 병렬 세션 | 한 번에 하나 | 무제한 |
| 이슈-to-PR 파이프라인 | 수동 복사-붙여넣기 | `ct start <url>` |
| 세션 비용 추적 | 현재 세션만 | 세션별 + 합계 |
| 이슈 일괄 처리 | 불가 | `ct batch` / `ct auto` |
| 의존성 체인 | 불가 | `ct chain` |
| 웹 대시보드 | 불가 | `ct web` |
| 세션 로그 | 터미널 스크롤 | `ct log <id>` |

## 설치

```bash
npm install -g @claudetree/cli
```

필수 요구사항: Node.js >= 22, Git, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

## 60초 빠른 시작

```bash
# 1. 프로젝트에서 초기화
ct init

# 2. 환경 확인
ct doctor

# 3. Fire and forget -- Claude가 나머지를 처리
ct start https://github.com/you/repo/issues/42

# 4. 모니터링
ct status          # 터미널에서 전체 현황
ct log abc123      # 세션 이벤트 로그
ct web             # 웹 대시보드
```

## 핵심 워크플로우

### 단일 이슈

```bash
ct start 42                              # 이슈 번호로
ct start https://github.com/org/repo/issues/42  # URL로
ct start "로그인 버그 수정해줘"             # 자연어로
```

### 배치 처리

```bash
# 수동: 이슈를 직접 지정
ct batch 101 102 103
ct batch --label bug --limit 10

# 자동: 열린 이슈를 가져와 충돌 감지 후 병렬 실행
ct auto                          # bustercall 별칭
ct auto --label "high-priority" --dry-run
```

### 의존성 체인

```bash
# 순차 실행: DB 스키마 -> API -> UI
ct chain 10 11 12
```

### 비용 추적

```bash
# 세션당 예산 한도 설정
ct start 42 --max-cost 5.00

# 통계 확인
ct stats

# 상태에서 세션별 비용 확인
ct status
```

## 명령어

| 명령어 | 설명 |
|--------|------|
| `ct start <issue>` | GitHub 이슈에 대해 Claude 세션 시작 |
| `ct status` | 모든 세션 상태 및 비용 표시 |
| `ct stats` | 세션 통계: 비용, 토큰, 성공률 |
| `ct log <session>` | 세션 이벤트 조회 (-f 옵션으로 실시간 추적) |
| `ct stop [id]` | 실행 중인 세션 중지 |
| `ct resume <id>` | 일시 중단된 세션 재개 |
| `ct batch [issues]` | 여러 이슈를 병렬로 처리 |
| `ct auto` | 열린 이슈 자동 수집 및 충돌 감지 실행 |
| `ct chain [issues]` | 이슈를 순차 실행 (의존성 순서) |
| `ct web` | 웹 대시보드 실행 (localhost:3000) |
| `ct list` | 모든 worktree 목록 표시 |
| `ct clean` | 완료된 worktree 제거 |
| `ct doctor` | 환경 확인: Node, Git, Claude CLI |
| `ct init` | 프로젝트에 claudetree 초기화 |

## TDD 모드 (기본)

모든 세션은 기본적으로 테스트 주도 개발 방식으로 실행됩니다:

```bash
ct start 42                          # TDD, 2시간 타임아웃
ct start 42 --gates test,type,lint   # 커스텀 검증 게이트
ct start 42 --no-tdd                 # TDD 비활성화
```

## 링크

- [GitHub](https://github.com/wonjangcloud9/claude-tree)
- [전체 문서](https://github.com/wonjangcloud9/claude-tree#readme)
- [변경 내역](https://github.com/wonjangcloud9/claude-tree/blob/develop/CHANGELOG.md)

## 라이선스

MIT
