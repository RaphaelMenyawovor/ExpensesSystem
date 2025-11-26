import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import logger from '../utils/logger';

export const register = async (req: Request, res: Response): Promise<Response> => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues });
        }

        const { email, password, name } = parsed.data;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            logger.warn(`Registration failed: Email ${email} already exists`);
            return res.status(409).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name ?? null, 
            },
        });

        logger.info(`New user registered with ID ${user.id}`);

        return res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, email: user.email, name: user.name }
        });

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Registration error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


export const login = async (req: Request, res: Response): Promise<Response> => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid input format' });
        }
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            logger.warn(`Login failed: Email ${email} not found`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            logger.warn(`Login failed: Incorrect password for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!(process.env.JWT_SECRET)) {
            logger.error('JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ error: 'Internal server error' });
        } 
        const secret = process.env.JWT_SECRET;

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            secret,
            { expiresIn: '1h' }
        );

        logger.info(`User logged in: ID ${user.id}`);
        return res.json({ message: 'Login successful', token });

    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error(`Login error: ${errorMessage}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};