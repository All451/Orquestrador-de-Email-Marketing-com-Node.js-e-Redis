# 🏗️ Email Orchestrator System

A complete email automation system with Redis queues, n8n integration, and Google Sheets support.

## 🏗️ Architecture

```mermaid
graph TB
    A[API Node.js] --> B[Producer Service];
    B --> C[Redis Queue];
    C --> D[Trial Worker];
    C --> E[Marketing Worker];
    D --> F[n8n Trial Webhook];
    E --> G[n8n Marketing Webhook];
    F --> H[Send Email];
    G --> I[Get Template];
    I --> H;
    H --> J[Update Sheet];
    J --> K[Webhook Callback];
    K --> L[Monitor Dashboard];
    
    style A fill:#4CAF50
    style B fill:#2196F3
    style C fill:#FF5722
    style D fill:#9C27B0
    style E fill:#9C27B0
    style L fill:#00BCD4
```

## 📁 Project Structure

```
email-orchestrator/
├── src/
│   ├── core/
│   │   └── queue/
│   │       ├── producer.service.ts
│   │       ├── worker.service.ts
│   │       ├── queue.manager.ts
│   │       └── queues.ts
│   ├── jobs/
│   │   ├── trial.job.ts
│   │   ├── marketing.job.ts
│   │   └── bulk.job.ts
│   ├── api/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── app.ts
│   ├── services/
│   │   ├── n8n.service.ts
│   │   ├── googleSheets.service.ts
│   │   └── email.service.ts
│   └── config/
│       ├── queue.config.ts
│       └── redis.config.ts
├── docker-compose.yml
├── package.json
└── .env.example
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Redis server

### Setup
```bash
# Clone and install
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configurations

# Start with Docker
chmod +x deploy.sh
./deploy.sh

# Or run locally (separate terminals)
npm run start:api
npm run start:worker
```

## 🔧 Key Configuration

### Environment Variables (.env)
```env
# Server
PORT=3000

# Redis (Queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
```

## 📊 API Endpoints

### Trial Email
```bash
POST /api/automation/trial
{
  "nome": "John Doe",
  "email": "john@example.com",
  "telefone": "+1234567890",
  "empresa": "Example Corp"
}
```

### Marketing Campaign
```bash
POST /api/automation/campaign
{
  "niche": "clinica",
  "sheetId": "your-sheet-id",
  "sheetName": "Leads",
  "limit": 100
}
```

## 🛠️ Technologies

- **Node.js/Express**: Backend API
- **Bull**: Queue management
- **Redis**: In-memory storage
- **n8n**: Workflow automation
- **Google Sheets API**: Data integration
- **TypeScript**: Type safety
- **Docker**: Containerization

## 📈 Monitoring

Check system status with:
```bash
./monitor.sh
```

Access the dashboard at: http://localhost:3000/admin/queues

## 🚀 Features

- **Asynchronous processing** with Redis queues
- **Retry mechanisms** with exponential backoff
- **Comprehensive logging** and monitoring
- **Multiple workflow types** (trial, marketing, bulk)
- **Google Sheets integration**
- **n8n workflow automation**

---

**Ready to scale your email automation with complete control and zero vendor lock-in!**