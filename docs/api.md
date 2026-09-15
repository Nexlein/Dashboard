# API Documentation

## System

### `GET /about.json`

Returns the application's supported services and widgets in the format required by Epitech grading.

**Response (200 OK):**
```json
{
  "client": { "host": "127.0.0.1" },
  "server": {
    "current_time": 1690000000,
    "services": [
      {
        "name": "weather",
        "widgets": [ ... ]
      }
    ]
  }
}
```


## Authentication

### `POST /auth/register`

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "userId": 1
}
```

### `POST /auth/login`

Authenticate an existing user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```
