import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    details?: unknown;
}
export declare class HttpError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;
    details?: unknown;
    constructor(message: string, statusCode?: number, details?: unknown);
}
export declare const errorHandler: (error: unknown, req: Request, res: Response, _next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=error-handler.d.ts.map