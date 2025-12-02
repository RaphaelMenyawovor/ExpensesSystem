import { z } from 'zod';

export const monthlyReportQuerySchema = z.object({
    year: z.coerce.number().int().min(1900).max(9999).optional(),
});

export const monthReportQuerySchema = z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(1900).max(9999).optional(),
});
