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

### Documentation Location

All detailed documentation is located in the `/docs` directory:
- **Database Documentation**: `/docs/DATABASE_*.md` - Schema, setup, and optimization guides
- **Observability**: `/docs/OBSERVABILITY.md` - Monitoring and telemetry setup
- **Migration Guide**: `/docs/MIGRATION_GUIDE.md` - Database migration procedures
- **Entity Diagram**: `/docs/ENTITY_DIAGRAM.md` - Database relationship diagrams

## 📖 Interactive API Documentation

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

This project is configured for automated deployment to DigitalOcean App Platform.

#### Prerequisites

1. **DigitalOcean Account**: Create an account at [DigitalOcean](https://www.digitalocean.com/)
2. **doctl CLI**: Install the DigitalOcean command-line tool:
   ```bash
   # macOS
   brew install doctl
   
   # Linux
   snap install doctl
   
   # Or download from: https://docs.digitalocean.com/reference/doctl/how-to/install/
   ```

3. **Authentication**: Configure doctl with your API token:
   ```bash
   doctl auth init
   ```

#### Automated Deployment Methods

##### Method 1: GitHub Actions (Recommended)
The project includes a GitHub Actions workflow that automatically deploys on push to the `main` branch.

1. Fork or push this repository to GitHub
2. Add your DigitalOcean API token as a GitHub secret:
   - Go to Settings → Secrets and variables → Actions
   - Add a new secret named `DIGITALOCEAN_ACCESS_TOKEN`
3. Push to the `main` branch to trigger deployment

##### Method 2: Command-Line Deployment
Use the included deployment script for one-command deployment:

```bash
# Deploy to DigitalOcean
./scripts/deploy.sh

# View deployment logs
./scripts/deploy.sh logs

# Get app URL
./scripts/deploy.sh url

# Destroy deployment
./scripts/deploy.sh destroy
```

##### Method 3: Manual doctl Commands
```bash
# Validate app configuration
doctl apps spec validate app.yaml

# Create new app
doctl apps create --spec app.yaml

# Update existing app
APP_ID=$(doctl apps list --format ID,Name --no-header | grep "lectio-api" | awk '{print $1}')
doctl apps update $APP_ID --spec app.yaml
```

#### Configuration

The deployment is configured in `app.yaml`:
- **Region**: NYC by default
- **Instance**: Basic (512MB RAM, 1 vCPU)
- **Database**: Managed PostgreSQL 15
- **Cache**: Managed Redis 7
- **Auto-deploy**: Enabled for main branch

#### Environment Variables

Production secrets should be set in the DigitalOcean dashboard:
1. Navigate to your app in the DigitalOcean console
2. Go to Settings → App-Level Environment Variables
3. Add the following secrets:
   - `JWT_SECRET`: Strong random string (32+ characters)
   - `DB_PASSWORD`: Will be auto-generated if using managed database
   - `REDIS_URL`: Will be auto-configured if using managed Redis

#### Post-Deployment Validation

After deployment, validate the API is working:

```bash
# Get the app URL
APP_URL=$(doctl apps get <app-id> --format DefaultIngress --no-header)

# Test health endpoint
curl https://$APP_URL/health

# Test API documentation
open https://$APP_URL/api/docs

# Test sample endpoint
curl https://$APP_URL/api/v1/traditions
```

#### Monitoring and Logs

```bash
# View real-time logs
doctl apps logs <app-id> --follow

# View deployment history
doctl apps list-deployments <app-id>

# Get app metrics
doctl apps get <app-id>
```

#### Cost Optimization

The default configuration uses:
- **App**: Basic instance (~$5/month)
- **Database**: Dev database (~$15/month)
- **Redis**: Dev instance (~$15/month)
- **Total**: ~$35/month

For production workloads, consider:
- Upgrading to Professional instances for auto-scaling
- Using dedicated database nodes for better performance
- Implementing CDN for static assets

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