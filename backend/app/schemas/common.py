"""Shared schema helpers."""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):  # noqa: UP046  (PEP-695 form not used for Pydantic compat)
    """A paginated result envelope."""

    items: list[T]
    total: int
    page: int
    page_size: int
