"""
Tests pour enrollment_tools — search_student + isolation tenant.
Écrits AVANT implémentation (test-first, constitution §4).
"""

import pytest
from unittest.mock import MagicMock, patch
from core.auth import AgentContext


def make_ctx(tenant_id: str) -> AgentContext:
    return AgentContext(
        user_id="user-1",
        tenant_id=tenant_id,
        role="secretariat",
        user_jwt="fake-jwt",
        email="sec@school.ma",
    )


class TestSearchStudentIsolation:
    @patch("tools.enrollment_tools.get_supabase_client_for_user")
    def test_search_filters_by_tenant(self, mock_factory):
        """search_student filtre par tenant_id du ctx."""
        from tools.enrollment_tools import search_student

        mock_q = MagicMock()
        mock_q.select.return_value = mock_q
        mock_q.eq.return_value = mock_q
        mock_q.or_.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.execute.return_value.data = []
        mock_factory.return_value = MagicMock(table=MagicMock(return_value=mock_q))

        result = search_student("Yassine", ctx=make_ctx("tenant-a"))

        eq_calls = [c.args for c in mock_q.eq.call_args_list]
        assert any(c == ("tenant_id", "tenant-a") for c in eq_calls)
        assert result == []

    @patch("tools.enrollment_tools.get_supabase_client_for_user")
    def test_cross_tenant_returns_empty(self, mock_factory):
        """Un ctx tenant-b ne peut pas voir les élèves de tenant-a (RLS Supabase)."""
        from tools.enrollment_tools import search_student

        mock_q = MagicMock()
        mock_q.select.return_value = mock_q
        mock_q.eq.return_value = mock_q
        mock_q.or_.return_value = mock_q
        mock_q.limit.return_value = mock_q
        # RLS retourne [] pour un autre tenant
        mock_q.execute.return_value.data = []
        mock_factory.return_value = MagicMock(table=MagicMock(return_value=mock_q))

        result = search_student("Yassine", ctx=make_ctx("tenant-b"))
        assert result == []

    @patch("tools.enrollment_tools.get_supabase_client_for_user")
    def test_search_arabic_name(self, mock_factory):
        """search_student supporte les requêtes en arabe (premier filtre or_)."""
        from tools.enrollment_tools import search_student

        mock_q = MagicMock()
        mock_q.select.return_value = mock_q
        mock_q.eq.return_value = mock_q
        mock_q.or_.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.execute.return_value.data = []
        mock_factory.return_value = MagicMock(table=MagicMock(return_value=mock_q))

        search_student("يوسف", ctx=make_ctx("tenant-a"))

        or_arg = mock_q.or_.call_args[0][0]
        assert "يوسف" in or_arg

    @patch("tools.enrollment_tools.get_supabase_client_for_user")
    def test_search_returns_mapped_result(self, mock_factory):
        """search_student retourne une liste de dicts avec id, name, class_name."""
        from tools.enrollment_tools import search_student

        mock_q = MagicMock()
        mock_q.select.return_value = mock_q
        mock_q.eq.return_value = mock_q
        mock_q.or_.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.execute.return_value.data = [
            {"id": "s1", "first_name": "Yassine", "last_name": "Alaoui",
             "class_id": "c1", "classes": {"name": "6A"}}
        ]
        mock_factory.return_value = MagicMock(table=MagicMock(return_value=mock_q))

        result = search_student("Yassine", ctx=make_ctx("tenant-a"))

        assert len(result) == 1
        assert result[0]["name"] == "Yassine Alaoui"
        assert result[0]["class_name"] == "6A"
