import { Router } from 'express';
import { AutomationController } from '../controllers/automation.controller';

const router = Router();
const automationController = new AutomationController();

// Trial email endpoints
router.post('/trial', automationController.sendTrialEmail.bind(automationController));

// Marketing campaign endpoints
router.post('/campaign', automationController.triggerCampaign.bind(automationController));

// Bulk send endpoints
router.post('/bulk', automationController.bulkSend.bind(automationController));

// Job status endpoints
router.get('/jobs/:jobId/:queueType', automationController.getJobStatus.bind(automationController));

// Queue status endpoints
router.get('/status/:queueType', automationController.getQueueStatus.bind(automationController));

// All queues status
router.get('/status', automationController.getAllQueuesStatus.bind(automationController));

export default router;