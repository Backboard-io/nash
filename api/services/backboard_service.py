from collections.abc import AsyncIterator
from typing import Any

from backboard import BackboardClient

from api.config import settings

_client: BackboardClient | None = None


def get_client() -> BackboardClient:
    global _client
    if _client is None:
        _client = BackboardClient(api_key=settings.backboard_api_key, timeout=120)
    return _client


def parse_model_spec(model: str | None) -> tuple[str | None, str | None]:
    """Split a proxy-style model string into provider and model name."""
    if not model:
        return None, None

    value = model.strip()
    if not value:
        return None, None

    if "/" not in value:
        return None, value

    provider, *rest = value.split("/")
    model_name = "/".join(rest).strip()
    return (provider.strip() or None), (model_name or None)


async def stream_message_proxy_compatible(
    thread_id: str,
    *,
    content: str,
    model: str | None = None,
    memory: str | None = None,
    web_search: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Send a Backboard message using the same form fields as the TS proxy."""
    client = get_client()
    llm_provider, model_name = parse_model_spec(model)
    form_data: dict[str, str] = {
        "stream": "true",
        "content": content,
    }

    if llm_provider:
        form_data["llm_provider"] = llm_provider
    if model_name:
        form_data["model_name"] = model_name
    if memory:
        form_data["memory"] = memory
    if web_search:
        form_data["web_search"] = web_search

    return client._parse_streaming_response_iter(
        method="POST",
        endpoint=f"/threads/{thread_id}/messages",
        data=form_data,
    )
