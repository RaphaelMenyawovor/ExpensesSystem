import { Router } from 'express';
import { getMonthlyReport, getReportForMonth } from '../controllers/report.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/monthly', getMonthlyReport);
router.get('/month', getReportForMonth);

export default router;
