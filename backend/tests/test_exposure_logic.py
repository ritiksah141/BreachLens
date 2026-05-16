"""
test_exposure_logic.py — Unit tests for Phase 1 exposure checking features.
"""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from bson import ObjectId
from app.utils.pwned_passwords import check_password_exposure
from app.services.breach_service import BreachService

def test_password_k_anonymity_match():
    """Test that k-Anonymity correctly identifies a matched password suffix."""
    # Mock the API response for prefix '5BAA6' (SHA1 for 'password' is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8)
    mock_response = MagicMock()
    mock_response.status_code = 200
    # The suffix for 'password' is 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    mock_response.text = "1E4C9B93F3F0682250B6CF8331B7EE68FD8:100\nABC123:10"

    with patch('requests.get', return_value=mock_response):
        is_exposed, count = check_password_exposure("password")
        assert is_exposed is True
        assert count == 100

def test_password_k_anonymity_no_match():
    """Test that k-Anonymity correctly handles a non-exposed password."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "FFFFFF:1\n000000:2"

    with patch('requests.get', return_value=mock_response):
        is_exposed, count = check_password_exposure("super_secure_unique_password_123")
        assert is_exposed is False
        assert count == 0

def test_bloom_filter_lookup():
    """Test that the BreachService correctly uses the Bloom Filter."""
    service = BreachService()

    # Manually add a test email to the bloom filter if it exists
    if service.bloom:
        service.bloom.add("test_bloom@example.com")

        result = service.check_exposure(email="test_bloom@example.com")
        assert result["email_exposed"] is True
        # Should have found the 'osint_compilation' synthetic match
        assert any(b["_id"] == "osint_compilation" for b in result["breaches"])

def test_remediation_advice_logic():
    """Test that remediation advice changes based on data types."""
    service = BreachService()

    # 1. Test with password exposure
    breaches = [{"data_types_exposed": ["email", "password"]}]
    advice = service._get_remediation_advice(breaches)
    assert "Change your passwords" in advice

    # 2. Test with sensitive ID exposure
    breaches = [{"data_types_exposed": ["email", "ssn"]}]
    advice = service._get_remediation_advice(breaches)
    assert "monitor your credit report" in advice

def test_aggregated_risk_score():
    """Test that the risk score is correctly averaged."""
    service = BreachService()

    # Mock data with _id and risk_score
    mock_breaches = [
        {"risk_score": 8.0, "_id": ObjectId(), "data_types_exposed": ["email"]},
        {"risk_score": 4.0, "_id": ObjectId(), "data_types_exposed": ["email"]}
    ]

    mock_col = MagicMock()
    mock_col.find.return_value = mock_breaches

    with patch.object(BreachService, 'col', new_callable=PropertyMock) as mock_col_prop:
        mock_col_prop.return_value = mock_col
        result = service.check_exposure(email="test@example.com")
        assert result["aggregated_risk_score"] == 6.0
        assert result["breach_count"] == 2
