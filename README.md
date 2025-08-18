# Lectionary API

A modern REST API for serving lectionary readings and liturgical calendar data. Built with Node.js, Express, TypeScript, and designed for high performance and scalability.

## 🚀 Features

- **Multiple Lectionary Traditions**: Support for RCL, Catholic, Episcopal/Anglican, and Lutheran traditions
- **Daily Readings**: Get readings for any specific date or today's readings
- **Liturgical Calendar**: Complete calendar information with seasons and special days
- **OpenAPI 3.0 Specification**: Interactive API documentation with Swagger UI
- **TypeScript**: Full type safety and modern development experience
- **Comprehensive Testing**: Unit, integration, and end-to-end tests
- **Modern Architecture**: Clean separation of concerns with controllers, services, and middleware
- **Performance Optimized**: Built-in caching, compression, and rate limiting
- **Production Ready**: Logging, monitoring, and deployment configuration

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- PostgreSQL 12+ (for production)
- Redis (for caching, optional)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/lectionary-api.git
cd lectionary-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Once the server is running, access the interactive API documentation at:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs.json`

## 🔧 API Endpoints

### Health Check
- `GET /health` - Health status of the API

### Traditions
- `GET /api/v1/traditions` - Get all lectionary traditions
- `GET /api/v1/traditions/:id` - Get specific tradition
- `GET /api/v1/traditions/:id/seasons` - Get seasons for a tradition

### Readings
- `GET /api/v1/readings/today` - Get today's readings
- `GET /api/v1/readings?date=YYYY-MM-DD` - Get readings for a specific date
- `GET /api/v1/readings/range?start=YYYY-MM-DD&end=YYYY-MM-DD` - Get readings for a date range

### Calendar
- `GET /api/v1/calendar/current` - Get current liturgical calendar info
- `GET /api/v1/calendar/:year` - Get calendar for a specific year
- `GET /api/v1/calendar/:year/seasons` - Get seasons for a year

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## 🏗️ Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔐 Environment Variables

Key environment variables (see `.env.example` for full list):

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lectionary_api
DB_USERNAME=postgres
DB_PASSWORD=your_password
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
```

## 📊 Project Structure

```
lectionary-api/
├── src/
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── config/          # Configuration files
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript type definitions
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
├── docs/               # Documentation
└── dist/               # Compiled JavaScript
```

## 🚢 Deployment

### Docker
```bash
# Build Docker image
docker build -t lectionary-api .

# Run with Docker Compose
docker-compose up
```

### DigitalOcean App Platform
The project includes configuration for DigitalOcean App Platform deployment. See the `.do/app.yaml` configuration file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the [LectServe](https://github.com/marmanold/LectServe) project
- Built with modern web technologies and best practices
- Designed for the global church community

---

For more information, visit the [API documentation](http://localhost:3000/api/docs) or contact the development team.