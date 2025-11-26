import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import logger from '../utils/logger';

export const createCategory = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);

        const parsed = createCategorySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }

        const { name } = parsed.data;

        // duplicate category name for the same user
        const existing = await prisma.category.findFirst({
            where: { name, userId: req.user.userId }
        });

        if (existing) {
            return res.status(409).json({ error: 'Category with this name already exists' });
        }

        const category = await prisma.category.create({
            data: {
                name,
                userId: req.user.userId,
            },
        });

        logger.info(`Category created: ${category.name} (ID: ${category.id})`);
        return res.status(201).json(category);

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Create Category error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// all categories for user
export const getCategories = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);

        const categories = await prisma.category.findMany({
            where: { userId: req.user.userId },
            orderBy: { name: 'asc' },
        });

        return res.json(categories);

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Get Categories error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCategory = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);
        
        // Fix: Convert String ID to Number
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

        const parsed = updateCategorySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }

        // must be owner
        const existing = await prisma.category.findFirst({
            where: { id: id, userId: req.user.userId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const updated = await prisma.category.update({
            where: { id: id },
            data: { name: parsed.data.name },
        });

        return res.json(updated);

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Update Category error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.sendStatus(401);
        
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });

        const existing = await prisma.category.findFirst({
            where: { id: id, userId: req.user.userId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await prisma.category.delete({
            where: { id: id },
        });

        logger.info(`Category deleted: ID ${id}`);
        return res.json({ message: 'Category deleted successfully' });

    } catch (error: any) {
        // P2003 is a Prisma foreign key constraint error
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete category because it is used in existing expenses' });
        }
        const errorMessage = (error as Error).message;
        logger.error(`Delete Category error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};