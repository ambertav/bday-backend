# Backend API Documentation

## Overview
This document outlines the available API endpoints in our backend service. All routes return an HTTPError with relevant status and a json body containing `message` on error.

Server runs on PORT 3010 by default.

---

## Authentication

### Signup - Create a new user

- **Endpoint**: `POST /api/users`
- **Request Body**: JSON object containing:
  - `email` (required, string)
  - `password` (required, string)
  - `name` (required, string)
  - `dob` (required, Date - yyyy-mm-dd)
  - `gender` (required, sring - one of "female", "male", "other")
  - `tel` (optional, number)
- **Response**: JSON object containing:
  - `accessToken`
- **Side Effect**: Creates an empty UserProfile

### Login - Authenticate an existing user

- **Endpoint**: `POST /api/users/login`
- **Request Body**: JSON object containing:
  - `email` (required, string)
  - `password` (required, string)
- **Response**: JSON object containing:
  - `accessToken`

---

## Protected Routes
**Note**: All the routes below expect an `Authorization` header with a Bearer token.

### Update Password

- **Endpoint**: `PUT /api/users/password`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `oldPassword` (required, string)
  - `newPassword` (required, string)

### Update User Information

- **Endpoint**: `PUT /api/users`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `name` (optional, string)
  - `tel` (optional, number)
  - `dob` (optional, Date)
  - `gender` (optional, sring - one of "female", "male", "other")

### Delete User

- **Endpoint**: `DELETE /api/users`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `confirmationToken`

### Confirm User Deletion

- **Endpoint**: `POST /api/confirm-delete`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `confirmationToken` (required, string)
- **Side Effect**: Deletes associated UserProfile

## User Profile

### Update Profile Details

- **Endpoint**: `PUT /api/users/profile`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing (any of):
  - `interests` (optional, string[])
  - `bio` (optional, string)
- **Response**: JSON object containing:
  - `message: "User profile updated"`
  - `profile`

### Get User Profile

- **Endpoint**: `GET /api/users/profile`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `profile`

### Upload User Photo

- **Endpoint**: `POST /api/users/profile/upload`
- **Authorization**: Bearer Token
- **Request Body**: Form-data containing:
  - `photo` (required, File)
- **Response**: JSON object containing:
  - `message: "Photo uploaded successfully"`

Note: The photo upload utilizes AWS S3 for storage.