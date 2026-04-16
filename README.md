# Backend Leader

A RESTful banking API built with Node.js, Express, and MongoDB. The service supports user authentication, multi-account management, and a double-entry ledger-based transaction system with idempotency guarantees and email notifications.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Architecture Notes](#architecture-notes)

---

## Features

- User registration and login with JWT authentication (cookie and Bearer token support)
- Secure logout with token blacklisting (auto-expiry after 3 days)
- Multi-account creation per user with ACTIVE / FROZEN / CLOSED status
- Ledger-based balance computation using double-entry bookkeeping
- Idempotent transaction processing to prevent duplicate transfers
- MongoDB session-based atomic transactions
- System account support for seeding initial funds
- Email notifications on registration and transaction events via Gmail OAuth2

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Runtime       | Node.js                             |
| Framework     | Express 5                           |
| Database      | MongoDB with Mongoose 9             |
| Auth          | JSON Web Tokens (jsonwebtoken)      |
| Password Hash | bcryptjs                            |
| Email         | Nodemailer with Gmail OAuth2        |
| Config        | dotenv                              |
| Dev Server    | Nodemon                             |

---

## Project Structure

```
backend-leader/
├── server.js                  # Entry point - connects DB and starts server
├── package.json
└── src/
    ├── app.js                 # Express app setup and route registration
    ├── config/
    │   └── db.js              # MongoDB connection
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── account.controller.js
    │   └── transaction.controller.js
    ├── middleware/
    │   └── auth.middleware.js # JWT verification and system user guard
    ├── models/
    │   ├── user.model.js
    │   ├── account.model.js
    │   ├── transaction.model.js
    │   ├── ledger.model.js
    │   └── blackList.model.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── account.routes.js
    │   └── transaction.routes.js
    └── services/
        └── email.service.js
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A running MongoDB instance (local or Atlas)
- A Gmail account with OAuth2 credentials configured

### Installation

```bash
git clone https://github.com/mandloi15/Backend-Leader.git
cd Backend-Leader
npm install
```

### Running the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server starts on port **3000** by default.

---

## Environment Variables

Create a `.env` file in the root of the project with the following keys:

```env
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

EMAIL_USER=your_gmail_address
CLIENT_ID=your_google_oauth_client_id
CLIENT_SECRET=your_google_oauth_client_secret
REFRESH_TOKEN=your_google_oauth_refresh_token
```

---

## API Reference

### Authentication

#### Register

```
POST /api/auth/register
```

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

Response: User object and JWT token. A welcome email is sent to the registered address.

---

#### Login

```
POST /api/auth/login
```

Request body:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Response: User object and JWT token set as a cookie.

---

#### Logout

```
POST /api/auth/logout
```

Blacklists the current token and clears the cookie. Accepts the token from the cookie or the `Authorization: Bearer <token>` header.

---

### Accounts

All account routes require authentication (cookie or Bearer token).

#### Create Account

```
POST /api/accounts
```

Creates a new account in INR currency for the authenticated user. Accounts default to ACTIVE status.

---

#### Get All Accounts

```
GET /api/accounts
```

Returns all accounts belonging to the authenticated user.

---

#### Get Account Balance

```
GET /api/accounts/balance/:accountId
```

Returns the current balance of the specified account, computed in real time from the ledger.

---

### Transactions

#### Transfer Funds

```
POST /api/transactions
```

Requires authentication. Request body:

```json
{
  "fromAccount": "<account_id>",
  "toAccount": "<account_id>",
  "amount": 500,
  "idempotencyKey": "<unique_key>"
}
```

The `idempotencyKey` must be unique per intended transfer. Reusing a key with a completed transaction returns the original result without processing again.

Transfer flow:
1. Validate all required fields
2. Check idempotency key - return early if already processed
3. Verify both accounts are ACTIVE
4. Compute sender balance from ledger
5. Reject if insufficient funds
6. Open a MongoDB session and start a transaction
7. Create transaction record with PENDING status
8. Create DEBIT ledger entry for the sender
9. Create CREDIT ledger entry for the recipient
10. Mark transaction as COMPLETED and commit session
11. Send a notification email to the sender

---

#### Seed Initial Funds (System Only)

```
POST /api/transactions/system/initial-funds
```

Restricted to system users. Transfers funds from the system account to a specified user account. Used to seed balances during development or onboarding.

Request body:

```json
{
  "toAccount": "<account_id>",
  "amount": 10000,
  "idempotencyKey": "<unique_key>"
}
```

---

## Data Models

### User

| Field      | Type    | Notes                            |
|------------|---------|----------------------------------|
| email      | String  | Unique, lowercase, validated     |
| name       | String  | Required                         |
| password   | String  | Hashed with bcrypt, hidden       |
| systemUser | Boolean | Immutable, hidden from responses |

Passwords are hashed automatically before saving via a Mongoose pre-save hook.

---

### Account

| Field    | Type     | Notes                            |
|----------|----------|----------------------------------|
| user     | ObjectId | Reference to User                |
| status   | String   | ACTIVE / FROZEN / CLOSED         |
| currency | String   | Defaults to INR                  |

Balance is not stored as a field. It is derived at query time by aggregating all ledger entries associated with the account.

---

### Transaction

| Field          | Type     | Notes                                      |
|----------------|----------|--------------------------------------------|
| fromAccount    | ObjectId | Reference to source account                |
| toAccount      | ObjectId | Reference to destination account           |
| amount         | Number   | Must be non-negative                       |
| status         | String   | PENDING / COMPLETED / FAILED / REVERSED    |
| idempotencyKey | String   | Unique per transaction attempt             |

---

### Ledger

| Field       | Type     | Notes                         |
|-------------|----------|-------------------------------|
| account     | ObjectId | Account this entry affects    |
| transaction | ObjectId | Parent transaction            |
| amount      | Number   | Entry amount                  |
| type        | String   | CREDIT or DEBIT               |

Ledger entries are immutable. All update, delete, and replace operations are blocked at the schema level via Mongoose pre-hooks.

---

### Token Blacklist

| Field | Type   | Notes                               |
|-------|--------|-------------------------------------|
| token | String | Unique, auto-expires after 3 days   |

Uses a MongoDB TTL index to automatically remove expired entries.

---

## Architecture Notes

**Ledger-based balances.** Account balances are never stored directly. Each debit and credit is recorded as an immutable ledger entry. The current balance is the sum of all credits minus the sum of all debits, computed via a MongoDB aggregation pipeline. This design provides a full audit trail and prevents balance drift.

**Idempotent transactions.** Every transfer requires a client-supplied `idempotencyKey`. Before processing, the system checks if a transaction with that key already exists and returns the appropriate response based on its current status. This ensures that network retries do not result in duplicate transfers.

**Atomic writes.** The full transfer flow (transaction creation, debit ledger entry, credit ledger entry, status update) runs inside a single MongoDB session. If any step fails, the entire operation is rolled back.

**Token blacklisting.** On logout, the current JWT is stored in a MongoDB collection with a TTL index. Subsequent requests using a blacklisted token are rejected in middleware before reaching any route handler.

---

## License

ISC
