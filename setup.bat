@echo off
echo ============================================
echo  PHUC TEA - THE HOA Setup Script
echo ============================================
echo.

echo [1/4] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 (echo ERROR: Backend install failed & pause & exit /b 1)
echo Backend dependencies installed OK.
echo.

echo [2/4] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (echo ERROR: Prisma generate failed & pause & exit /b 1)
echo.

echo [3/4] Running database migration...
call npx prisma migrate dev --name init
if errorlevel 1 (echo ERROR: Migration failed. Check PostgreSQL is running with correct credentials & pause & exit /b 1)
echo.

echo [4/4] Seeding database with sample data...
call npx ts-node prisma/seed.ts
if errorlevel 1 (echo ERROR: Seed failed & pause & exit /b 1)
echo.

echo [5/5] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (echo ERROR: Frontend install failed & pause & exit /b 1)
echo.

echo ============================================
echo  Setup complete!
echo.
echo  Start backend:  cd backend ^& npm run start:dev
echo  Start frontend: cd frontend ^& npm run dev
echo.
echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:3000
echo  Swagger:  http://localhost:3001/api/docs
echo ============================================
pause
