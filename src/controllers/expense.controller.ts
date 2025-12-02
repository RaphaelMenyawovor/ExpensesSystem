import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { createExpenseSchema, updateExpenseSchema, getExpensesQuerySchema, getExpenseByIdParamsSchema } from '../validators/expense.validator';
import logger from '../utils/logger';
import { Prisma } from '../../generated/prisma/client';


export const createExpense = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);

        const parsed = createExpenseSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }

        const { amount, description, date, category } = parsed.data;

        const expense = await prisma.expense.create({
            data: {
                amount,
                date,
                userId: req.user.userId,
                description: description ?? null,
                category: category ?? null,
            },
        });

        logger.info(`Expense created: ID ${expense.id} for User ${req.user.userId}`);
        return res.status(201).json(expense);

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Create Expense error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all expenses(paginated and filtered)
export const getExpenses = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);

        const parsed = getExpensesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }

        const { page, limit, startDate, endDate, minAmount, maxAmount, category } = parsed.data;

        // build where clause(based on filters)
        const where: Prisma.ExpenseWhereInput = {
            userId: req.user.userId,
        };

        // date range filter
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = startDate;
            if (endDate) where.date.lte = endDate;
        }

        // Amount range filter
        if (minAmount !== undefined || maxAmount !== undefined) {
            where.amount = {};
            if (minAmount !== undefined) where.amount.gte = minAmount;
            if (maxAmount !== undefined) where.amount.lte = maxAmount;
        }

        // category filter
        if (category) {
            where.category = category;
        }

        const skip = (page - 1) * limit;

        // fetch expenses and total count in parallel
        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
            }),
            prisma.expense.count({ where }),
        ]);

        return res.json({
            data: expenses,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Get Expenses error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// single expense(filter by id)
export const getExpenseById = async (req: Request, res: Response): Promise<Response> => {


    try {
        if (!req.user) return res.sendStatus(401);

        const parsed = getExpenseByIdParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }


        const { id } = parsed.data;

        const expense = await prisma.expense.findFirst({
            where: {
                id: Number(id),
                userId: req.user.userId,
            },
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        return res.json(expense);

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Get Expense By ID error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Update expense
export const updateExpense = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);
        const { id } = req.params;

        const parsed = updateExpenseSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }

        const existing = await prisma.expense.findFirst({
            where: { id: Number(id), userId: req.user.userId },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        const dataToUpdate = Object.fromEntries(
            Object.entries(parsed.data).filter(([_, v]) => v !== undefined)
        );

        const updated = await prisma.expense.update({
            where: { id: Number(id) },
            data: dataToUpdate,
        });

        logger.info(`Expense updated: ID ${id}`);
        return res.json(updated);

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Update Expense error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteExpense = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);
        const { id } = req.params;

        const existing = await prisma.expense.findFirst({
            where: { id: Number(id), userId: req.user.userId },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        await prisma.expense.delete({
            where: { id: Number(id) },
        });

        logger.info(`Expense deleted: ID ${id}`);
        return res.json({ message: 'Expense deleted successfully' });

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Delete Expense error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};