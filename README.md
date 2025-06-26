# Agentify MCP Server

[![npm version](https://badge.fury.io/js/agentify-mcp.svg)](https://badge.fury.io/js/agentify-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

🤖 **AI 작업 추적과 webhook 알림을 위한 간단한 MCP 서버**

AI가 작업을 시작하고 완료할 때마다 추적하고, 모든 활동을 webhook으로 실시간 전송합니다.

## 🚀 기능

- **`task-started`** - 작업 시작시 호출하는 도구
- **`auto-task-tracker`** - 장시간 실행되는 작업 자동 추적
- **`task-completed`** - 작업 완료시 호출하는 도구
- **Webhook 알림** - 모든 도구 호출을 webhook으로 실시간 전송
- **환경변수 설정** - 동적 webhook URL 관리

## 📦 설치

```bash
# 전역 설치
npm install -g agentify-mcp

# 또는 npx로 실행
npx agentify-mcp
```

## ⚙️ Webhook 설정

### 1. Webhook.site 사용 (추천)

1. [webhook.site](https://webhook.site) 방문
2. 자동 생성된 고유 URL 복사
3. 아래 방법 중 하나로 설정

### 2. 환경변수로 설정

```bash
export AGENTIFY_WEBHOOK_URL="https://webhook.site/your-unique-id"
# 또는
export WEBHOOK_URL="https://webhook.site/your-unique-id"

agentify-mcp
```

### 3. MCP 설정에서 환경변수 주입

Claude Desktop의 `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentify": {
      "command": "agentify-mcp",
      "env": {
        "AGENTIFY_WEBHOOK_URL": "https://webhook.site/your-unique-id",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 4. 설정 파일 위치

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## 🔧 사용법

### AI 도구 호출 예제

AI가 자동으로 다음과 같이 도구를 호출합니다:

```javascript
// 작업 시작할 때
task_started({
  taskDescription: 'React 컴포넌트 리팩토링 시작',
});

// 작업 완료할 때
task_completed({
  taskDescription: 'React 컴포넌트 리팩토링 완료',
  outcome: 'success',
  details: '성능 20% 향상',
});
```

### 실행 상태 확인

서버 시작시 다음과 같은 상태를 확인할 수 있습니다:

```
🚀 Agentify MCP Server
📋 Webhook: ✅ Enabled      # URL이 설정된 경우
📝 Log Level: info
```

또는:

```
📋 Webhook: ❌ Disabled     # URL이 설정되지 않은 경우
```

## 📡 Webhook 페이로드

모든 도구 호출시 다음 형태로 webhook이 전송됩니다:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "event": "tool_called",
  "toolName": "task-started",
  "arguments": {
    "taskDescription": "React 컴포넌트 리팩토링 시작"
  }
}
```

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "event": "tool_completed",
  "toolName": "task-completed",
  "arguments": {
    "taskDescription": "React 컴포넌트 리팩토링 완료",
    "outcome": "success"
  },
  "result": {
    "content": [{ "type": "text", "text": "✅ Task Completed..." }]
  },
  "duration": 150
}
```

## 🛠️ 개발자용 설정

### 프로그래밍 방식으로 설정

```typescript
import { AgentifyMCPServer } from 'agentify-mcp';

const server = new AgentifyMCPServer({
  webhookUrl: 'https://webhook.site/your-unique-id',
  logLevel: 'info',
});

await server.start();
```

### 런타임 동적 설정

```typescript
const server = new AgentifyMCPServer();

// 나중에 webhook URL 설정
server.setWebhookUrl('https://webhook.site/your-unique-id');

// webhook 상태 확인
console.log(server.isWebhookEnabled()); // true/false
```

### 로컬 개발

```bash
git clone https://github.com/agentify/agentify-mcp.git
cd agentify-mcp
npm install

# 개발 모드 실행
npm run dev

# 빌드
npm run build
```

## 🔍 문제해결

### Webhook이 작동하지 않는 경우

1. **환경변수 확인**

   ```bash
   echo $AGENTIFY_WEBHOOK_URL
   ```

2. **Claude Desktop 재시작**
   - 환경변수 변경 후 Claude Desktop 완전 재시작

3. **Webhook.site에서 테스트**
   - 실시간으로 요청이 오는지 확인

### MCP 연결 문제

1. **설정 파일 경로 확인**
2. **JSON 문법 오류 확인**
3. **명령어 경로 확인** (`agentify-mcp` 또는 `npx agentify-mcp`)

## 🛡️ 보안

- Webhook URL은 로그에서 마스킹됩니다
- 환경변수로 민감한 정보를 안전하게 관리
- 런타임에 URL 변경 가능

## 🌟 사용 예제

### 기본 실행

```bash
# webhook 없이 실행
agentify-mcp

# webhook와 함께 실행
AGENTIFY_WEBHOOK_URL="https://webhook.site/abc123" agentify-mcp
```

### Claude Desktop과 함께 사용

1. Webhook.site에서 URL 생성
2. `claude_desktop_config.json`에 설정 추가
3. Claude Desktop 재시작
4. AI가 작업할 때마다 실시간 알림 수신

## 📄 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🔗 링크

- [GitHub Repository](https://github.com/agentify/agentify-mcp)
- [npm Package](https://www.npmjs.com/package/agentify-mcp)
- [Issues](https://github.com/agentify/agentify-mcp/issues)

## 📊 Stats

![npm downloads](https://img.shields.io/npm/dm/agentify-mcp.svg)
![GitHub stars](https://img.shields.io/github/stars/agentify/agentify-mcp.svg)
![GitHub issues](https://img.shields.io/github/issues/agentify/agentify-mcp.svg)
