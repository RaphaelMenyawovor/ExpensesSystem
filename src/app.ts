import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import httpLogger from './middleware/httpLogger';
import logger from './utils/logger';
import { prisma } from './config/db';

// Import Routes
import authRoutes from './routes/auth.routes';
import expenseRoutes from './routes/expense.routes';
import categoryRoutes from './routes/category.routes'; // <--- Import Categories

const app = express();

// App Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(httpLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes); // <--- Register Categories

// Health check
app.get('/', (_req: Request, res: Response) => {
    logger.info('Health check route hit');
    res.json({ status: 'API is running' });
});

// Db test
app.get('/db-test', async (_req: Request, res: Response) => {
    try {
        const count = await prisma.user.count();
        logger.info(`Database check: Found ${count} users`);
        res.json({ status: 'Database connected', userCount: count });
    } catch (error: any) {
        logger.error(`Database connection failed: ${error.message}`);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

export default app;