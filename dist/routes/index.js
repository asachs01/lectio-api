"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const traditions_routes_1 = require("./traditions.routes");
const readings_routes_1 = require("./readings.routes");
const calendar_routes_1 = require("./calendar.routes");
const admin_routes_1 = require("./admin.routes");
const router = (0, express_1.Router)();
exports.apiRouter = router;
// Version prefix
const API_VERSION = process.env.API_VERSION || 'v1';
// Mount route modules
router.use(`/${API_VERSION}/traditions`, traditions_routes_1.traditionsRouter);
router.use(`/${API_VERSION}/readings`, readings_routes_1.readingsRouter);
router.use(`/${API_VERSION}/calendar`, calendar_routes_1.calendarRouter);
router.use(`/${API_VERSION}/admin`, admin_routes_1.adminRouter);
// Root API info
router.get(`/${API_VERSION}`, (_req, res) => {
    res.json({
        message: 'Lectionary API',
        version: API_VERSION,
        endpoints: {
            traditions: `/${API_VERSION}/traditions`,
            readings: `/${API_VERSION}/readings`,
            calendar: `/${API_VERSION}/calendar`,
        },
        documentation: '/api/docs',
        health: '/health',
    });
});
//# sourceMappingURL=index.js.map