from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine: Engine
SessionLocal: sessionmaker[Session]


def _engine_kwargs(database_url: str) -> dict:
    settings = get_settings()
    kwargs: dict = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs.update(
            {
                "pool_size": settings.db_pool_size,
                "max_overflow": settings.db_max_overflow,
                "pool_recycle": settings.db_pool_recycle,
                "echo_pool": settings.debug,
            }
        )
        if database_url.startswith("postgresql"):
            kwargs["connect_args"] = {"connect_timeout": settings.db_connect_timeout}
    return kwargs


def configure_database(database_url: str | None = None) -> None:
    global engine, SessionLocal
    url = database_url or get_settings().database_url
    engine = create_engine(url, **_engine_kwargs(url))
    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)


configure_database()
