.PHONY: setup start-backend start-frontend test dev seed clean

setup:
	python -m venv backend/venv
	.\backend\venv\Scripts\pip install -r backend/requirements.txt
	cd frontend && npm install

start-backend:
	.\backend\venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000

start-frontend:
	cd frontend && npm run dev

dev:
	@echo "To run both concurrently in separate terminals:"
	@echo "Terminal 1: make start-backend"
	@echo "Terminal 2: make start-frontend"

test:
	.\backend\venv\Scripts\pytest backend/tests

seed:
	.\backend\venv\Scripts\python -m app.services.seed_service

clean:
	rmdir /s /q backend\__pycache__ 2>nul || true
	rmdir /s /q frontend\.next 2>nul || true
