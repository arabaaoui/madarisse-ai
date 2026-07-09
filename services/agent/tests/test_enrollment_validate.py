"""
Tests TDD pour propose_enrollment_validate.
Ces tests doivent ÉCHOUER avant l'implémentation de T009.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from core.auth import AgentContext


@pytest.fixture
def ctx():
    return AgentContext(
        user_id="user-1",
        tenant_id="tenant-abc",
        role="secretary",
        user_jwt="fake-jwt",
        email="sec@school.com",
    )


@pytest.fixture
def ctx_other():
    return AgentContext(
        user_id="user-2",
        tenant_id="tenant-xyz",
        role="secretary",
        user_jwt="other-jwt",
        email="other@school.com",
    )


@pytest.mark.asyncio
async def test_propose_enrollment_validate_returns_action_log_id(ctx):
    """Le tool retourne un action_log_id valide pour un lot d'inscriptions."""
    from tools.enrollment_tools import propose_enrollment_validate

    enrollment_ids = ["enroll-1", "enroll-2"]

    mock_client = MagicMock()
    # Simule la récupération des enrollments pour le preview
    mock_client.table.return_value.select.return_value.in_.return_value\
        .eq.return_value.execute.return_value.data = [
        {
            "id": "enroll-1",
            "students": {"first_name": "Yassine", "last_name": "Alaoui"},
            "classes": {"name": "6ème A"},
        },
        {
            "id": "enroll-2",
            "students": {"first_name": "Sara", "last_name": "Bennani"},
            "classes": {"name": "5ème B"},
        },
    ]

    with patch("tools.enrollment_tools.get_supabase_client_for_user", return_value=mock_client), \
         patch("tools.enrollment_tools.propose_action", new_callable=AsyncMock, return_value="action-log-999"):
        result = await propose_enrollment_validate(enrollment_ids=enrollment_ids, ctx=ctx)

    assert result["action_log_id"] == "action-log-999"
    assert result["canvas_type"] == "enrollment.validate"
    assert result["preview"]["count"] == 2


@pytest.mark.asyncio
async def test_propose_enrollment_validate_payload_contains_ids(ctx):
    """Le payload transmis à propose_action contient bien les enrollment_ids."""
    from tools.enrollment_tools import propose_enrollment_validate

    enrollment_ids = ["enroll-a", "enroll-b", "enroll-c"]

    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.in_.return_value\
        .eq.return_value.execute.return_value.data = []

    captured_payload = {}

    async def capture_propose(action_type, payload, snapshot_before, agent_id, ctx):
        captured_payload.update(payload)
        return "action-log-capture"

    with patch("tools.enrollment_tools.get_supabase_client_for_user", return_value=mock_client), \
         patch("tools.enrollment_tools.propose_action", side_effect=capture_propose):
        await propose_enrollment_validate(enrollment_ids=enrollment_ids, ctx=ctx)

    assert captured_payload["enrollment_ids"] == enrollment_ids
    assert captured_payload["count"] == 3


@pytest.mark.asyncio
async def test_propose_enrollment_validate_empty_list_raises(ctx):
    """Une liste vide doit lever une erreur."""
    from tools.enrollment_tools import propose_enrollment_validate

    with pytest.raises(ValueError, match="enrollment_ids"):
        await propose_enrollment_validate(enrollment_ids=[], ctx=ctx)


@pytest.mark.asyncio
async def test_propose_enrollment_validate_action_type(ctx):
    """L'action_type doit être 'enrollment.validate'."""
    from tools.enrollment_tools import propose_enrollment_validate

    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.in_.return_value\
        .eq.return_value.execute.return_value.data = []

    captured_type = {}

    async def capture_propose(action_type, payload, snapshot_before, agent_id, ctx):
        captured_type["action_type"] = action_type
        return "action-log-type"

    with patch("tools.enrollment_tools.get_supabase_client_for_user", return_value=mock_client), \
         patch("tools.enrollment_tools.propose_action", side_effect=capture_propose):
        await propose_enrollment_validate(enrollment_ids=["enroll-x"], ctx=ctx)

    assert captured_type["action_type"] == "enrollment.validate"
