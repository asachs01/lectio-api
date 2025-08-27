# Lectio API Documentation

## Overview

The Lectio API is a modern REST API for serving lectionary readings and liturgical calendar data. It provides comprehensive access to daily readings from multiple Christian traditions including the Revised Common Lectionary (RCL), Catholic Lectionary, Episcopal Lectionary, and Lutheran Lectionary.

**Base URL**: https://lectio-api.org (Production)  
**Current Deployment**: https://lectio-api-o6ed3.ondigitalocean.app  
**API Version**: v1  
**Documentation**: https://lectio-api.org/api/docs

## Authentication

Currently, the API is open and does not require authentication. Future versions may implement API key or JWT-based authentication.

## Rate Limiting

The API implements rate limiting to ensure fair usage:
- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Standard rate limit headers are included in responses
  - `RateLimit-Limit`: Maximum requests allowed
  - `RateLimit-Remaining`: Requests remaining in window
  - `RateLimit-Reset`: Time until limit resets (seconds)

## Endpoints

### Health Check

#### GET /health
Check the health status of the API.

**Response**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-24T19:22:24.956Z",
  "uptime": 234.797229824,
  "environment": "production",
  "version": "v1"
}
```

### Traditions

#### GET /api/v1/traditions
Get all available lectionary traditions.

**Response**
```json
[
  {
    "id": "uuid",
    "name": "Revised Common Lectionary",
    "abbreviation": "RCL",
    "description": "Three-year lectionary cycle used by many Protestant churches",
    "startDate": "2024-12-01",
    "endDate": "2025-11-30"
  }
]
```

#### GET /api/v1/traditions/:id
Get a specific tradition by ID.

**Parameters**
- `id` (path): UUID of the tradition

**Response**
```json
{
  "id": "uuid",
  "name": "Catholic Lectionary",
  "abbreviation": "CAT",
  "description": "Roman Catholic three-year Sunday cycle and two-year weekday cycle",
  "startDate": "2024-12-01",
  "endDate": "2025-11-30"
}
```

### Readings

#### GET /api/v1/readings
Get readings for a specific date.

**Query Parameters**
- `date` (required): Date in YYYY-MM-DD format
- `tradition` (optional): Tradition ID or abbreviation (defaults to RCL)

**Example Request**
```
GET /api/v1/readings?date=2025-08-24&tradition=RCL
```

**Response**
```json
{
  "date": "2025-08-24",
  "tradition": "RCL",
  "season": {
    "name": "Season after Pentecost",
    "color": "green"
  },
  "readings": [
    {
      "type": "first",
      "citation": "1 Kings 8:[1, 6, 10-11], 22-30, 41-43",
      "text": "Then Solomon assembled the elders of Israel..."
    },
    {
      "type": "psalm",
      "citation": "Psalm 84",
      "text": "How lovely is your dwelling place, O Lord of hosts..."
    },
    {
      "type": "second",
      "citation": "Ephesians 6:10-20",
      "text": "Finally, be strong in the Lord..."
    },
    {
      "type": "gospel",
      "citation": "John 6:56-69",
      "text": "Those who eat my flesh and drink my blood..."
    }
  ]
}
```

#### GET /api/v1/readings/today
Get today's readings.

**Query Parameters**
- `tradition` (optional): Tradition ID or abbreviation (defaults to RCL)

**Response**
Same as `/api/v1/readings` endpoint.

#### GET /api/v1/readings/range
Get readings for a date range.

**Query Parameters**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `tradition` (optional): Tradition ID or abbreviation (defaults to RCL)

**Example Request**
```
GET /api/v1/readings/range?startDate=2025-08-24&endDate=2025-08-31&tradition=RCL
```

**Response**
```json
[
  {
    "date": "2025-08-24",
    "tradition": "RCL",
    "season": {...},
    "readings": [...]
  },
  {
    "date": "2025-08-25",
    "tradition": "RCL",
    "season": {...},
    "readings": [...]
  }
  // ... more days
]
```

### Calendar

#### GET /api/v1/calendar/current
Get current liturgical calendar information.

**Query Parameters**
- `tradition` (optional): Tradition ID or abbreviation (defaults to RCL)

**Response**
```json
{
  "currentDate": "2025-08-24",
  "liturgicalYear": "C",
  "season": {
    "name": "Season after Pentecost",
    "color": "green",
    "startDate": "2025-06-09",
    "endDate": "2025-11-30"
  },
  "week": 14,
  "dayOfWeek": "Sunday",
  "specialDays": []
}
```

#### GET /api/v1/calendar/:year
Get liturgical calendar for a specific year.

**Parameters**
- `year` (path): Calendar year (e.g., 2025)

**Query Parameters**
- `tradition` (optional): Tradition ID or abbreviation (defaults to RCL)

**Response**
```json
{
  "year": 2025,
  "liturgicalYear": "C",
  "tradition": "RCL",
  "seasons": [
    {
      "name": "Advent",
      "color": "purple",
      "startDate": "2024-12-01",
      "endDate": "2024-12-24"
    },
    {
      "name": "Christmas",
      "color": "white",
      "startDate": "2024-12-25",
      "endDate": "2025-01-05"
    }
    // ... more seasons
  ]
}
```

#### GET /api/v1/calendar/:year/seasons
Get liturgical seasons for a specific year.

**Parameters**
- `year` (path): Calendar year (e.g., 2025)

**Query Parameters**
- `tradition` (optional): Tradition ID or abbreviation (defaults to RCL)

**Response**
```json
[
  {
    "id": "uuid",
    "name": "Advent",
    "color": "purple",
    "startDate": "2024-12-01",
    "endDate": "2024-12-24",
    "weeks": 4
  },
  {
    "id": "uuid",
    "name": "Christmas",
    "color": "white",
    "startDate": "2024-12-25",
    "endDate": "2025-01-05",
    "weeks": 2
  }
  // ... more seasons
]
```

## Error Responses

The API uses standard HTTP status codes and returns errors in a consistent format:

```json
{
  "error": {
    "statusCode": 404,
    "message": "Resource not found",
    "timestamp": "2025-08-24T19:30:00.000Z",
    "details": {} // Only in development mode
  }
}
```

### Common Status Codes

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Data Models

### Tradition
```typescript
{
  id: string;          // UUID
  name: string;        // Full name of the tradition
  abbreviation: string; // Short code (e.g., "RCL")
  description: string; // Detailed description
  startDate: string;   // ISO date
  endDate: string;     // ISO date
}
```

### Reading
```typescript
{
  id: string;          // UUID
  date: string;        // ISO date
  type: string;        // "first", "psalm", "second", "gospel"
  citation: string;    // Scripture reference
  text: string;        // Full text (if available)
  traditionId: string; // Reference to tradition
  seasonId: string;    // Reference to season
}
```

### Season
```typescript
{
  id: string;          // UUID
  name: string;        // Season name
  color: string;       // Liturgical color
  startDate: string;   // ISO date
  endDate: string;     // ISO date
  traditionId: string; // Reference to tradition
}
```

### Special Day
```typescript
{
  id: string;          // UUID
  name: string;        // Name of the special day
  date: string;        // ISO date
  type: string;        // "feast", "fast", "commemoration", etc.
  rank: string;        // "solemnity", "feast", "memorial", etc.
  liturgicalColor: string; // Color for the day
  isMoveable: boolean; // Whether date changes yearly
  traditionId: string; // Reference to tradition
}
```

## Examples

### Get Today's Catholic Readings
```bash
curl "https://lectio-api.org/api/v1/readings/today?tradition=CAT"
```

### Get RCL Readings for Christmas Day
```bash
curl "https://lectio-api.org/api/v1/readings?date=2024-12-25&tradition=RCL"
```

### Get Calendar for 2025
```bash
curl "https://lectio-api.org/api/v1/calendar/2025"
```

### Get All Available Traditions
```bash
curl "https://lectio-api.org/api/v1/traditions"
```

## SDK Support

While we don't currently provide official SDKs, the API follows standard REST conventions and can be easily integrated with any HTTP client library.

### JavaScript/TypeScript Example
```javascript
const API_BASE = 'https://lectio-api.org';

async function getTodaysReadings(tradition = 'RCL') {
  const response = await fetch(`${API_BASE}/api/v1/readings/today?tradition=${tradition}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// Usage
getTodaysReadings('RCL')
  .then(readings => console.log(readings))
  .catch(error => console.error(error));
```

### Python Example
```python
import requests

API_BASE = 'https://lectio-api.org'

def get_todays_readings(tradition='RCL'):
    response = requests.get(f'{API_BASE}/api/v1/readings/today', 
                           params={'tradition': tradition})
    response.raise_for_status()
    return response.json()

# Usage
readings = get_todays_readings('RCL')
print(readings)
```

## Roadmap

Future enhancements planned for the API:

- [ ] Authentication and API keys
- [ ] Webhook support for daily reading notifications
- [ ] Full text search across readings
- [ ] Multiple language support
- [ ] Additional traditions (Orthodox, Anglican, etc.)
- [ ] Liturgical music suggestions
- [ ] Homily/sermon resources
- [ ] Mobile app SDKs

## Support

For issues, feature requests, or questions:
- GitHub: https://github.com/asachs01/lectio-api
- Email: api@lectio-api.org

## License

This API is provided under the MIT License. Scripture texts may have their own copyright restrictions.