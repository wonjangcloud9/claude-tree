<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.zh.md">中文</a>
</p>

# @claudetree/cli

**여러 Claude Code 세션을 병렬로 실행** — 각각 독립된 git worktree에서 동작합니다.

## 설치

```bash
npm install -g @claudetree/cli
# 또는
pnpm add -g @claudetree/cli
```

## 빠른 시작

```bash
# 프로젝트에서 초기화
ct init

# GitHub 이슈 작업 시작 (TDD 모드 기본)
ct start https://github.com/you/repo/issues/42

# 또는 자연어로
ct start "로그인 버그 수정해줘"

# 진행상황 모니터링
ct status

# 웹 대시보드 열기
ct web
```

## TDD 모드 (기본)

모든 세션은 기본적으로 TDD 모드로 실행됩니다:

```bash
# TDD 모드 (2시간 타임아웃, 기본값)
ct start 42

# 커스텀 타임아웃 및 게이트
ct start 42 --timeout 60 --gates test,type,lint

# TDD 모드 끄기
ct start 42 --no-tdd
```

**TDD 옵션:**
- `--timeout <분>` - 세션 타임아웃 (기본: 120)
- `--idle-timeout <분>` - 유휴 타임아웃 (기본: 10)
- `--gates <gates>` - 검증 게이트: test,type,lint,build (기본: test,type)
- `--max-retries <n>` - 게이트 재시도 횟수 (기본: 3)
- `--no-tdd` - TDD 모드 비활성화

## 명령어

| 명령어 | 설명 |
|--------|------|
| `ct init` | 프로젝트에 claudetree 초기화 |
| `ct start <issue>` | Worktree 생성 및 Claude 세션 시작 |
| `ct status` | 모든 세션 상태 표시 |
| `ct stop [id]` | 세션 중지 |
| `ct doctor` | 환경 상태 확인 |
| `ct demo` | 인터랙티브 데모 (토큰 미사용) |
| `ct batch` | 여러 이슈를 병렬로 처리 |
| `ct bustercall` | 모든 open 이슈를 자동으로 가져와 병렬 세션 실행 |
| `ct clean` | 모든 worktree 제거 (main 제외) |
| `ct web` | 웹 대시보드 시작 |

## Bustercall (일괄 처리)

스마트 충돌 감지로 여러 GitHub 이슈를 병렬 처리:

```bash
# 처리될 이슈 미리보기
ct bustercall --dry-run

# 기본 설정으로 실행 (3개 병렬)
ct bustercall

# 순차 실행 강제
ct bustercall --sequential

# 커스텀 충돌 라벨
ct bustercall --conflict-labels "deps,config"
```

**충돌 감지:** 공유 파일(package.json, config)을 수정할 수 있는 이슈는 자동 감지되어 머지 충돌 방지를 위해 순차 실행됩니다.

## 주요 기능

- **멀티 세션**: 무제한 Claude 세션 병렬 실행
- **독립 워크스페이스**: 각 작업은 고유한 git worktree 보유
- **Fire and Forget**: GitHub 이슈 URL 전달하면 Claude가 나머지 처리
- **토큰 추적**: 각 세션이 사용하는 토큰 정확히 확인
- **웹 대시보드**: 모든 세션을 실시간으로 모니터링

## 링크

- [GitHub 저장소](https://github.com/wonjangcloud9/claude-tree)
- [전체 문서](https://github.com/wonjangcloud9/claude-tree#readme)

## 라이선스

MIT
