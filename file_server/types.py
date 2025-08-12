from typing import TypedDict

class Metadata(TypedDict):
    filename: str
    originalName: str
    size: int
    uploadDate: str
    origin: str
    originAlias: str
    clientIP: str

__all__ = ["Metadata"]