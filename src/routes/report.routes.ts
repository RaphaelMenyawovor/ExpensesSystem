import { Router } from 'express';
import { getMonthlyReport } from '../controllers/report.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// monthly report
router.get('/monthly', getMonthlyReport);

export default router;
