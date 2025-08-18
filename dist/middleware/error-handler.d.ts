import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    details?: any;
}
export declare class HttpError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;
    details?: any;
    constructor(message: string, statusCode?: number, details?: any);
}
export declare const errorHandler: (error: AppError, req: Request, res: Response, _next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=error-handler.d.ts.map