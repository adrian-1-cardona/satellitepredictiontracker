SATELLITE TRACKER BACKEND
=========================

This repository now contains the implemented backend stack.

READ FIRST
----------

1. START_HERE.md
   Short orientation and fastest commands.

2. README.md
   Full backend overview, endpoint list, and testing notes.

3. GETTING_STARTED.md
   Setup commands and API workflow examples.

4. VSCODE_SETUP.md
   VSCode extensions, debugger, SQLTools, and REST Client setup.

5. IMPLEMENTATION_SUMMARY.md
   What was built and where the important code lives.

FAST START
----------

cp .env.example .env
docker-compose up --build

Then open:

http://localhost:8000/docs

LOCAL PYTHON START
------------------

python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m uvicorn app.main:app --reload

Worker:

celery -A app.tasks:celery_app worker --loglevel=info

Scheduler:

celery -A app.tasks:celery_app beat --loglevel=info

TEST
----

pytest

NOT INCLUDED IN THIS PASS
-------------------------

- Frontend application
- Kubernetes manifests
- Real email/SMS provider integration

