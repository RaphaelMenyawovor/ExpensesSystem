import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import logger from '../utils/logger';

export const getMonthlyReport = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);

        const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

        const expenses = await prisma.expense.findMany({
            where: {
                userId: req.user.userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                date: true,
                amount: true,
            },
        });

        // 12 months beginning from 0(jan)
        const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
            month: new Date(0, i).toLocaleString('default', { month: 'long' }),
            total: 0
        }));

        expenses.forEach((expense) => {
            const monthIndex = new Date(expense.date).getMonth();
            
            if (monthlyTotals[monthIndex]) {
                monthlyTotals[monthIndex].total += Number(expense.amount);
            }
        });

        return res.json({
            year,
            data: monthlyTotals,
            totalSpent: monthlyTotals.reduce((sum, m) => sum + m.total, 0)
        });

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Monthly Report error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};