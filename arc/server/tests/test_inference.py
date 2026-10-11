"""The OpenAI-compatible client against a fake server: streaming, and rate limits on hosted free plans."""

import asyncio

import httpx
import pytest

from app.inference.base import InferenceError
from app.inference.openai_compatible import OpenAICompatibleBackend

STREAM = 'data: {"choices":[{"delta":{"content":"Hi "}}]}\n\ndata: {"choices":[{"delta":{"content":"there"}}]}\n\ndata: [DONE]\n\n'


def backend(*responses: httpx.Response) -> tuple[OpenAICompatibleBackend, list]:
    queue, seen = list(responses), []

    def handle(request):
        seen.append(request)
        return queue.pop(0)

    b = OpenAICompatibleBackend("https://models.test", model="m", label="test")
    b.client = httpx.AsyncClient(transport=httpx.MockTransport(handle))
    return b, seen


def answer(b) -> str:
    return asyncio.run(b.generate([{"role": "user", "content": "hi"}], max_tokens=10, temperature=0))


def test_streams_the_answer():
    b, _ = backend(httpx.Response(200, text=STREAM))
    assert answer(b) == "Hi there"


def test_short_rate_limit_is_waited_out():
    b, seen = backend(httpx.Response(429, headers={"retry-after": "0"}), httpx.Response(200, text=STREAM))
    assert answer(b) == "Hi there" and len(seen) == 2


@pytest.mark.parametrize("headers", [{"retry-after": "60"}, {}])
def test_long_or_unknown_rate_limit_is_reported_as_busy(headers):
    b, seen = backend(httpx.Response(429, headers=headers, text="slow down"))
    with pytest.raises(InferenceError) as e:
        answer(b)
    assert e.value.busy and len(seen) == 1
