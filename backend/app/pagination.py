from dataclasses import dataclass
from typing import Generic, TypeVar

from fastapi import HTTPException, Query, status
from pydantic import BaseModel


T = TypeVar("T")
MAX_PAGE_LIMIT = 500
DEFAULT_PAGE_LIMIT = 50


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    count: int
    skip: int
    limit: int


@dataclass(frozen=True)
class PaginationParams:
    skip: int
    limit: int


def pagination_params(
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1),
) -> PaginationParams:
    if limit > MAX_PAGE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"limit must be less than or equal to {MAX_PAGE_LIMIT}",
        )
    return PaginationParams(skip=skip, limit=limit)


def paginate(data: list[T], params: PaginationParams) -> dict:
    return {
        "data": data,
        "count": len(data),
        "skip": params.skip,
        "limit": params.limit,
    }
