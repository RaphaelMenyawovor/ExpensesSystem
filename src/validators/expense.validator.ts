import { z } from 'zod';

export const createExpenseSchema = z.object({
    amount: z.number().positive({ message: "Amount must be a positive number" }),
    description: z.string().optional(),
    date: z.coerce.date({
        error: "Date is required",
    }),
    category: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const getExpensesQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minAmount: z.coerce.number().optional(),
    maxAmount: z.coerce.number().optional(),
    category: z.string().optional(),
});

export const getExpenseByIdParamsSchema = z.object({
    id: z.coerce.number().int().positive({ message: "ID must be a positive integer" }),
})