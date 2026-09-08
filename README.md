# Test Series Platform

Part 1 implements the admin test creation and management area.

## Start

1. Copy `server/.env.example` to `server/.env` and set MySQL credentials. The configured MySQL user needs permission to create the database and tables.
2. Install each project separately:

   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Start each service in its own terminal:

   ```bash
   cd client && npm run dev
   cd server && npm run dev
   ```

The API automatically creates the configured database and idempotently migrates the `tests` and `questions` tables before it starts. The admin UI runs at `http://localhost:5173`; its API is proxied to Express at port 4001.

Each project has independent package scripts. Run `npm run format:check` and `npm run build` from either `client/` or `server/`.

## Admin access

The API creates an `admins` table and seeds one administrator on its first start. Set `JWT_SECRET` to a long random value before deploying.

- URL: `http://localhost:5173/admin/login`
- Default username: `admin`
- Default password: `Admin@123`

Override the default administrator values with `ADMIN_DEFAULT_USERNAME` and `ADMIN_DEFAULT_PASSWORD` in `server/.env`. Existing accounts are never overwritten by startup migrations.
