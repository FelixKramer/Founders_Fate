"""Progress queue tests."""
from __future__ import annotations

import json

from simulation.progress import cleanup, push_done, push_error, push_event, stream_events


def _collect_events(sim_id: str, timeout: float = 1.0) -> list[str]:
    """Collect all events from stream_events, skipping keepalives."""
    events = []
    for raw in stream_events(sim_id, timeout=timeout):
        if raw.startswith(": keepalive"):
            continue
        events.append(raw)
    return events


def test_push_and_stream_single_event() -> None:
    sim_id = "test_progress_single_001"
    push_event(sim_id, "progress", {"pct": 50})
    push_done(sim_id, {"result": "ok"})

    events = _collect_events(sim_id)
    cleanup(sim_id)

    assert len(events) == 2
    first = json.loads(events[0].removeprefix("data: ").strip())
    assert first["event"] == "progress"
    assert first["data"]["pct"] == 50


def test_push_and_stream_multiple_progress_events() -> None:
    sim_id = "test_progress_multi_002"
    push_event(sim_id, "progress", {"pct": 10})
    push_event(sim_id, "progress", {"pct": 50})
    push_done(sim_id, {"result": "ok"})

    events = _collect_events(sim_id)
    cleanup(sim_id)

    assert len(events) == 3
    for raw in events:
        assert raw.startswith("data: ")


def test_stream_terminates_after_done_event() -> None:
    sim_id = "test_progress_done_003"
    push_done(sim_id, {"result": "done"})
    push_event(sim_id, "progress", {"pct": 99})  # Should not be streamed

    events = _collect_events(sim_id)
    cleanup(sim_id)

    # Only the done event should be in the stream (stream breaks after done)
    assert len(events) == 1
    parsed = json.loads(events[0].removeprefix("data: ").strip())
    assert parsed["event"] == "done"


def test_done_event_contains_result_data() -> None:
    sim_id = "test_progress_done_data_004"
    result_payload = {"simulation_id": "sim_xyz", "confidence": 0.85}
    push_done(sim_id, result_payload)

    events = _collect_events(sim_id)
    cleanup(sim_id)

    assert len(events) == 1
    parsed = json.loads(events[0].removeprefix("data: ").strip())
    assert parsed["event"] == "done"
    assert parsed["data"]["simulation_id"] == "sim_xyz"
    assert parsed["data"]["confidence"] == 0.85


def test_push_error_event() -> None:
    sim_id = "test_progress_error_005"
    push_error(sim_id, "internal_error", "something broke")

    events = _collect_events(sim_id)
    cleanup(sim_id)

    assert len(events) == 1
    parsed = json.loads(events[0].removeprefix("data: ").strip())
    assert parsed["event"] == "error"
    assert parsed["data"]["code"] == "internal_error"
    assert "something broke" in parsed["data"]["detail"]


def test_stream_terminates_after_error_event() -> None:
    sim_id = "test_progress_error_term_006"
    push_error(sim_id, "upstream_unavailable", "mirofish down")
    push_event(sim_id, "progress", {"pct": 99})  # Should not be yielded after error

    events = _collect_events(sim_id)
    cleanup(sim_id)

    assert len(events) == 1
    parsed = json.loads(events[0].removeprefix("data: ").strip())
    assert parsed["event"] == "error"


def test_events_have_timestamp() -> None:
    sim_id = "test_progress_ts_007"
    push_event(sim_id, "progress", {"pct": 25})
    push_done(sim_id, {})

    events = _collect_events(sim_id)
    cleanup(sim_id)

    for raw in events:
        parsed = json.loads(raw.removeprefix("data: ").strip())
        assert "ts" in parsed
        assert isinstance(parsed["ts"], float)
        assert parsed["ts"] > 0


def test_cleanup_removes_queue() -> None:
    sim_id = "test_progress_cleanup_008"
    push_event(sim_id, "progress", {"pct": 10})
    cleanup(sim_id)

    # After cleanup, streaming should be empty (queue gone, no events)
    # Re-create and push done immediately to avoid hanging
    push_done(sim_id, {"result": "clean"})
    events = _collect_events(sim_id)
    cleanup(sim_id)

    # The done event from the new queue should be present
    assert len(events) == 1


def test_multiple_sim_ids_are_isolated() -> None:
    sim_a = "test_progress_iso_a_009"
    sim_b = "test_progress_iso_b_009"

    push_event(sim_a, "progress", {"pct": 10, "sim": "a"})
    push_event(sim_b, "progress", {"pct": 20, "sim": "b"})
    push_done(sim_a, {"result": "a_done"})
    push_done(sim_b, {"result": "b_done"})

    events_a = _collect_events(sim_a)
    events_b = _collect_events(sim_b)
    cleanup(sim_a)
    cleanup(sim_b)

    assert len(events_a) == 2
    assert len(events_b) == 2

    parsed_a = [json.loads(e.removeprefix("data: ").strip()) for e in events_a]
    parsed_b = [json.loads(e.removeprefix("data: ").strip()) for e in events_b]

    assert parsed_a[0]["data"]["sim"] == "a"
    assert parsed_b[0]["data"]["sim"] == "b"
