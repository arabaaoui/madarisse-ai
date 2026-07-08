"""
Tests de sécurité RLS — Phase 0.
Vérifie que les tools rejettent les accès inter-tenant.

Ces tests nécessitent un Supabase de test (staging ou local) avec :
- Tenant A : tenant_id = "tenant-a-uuid"
- Tenant B : tenant_id = "tenant-b-uuid"
- Un utilisateur de A ne doit pas voir les données de B.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from core.auth import AgentContext


def make_ctx(tenant_id: str, user_id: str = "user-123") -> AgentContext:
    return AgentContext(
        user_id=user_id,
        tenant_id=tenant_id,
        role="secretariat",
        user_jwt="fake-jwt-for-tests",
        email="test@school.com",
    )


class TestPaymentStatsRLS:
    """get_payment_stats doit filtrer par tenant_id via RLS."""

    @patch("tools.payment_tools.get_supabase_client_for_user")
    def test_stats_filtered_to_tenant(self, mock_client_factory):
        """Le RPC est appelé avec le bon tenant_id."""
        from tools.payment_tools import get_payment_stats

        mock_client = MagicMock()
        mock_client.rpc.return_value.execute.return_value.data = []
        mock_client_factory.return_value = mock_client

        ctx = make_ctx("tenant-a")
        result = get_payment_stats(class_id=None, ctx=ctx)

        # Vérifie que le RPC est appelé avec p_tenant_id du bon tenant
        mock_client.rpc.assert_called_once()
        call_args = mock_client.rpc.call_args
        assert call_args[0][1]["p_tenant_id"] == "tenant-a"
        assert result["total_attendu"] == 0

    @patch("tools.payment_tools.get_supabase_client_for_user")
    def test_cross_tenant_impossible(self, mock_client_factory):
        """Un utilisateur de tenant-a ne peut pas spécifier tenant-b."""
        from tools.payment_tools import get_payment_stats

        mock_client = MagicMock()
        mock_client.rpc.return_value.execute.return_value.data = []
        mock_client_factory.return_value = mock_client

        ctx = make_ctx("tenant-a")
        # Même si on passe class_id d'un autre tenant, le filtre tenant vient du ctx
        result = get_payment_stats(class_id="class-from-tenant-b", ctx=ctx)

        call_args = mock_client.rpc.call_args
        # tenant_id vient du ctx, pas du paramètre class_id
        assert call_args[0][1]["p_tenant_id"] == "tenant-a"


class TestUnpaidStudentsRLS:
    """get_unpaid_students doit filtrer par tenant_id via RLS."""

    @patch("tools.payment_tools.get_supabase_client_for_user")
    def test_only_tenant_students(self, mock_client_factory):
        from tools.payment_tools import get_unpaid_students

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.neq.return_value = mock_query
        mock_query.lt.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.execute.return_value.data = []

        mock_client = MagicMock()
        mock_client.table.return_value = mock_query
        mock_client_factory.return_value = mock_client

        ctx = make_ctx("tenant-a")
        result = get_unpaid_students(class_id=None, overdue_only=False, ctx=ctx)

        # Vérifie que eq("tenant_id", "tenant-a") est appelé
        eq_calls = [str(call) for call in mock_query.eq.call_args_list]
        assert any("tenant-a" in call for call in eq_calls)
        assert result == []


class TestHITLActionLog:
    """propose_action doit créer un log avec le bon tenant_id."""

    @pytest.mark.asyncio
    @patch("core.hitl.get_supabase_system_client")
    async def test_action_log_tenant_isolation(self, mock_system_client):
        from core.hitl import propose_action

        mock_client = MagicMock()
        mock_client.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "log-uuid-123"}
        ]
        mock_system_client.return_value = mock_client

        ctx = make_ctx("tenant-a")
        action_log_id = await propose_action(
            action_type="enrollment.create",
            payload={"student_id": "s1", "class_id": "c1"},
            snapshot_before=None,
            agent_id="school-agent/enrollment",
            ctx=ctx,
        )

        # Vérifie que le log est créé avec le bon tenant_id
        insert_call = mock_client.table.return_value.insert.call_args[0][0]
        assert insert_call["tenant_id"] == "tenant-a"
        assert insert_call["user_id"] == "user-123"
        assert action_log_id == "log-uuid-123"
