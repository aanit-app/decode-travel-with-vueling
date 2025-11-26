# API Routes

This directory contains all API routes for the application.

## Structure

API routes are organized by feature/resource. Each route is a folder containing a `route.ts` file that exports HTTP method handlers.

## Example Structure

```
app/api/
  ├── health/
  │   └── route.ts          # GET /api/health
  ├── example/
  │   └── route.ts          # GET, POST /api/example
  └── users/
      └── route.ts          # GET, POST /api/users
      └── [id]/
          └── route.ts      # GET, PUT, DELETE /api/users/:id
```

## HTTP Methods

Each route file can export async functions for different HTTP methods:
- `GET` - Retrieve data
- `POST` - Create data
- `PUT` - Update data
- `PATCH` - Partial update
- `DELETE` - Delete data

## Example Usage

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Handle GET request
  return NextResponse.json({ users: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Handle POST request
  return NextResponse.json({ success: true }, { status: 201 });
}
```

## Dynamic Routes

For dynamic routes, use square brackets in the folder name:
- `app/api/users/[id]/route.ts` → `/api/users/:id`
- `app/api/posts/[slug]/route.ts` → `/api/posts/:slug`

## Route Handlers

Route handlers receive a `NextRequest` object and return a `NextResponse` object.

