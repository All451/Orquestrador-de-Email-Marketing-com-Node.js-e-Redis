# Email Orchestrator

Custom orchestrator with Redis queues for email marketing automation. This solution provides a complete system for managing email campaigns with n8n integration, Google Sheets support, and comprehensive monitoring.

## 🏗️ Architecture

```
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
│   │   ├── queue/
│   │   │   ├── producer.service.ts
│   │   │   ├── worker.service.ts
│   │   │   ├── queue.manager.ts
│   │   │   └── queues.ts
│   │   └── cache/
│   │       ├── redis.client.ts
│   │       └── cache.service.ts
│   ├── jobs/
│   │   ├── trial.job.ts
│   │   ├── marketing.job.ts
│   │   ├── bulk.job.ts
│   │   └── webhook.job.ts
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── automation.controller.ts
│   │   │   ├── webhook.controller.ts
│   │   │   └── monitor.controller.ts
│   │   ├── routes/
│   │   │   ├── automation.routes.ts
│   │   │   ├── webhook.routes.ts
│   │   │   └── monitor.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   └── rate-limit.ts
│   │   └── app.ts
│   ├── services/
│   │   ├── n8n.service.ts
│   │   ├── googleSheets.service.ts
│   │   ├── email.service.ts
│   │   └── webhook.service.ts
│   ├── models/
│   │   ├── job.model.ts
│   │   ├── lead.model.ts
│   │   └── execution.model.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   └── helpers.ts
│   └── config/
│       ├── queue.config.ts
│       ├── redis.config.ts
│       └── n8n.config.ts
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

## 🚀 Quick Start

### 1. Clone and setup:
```bash
git clone seu-repositorio
cd email-orchestrator
cp .env.example .env
# Edit .env with your configurations
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Start with Docker:
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Or run locally:
```bash
# Terminal 1 - API
npm run start:api

# Terminal 2 - Worker
npm run start:worker
```

## 📊 Dashboard

- **Dashboard**: http://localhost:3000/admin/queues
- **API**: http://localhost:3000/api/automation
- **Health**: http://localhost:3000/health
- **Redis UI**: http://localhost:8081
- **MongoDB UI**: http://localhost:8082
- **n8n**: http://localhost:5678

## 🔄 API Endpoints

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
  "limit": 100,
  "campaignName": "Summer Campaign"
}
```

### Bulk Send
```bash
POST /api/automation/bulk
{
  "niche": "imobiliaria",
  "leads": [
    {
      "nome": "Lead 1",
      "email": "lead1@example.com"
    },
    {
      "nome": "Lead 2",
      "email": "lead2@example.com"
    }
  ]
}
```

## 📈 Monitoring

Use the monitoring script to check system status:
```bash
./monitor.sh
```

## 🐳 Docker Compose Services

- **API**: Main application server
- **Worker**: Job processing workers
- **Redis**: Queue management
- **MongoDB**: Data persistence
- **n8n**: Workflow automation
- **Redis Commander**: Redis UI
- **Mongo Express**: MongoDB UI

## 🛠️ Technologies

- **Node.js**: Runtime environment
- **Express**: Web framework
- **Bull**: Queue management
- **Redis**: In-memory data store
- **n8n**: Workflow automation
- **Google Sheets API**: Data integration
- **TypeScript**: Type safety
- **Docker**: Containerization

## ✅ Features

- **Complete control** over automation workflows
- **Cost effective** with open-source components
- **High performance** with async processing
- **Comprehensive monitoring** and metrics
- **Scalable architecture** with multiple workers
- **Retry mechanisms** with exponential backoff
- **Integration ready** with n8n and Google Sheets

This solution offers **all the functionality of Trigger.dev** but with complete control, zero cloud costs, and maximum flexibility!