import { Application } from 'express';
export declare class App {
    private app;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    listen(port: number | string, callback?: () => void): void;
    getApp(): Application;
}
//# sourceMappingURL=app.d.ts.map