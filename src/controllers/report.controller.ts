import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import logger from '../utils/logger';
import { monthReportQuerySchema, monthlyReportQuerySchema } from '../validators/report.validator';

export const getMonthlyReport = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);

        const parsed = monthlyReportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }

        const year = parsed.data.year ?? new Date().getFullYear();

        const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

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


export const getReportForMonth = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);

        const parsed = monthReportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        } 

        const year = parsed.data.year ?? new Date().getFullYear();
        const month = parsed.data.month ?? new Date().getMonth() + 1; // plus 1 because of zero indexing

        //precision(exact beginning of the month)
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

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

        const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

        return res.json({
            month: startDate.toLocaleString('default', { month: 'long' }),
            year,
            totalSpent,
            expenses,
        });


    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Monthly Report error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
