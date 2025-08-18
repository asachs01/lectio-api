"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraditionsService = void 0;
class TraditionsService {
    async getAll() {
        // TODO: Implement database query
        return [
            {
                id: 'rcl',
                name: 'Revised Common Lectionary',
                abbreviation: 'RCL',
                description: 'A three-year cycle of readings shared by many Protestant denominations',
                startDate: '2023-12-03',
                endDate: '2024-11-30',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'catholic',
                name: 'Roman Catholic Lectionary',
                abbreviation: 'Catholic',
                description: 'The official lectionary of the Roman Catholic Church',
                startDate: '2023-12-03',
                endDate: '2024-11-30',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'episcopal',
                name: 'Episcopal/Anglican Lectionary',
                abbreviation: 'Episcopal',
                description: 'Lectionary used by Episcopal and Anglican churches',
                startDate: '2023-12-03',
                endDate: '2024-11-30',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
    }
    async getById(id) {
        // TODO: Implement database query
        const traditions = await this.getAll();
        return traditions.find(t => t.id === id) || null;
    }
    async getSeasons(traditionId, year) {
        // TODO: Implement database query
        return [
            {
                id: 'advent',
                name: 'Advent',
                color: 'purple',
                startDate: '2023-12-03',
                endDate: '2023-12-24',
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'christmas',
                name: 'Christmas',
                color: 'white',
                startDate: '2023-12-25',
                endDate: '2024-01-06',
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'epiphany',
                name: 'Epiphany',
                color: 'green',
                startDate: '2024-01-07',
                endDate: '2024-02-13',
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
    }
}
exports.TraditionsService = TraditionsService;
//# sourceMappingURL=traditions.service.js.map