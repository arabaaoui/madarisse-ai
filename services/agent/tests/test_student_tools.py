"""
Tests pour student_tools — get_student_detail + get_student_payment_summary.
Écrits AVANT implémentation (test-first, constitution §4).
"""

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


def _mock_chain(**kwargs):
    m = MagicMock()
    for attr in ('select', 'eq', 'neq', 'single', 'limit'):
        getattr(m, attr).return_value = m
    m.execute.return_value.data = kwargs.get('data', None)
    return m


class TestGetStudentDetail:
    @patch("tools.student_tools.get_supabase_client_for_user")
    def test_cross_tenant_returns_error(self, mock_factory):
        """get_student_detail retourne {"error": ...} si l'élève n'est pas dans le tenant."""
        from tools.student_tools import get_student_detail

        mock_q = _mock_chain(data=None)
        mock_q.execute.return_value.data = None
        client = MagicMock()
        client.table.return_value = mock_q
        mock_factory.return_value = client

        result = get_student_detail("student-uuid-other-tenant", ctx=make_ctx("tenant-b"))
        assert "error" in result

    @patch("tools.student_tools.get_supabase_client_for_user")
    def test_returns_student_data(self, mock_factory):
        """get_student_detail retourne les données de l'élève."""
        from tools.student_tools import get_student_detail

        student_data = {
            "id": "s1", "first_name": "Yassine", "last_name": "Alaoui",
            "first_name_ar": "ياسين", "last_name_ar": None,
            "date_of_birth": "2010-03-15", "gender": "M",
            "annual_status": "active", "phone": "0600000000", "email": None,
            "classes": {"name": "6A"},
        }
        enrollment_data = [{"id": "e1", "status": "confirmed", "academic_years": {"year": "2025-2026"}}]

        def table_side_effect(name):
            m = MagicMock()
            m.select.return_value = m
            m.eq.return_value = m
            m.limit.return_value = m
            m.single.return_value = m
            if name == "students":
                m.execute.return_value.data = student_data
            elif name == "enrollments":
                m.execute.return_value.data = enrollment_data
            return m

        client = MagicMock()
        client.table.side_effect = table_side_effect
        mock_factory.return_value = client

        result = get_student_detail("s1", ctx=make_ctx("tenant-a"))
        assert result["name"] == "Yassine Alaoui"
        assert result["class_name"] == "6A"
        assert result["annual_status"] == "active"


class TestGetStudentPaymentSummary:
    @patch("tools.student_tools.get_supabase_client_for_user")
    def test_empty_payments(self, mock_factory):
        """Élève sans paiement → totaux à zéro."""
        from tools.student_tools import get_student_payment_summary

        mock_q = MagicMock()
        mock_q.select.return_value = mock_q
        mock_q.eq.return_value = mock_q
        mock_q.neq.return_value = mock_q
        mock_q.execute.return_value.data = []
        mock_factory.return_value = MagicMock(table=MagicMock(return_value=mock_q))

        result = get_student_payment_summary("s1", ctx=make_ctx("tenant-a"))
        assert result["total_due"] == 0
        assert result["overdue_count"] == 0
        assert result["next_due_date"] is None

    @patch("tools.student_tools.get_supabase_client_for_user")
    def test_overdue_calculated(self, mock_factory):
        """Les retards sont correctement comptabilisés."""
        from tools.student_tools import get_student_payment_summary

        items = [
            {"amount": 800, "paid_amount": 0, "status": "overdue", "due_date": "2026-05-01"},
            {"amount": 800, "paid_amount": 800, "status": "paid", "due_date": "2026-06-01"},
            {"amount": 800, "paid_amount": 0, "status": "pending", "due_date": "2026-08-01"},
        ]
        mock_q = MagicMock()
        mock_q.select.return_value = mock_q
        mock_q.eq.return_value = mock_q
        mock_q.neq.return_value = mock_q
        mock_q.execute.return_value.data = items
        mock_factory.return_value = MagicMock(table=MagicMock(return_value=mock_q))

        result = get_student_payment_summary("s1", ctx=make_ctx("tenant-a"))
        assert result["total_due"] == 2400
        assert result["total_paid"] == 800
        assert result["overdue_count"] == 1
        assert result["total_overdue"] == 800
        assert result["next_due_date"] == "2026-08-01"
