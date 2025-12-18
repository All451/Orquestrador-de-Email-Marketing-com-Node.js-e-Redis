import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QueueManager, QueueType } from '../core/queue/queue.manager';
import automationRoutes from './routes/automation.routes';
import monitorRoutes from './routes/monitor.routes';
import { logger } from '../utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Bull Board Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const queueManager = QueueManager.getInstance();
queueManager.initialize().then(() => {
  const queues = Array.from((queueManager as any).queues.values());
  const adapters = queues.map(queue => new BullAdapter(queue));
  
  createBullBoard({
    queues: adapters,
    serverAdapter: serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'Email Orchestrator Dashboard',
        boardLogo: {
          path: 'https://img.icons8.com/color/96/000000/email--v1.png',
          width: 96,
          height: 96
        },
        miscLinks: [
          { text: 'API Docs', url: '/api-docs' },
          { text: 'Metrics', url: '/metrics' },
          { text: 'Health', url: '/health' }
        ]
      }
    }
  });
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/automation', automationRoutes);
app.use('/api/monitor', monitorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV
  });
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', async (req, res) => {
  try {
    const queueManager = QueueManager.getInstance();
    const queuesStatus = await queueManager.getAllQueuesStatus();
    
    const metrics = Object.entries(queuesStatus).map(([queue, status]) => `
# HELP queue_jobs_total Total jobs in ${queue}
# TYPE queue_jobs_total gauge
queue_jobs_total{queue="${queue}",state="waiting"} ${status.waiting}
queue_jobs_total{queue="${queue}",state="active"} ${status.active}
queue_jobs_total{queue="${queue}",state="completed"} ${status.completed}
queue_jobs_total{queue="${queue}",state="failed"} ${status.failed}
queue_jobs_total{queue="${queue}",state="delayed"} ${status.delayed}
    `).join('\\n');
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.trim());
  } catch (error) {
    res.status(500).send(`# ERROR: ${error.message}`);
  }
});

// API Documentation
app.use('/api-docs', express.static('docs'));

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Dashboard: http://localhost:${PORT}/admin/queues`);
  logger.info(`🔌 API: http://localhost:${PORT}/api/automation`);
  logger.info(`🏥 Health: http://localhost:${PORT}/health`);
});

export default app;