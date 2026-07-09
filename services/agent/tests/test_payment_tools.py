"""
Tests TDD pour propose_payment_record.
Doivent ÉCHOUER avant l'implémentation de T003.
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


@pytest.mark.asyncio
async def test_propose_payment_record_returns_action_log_id(ctx):
    """Le tool retourne un action_log_id pour un paiement valide."""
    from tools.payment_tools import propose_payment_record

    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.eq.return_value\
        .eq.return_value.single.return_value.execute.return_value.data = {
        "id": "item-1",
        "amount": 800,
        "paid_amount": 0,
        "remaining_amount": 800,
        "students": {"first_name": "Yassine", "last_name": "Alaoui"},
    }

    with patch("tools.payment_tools.get_supabase_client_for_user", return_value=mock_client), \
         patch("tools.payment_tools.propose_action", new_callable=AsyncMock, return_value="action-log-pay-1"):
        result = await propose_payment_record(
            student_id="student-1",
            payment_item_id="item-1",
            amount=800,
            payment_method="cash",
            ctx=ctx,
        )

    assert result["action_log_id"] == "action-log-pay-1"
    assert result["canvas_type"] == "payment.record"
    assert result["preview"]["amount"] == 800
    assert result["preview"]["student_name"] == "Yassine Alaoui"


@pytest.mark.asyncio
async def test_propose_payment_record_action_type(ctx):
    """L'action_type transmis à propose_action est 'payment.record'."""
    from tools.payment_tools import propose_payment_record

    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.eq.return_value\
        .eq.return_value.single.return_value.execute.return_value.data = {
        "id": "item-2",
        "amount": 500,
        "paid_amount": 0,
        "remaining_amount": 500,
        "students": {"first_name": "Sara", "last_name": "Bennani"},
    }

    captured = {}

    async def capture(action_type, payload, snapshot_before, agent_id, ctx):
        captured["action_type"] = action_type
        captured["payload"] = payload
        return "action-log-type"

    with patch("tools.payment_tools.get_supabase_client_for_user", return_value=mock_client), \
         patch("tools.payment_tools.propose_action", side_effect=capture):
        await propose_payment_record(
            student_id="student-2",
            payment_item_id="item-2",
            amount=500,
            payment_method="transfer",
            ctx=ctx,
        )

    assert captured["action_type"] == "payment.record"
    assert captured["payload"]["student_id"] == "student-2"
    assert captured["payload"]["amount"] == 500
    assert captured["payload"]["payment_method"] == "transfer"


@pytest.mark.asyncio
async def test_propose_payment_record_overpayment_warning(ctx):
    """Un trop-perçu génère un warning dans le preview (pas une erreur)."""
    from tools.payment_tools import propose_payment_record

    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.eq.return_value\
        .eq.return_value.single.return_value.execute.return_value.data = {
        "id": "item-3",
        "amount": 800,
        "paid_amount": 0,
        "remaining_amount": 800,
        "students": {"first_name": "Omar", "last_name": "Chraibi"},
    }

    with patch("tools.payment_tools.get_supabase_client_for_user", return_value=mock_client), \
         patch("tools.payment_tools.propose_action", new_callable=AsyncMock, return_value="action-log-over"):
        result = await propose_payment_record(
            student_id="student-3",
            payment_item_id="item-3",
            amount=1000,  # > remaining_amount 800
            payment_method="cash",
            ctx=ctx,
        )

    assert result["preview"].get("overpayment_warning") is True
    assert result["preview"]["excess"] == 200


@pytest.mark.asyncio
async def test_propose_payment_record_invalid_method_raises(ctx):
    """Un mode de paiement invalide lève une ValueError."""
    from tools.payment_tools import propose_payment_record

    with pytest.raises(ValueError, match="payment_method"):
        await propose_payment_record(
            student_id="s",
            payment_item_id="i",
            amount=100,
            payment_method="bitcoin",  # invalide
            ctx=ctx,
        )
