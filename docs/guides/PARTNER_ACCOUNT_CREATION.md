# Creating Partner Accounts

Partner accounts allow 3rd party integrations to access the DCMS API for creating bookings and managing customers.

## Method 1: Using the API Endpoint (cURL)

### Create a Partner Account

**Endpoint:** `POST http://localhost:3003/api/partners`

**Required Fields:**
- `name` - Partner contact name (string)
- `companyName` - Company/business name (string)
- `contactEmail` - Email address (string, must be unique)

**Optional Fields:**
- `contactPhone` - Phone number (string)
- `webhookUrl` - Webhook URL for notifications (string)
- `commissionRate` - Commission percentage as decimal (number, e.g., 0.15 for 15%)
- `allowedLocations` - Array of location UUIDs the partner can access (string[])
- `settings` - Additional settings (JSON object)

### Example cURL Request

```bash
curl -X POST http://localhost:3003/api/partners \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "companyName": "Dive Booking Partner Inc",
    "contactEmail": "john@divepartner.com",
    "contactPhone": "+34 123 456 789",
    "webhookUrl": "https://divepartner.com/webhooks/dcms",
    "commissionRate": 0.10,
    "allowedLocations": ["550e8400-e29b-41d4-a716-446655440001"]
  }'
```

### Example Response

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "John Doe",
  "company_name": "Dive Booking Partner Inc",
  "contact_email": "john@divepartner.com",
  "contact_phone": "+34 123 456 789",
  "webhook_url": "https://divepartner.com/webhooks/dcms",
  "commission_rate": "0.10",
  "allowed_locations": ["550e8400-e29b-41d4-a716-446655440001"],
  "api_key": "dcms_partner_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "api_secret_hash": "$2b$10$hashed...",
  "apiSecret": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "is_active": true,
  "settings": {},
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

⚠️ **IMPORTANT:** Save the `apiSecret` immediately! It's only shown once when the account is created. You'll need both `api_key` and `apiSecret` to authenticate API requests.

## Method 2: Using Swagger UI

1. Start the backend server (if not running):
   ```bash
   cd backend
   npm run start:dev
   ```

2. Open Swagger UI in your browser:
   ```
   http://localhost:3003/api
   ```

3. Find the `partners` section in the Swagger documentation

4. Click on `POST /api/partners`

5. Click "Try it out"

6. Fill in the required fields in the request body:
   ```json
   {
     "name": "John Doe",
     "companyName": "Dive Booking Partner Inc",
     "contactEmail": "john@divepartner.com",
     "commissionRate": 0.10,
     "allowedLocations": ["550e8400-e29b-41d4-a716-446655440001"]
   }
   ```

7. Click "Execute"

8. Save the `apiSecret` from the response!

## Method 3: Using a Script

Create a file `create-partner.js`:

```javascript
const fetch = require('node-fetch');

async function createPartner() {
  const response = await fetch('http://localhost:3003/api/partners', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'John Doe',
      companyName: 'Dive Booking Partner Inc',
      contactEmail: 'john@divepartner.com',
      contactPhone: '+34 123 456 789',
      commissionRate: 0.10,
      allowedLocations: ['550e8400-e29b-41d4-a716-446655440001'] // Optional: location UUIDs
    }),
  });

  const partner = await response.json();
  
  console.log('Partner created successfully!');
  console.log('API Key:', partner.api_key);
  console.log('API Secret:', partner.apiSecret);
  console.log('\n⚠️  SAVE THE API SECRET NOW - IT WON\'T BE SHOWN AGAIN!');
  
  return partner;
}

createPartner().catch(console.error);
```

## Getting Location UUIDs

To get the list of available locations and their UUIDs:

```bash
curl http://localhost:3003/api/locations
```

Or visit: `http://localhost:3003/api/locations`

## Using the Partner API

Once you have the API key and secret, use them in API requests:

```bash
curl -X GET http://localhost:3003/api/partner/bookings \
  -H "X-API-Key: dcms_partner_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "X-API-Secret: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

## Regenerating API Keys

If you need to regenerate the API key and secret:

```bash
curl -X POST http://localhost:3003/api/partners/{partner-id}/regenerate-api-key
```

The response will include the new `api_key` and `apiSecret` (save it immediately!).

## Available Partner Endpoints

- `GET /api/partners` - List all partners (admin only)
- `GET /api/partners/:id` - Get partner details
- `POST /api/partners` - Create new partner
- `PUT /api/partners/:id` - Update partner
- `DELETE /api/partners/:id` - Delete partner
- `POST /api/partners/:id/regenerate-api-key` - Regenerate API key

- `GET /api/partner/customers` - Get partner's customers (requires API key)
- `POST /api/partner/customers` - Create customer (requires API key)
- `GET /api/partner/bookings` - Get partner's bookings (requires API key)
- `POST /api/partner/bookings` - Create booking (requires API key)
- `GET /api/partner/availability` - Check availability (requires API key)

