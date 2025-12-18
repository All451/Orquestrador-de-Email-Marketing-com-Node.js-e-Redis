import { Router } from 'express';
import { QueueManager } from '../../core/queue/queue.manager';

const router = Router();
const queueManager = QueueManager.getInstance();

// Get all queues status
router.get('/queues', async (req, res) => {
  try {
    const status = await queueManager.getAllQueuesStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get queues status'
    });
  }
});

// Get specific queue status
router.get('/queues/:queueType', async (req, res) => {
  try {
    const { queueType } = req.params;
    const status = await queueManager.getQueueStatus(queueType as any);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found'
      });
    }
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status'
    });
  }
});

// Pause queue
router.post('/queues/:queueType/pause', async (req, res) => {
  try {
    const { queueType } = req.params;
    await queueManager.pauseQueue(queueType as any);
    
    res.json({
      success: true,
      message: `Queue ${queueType} paused`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to pause queue'
    });
  }
});

// Resume queue
router.post('/queues/:queueType/resume', async (req, res) => {
  try {
    const { queueType } = req.params;
    await queueManager.resumeQueue(queueType as any);
    
    res.json({
      success: true,
      message: `Queue ${queueType} resumed`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resume queue'
    });
  }
});

// Empty queue
router.post('/queues/:queueType/empty', async (req, res) => {
  try {
    const { queueType } = req.params;
    await queueManager.emptyQueue(queueType as any);
    
    res.json({
      success: true,
      message: `Queue ${queueType} emptied`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to empty queue'
    });
  }
});

export default router;