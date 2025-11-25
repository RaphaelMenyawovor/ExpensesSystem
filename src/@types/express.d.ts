declare global {
    namespace Express {
        interface Request {
            // adding payload to user propery
            user?: {
                userId: number;
                email: string;
            };
        }
    }
}