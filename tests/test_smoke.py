"""
FoulPlay V6.6 Smoke Tests
Simple tests that catch obvious breakage
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestBasicImports:
    """Test that core modules can be imported"""
    
    def test_import_config(self):
        """Config module imports without error"""
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))
            from config import FoulPlayConfig
            assert FoulPlayConfig is not None
        except ImportError as e:
            pytest.fail(f"Failed to import config: {e}")
    
    def test_import_agents(self):
        """Agents module imports without error"""
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))
            from fp.agents import AgentType, AGENTS
            assert len(AGENTS) > 0
        except ImportError as e:
            pytest.fail(f"Failed to import agents: {e}")
    
    def test_import_error_handler(self):
        """Error handler imports without error"""
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))
            from fp.error_handler import FoulPlayError, ErrorSeverity
            assert FoulPlayError is not None
        except ImportError as e:
            pytest.fail(f"Failed to import error_handler: {e}")


class TestSmogonClient:
    """Test Smogon data integration"""
    
    def test_smogon_client_exists(self):
        """Smogon client can be imported"""
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
            from smogon_client import SmogonClient
            client = SmogonClient()
            assert client is not None
        except ImportError as e:
            pytest.fail(f"Failed to import smogon_client: {e}")
    
    def test_predict_moves_returns_list(self):
        """Predict moves returns a list (even if API fails)"""
        sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
        from smogon_client import SmogonClient
        
        client = SmogonClient()
        moves = client.predict_opponent_moves("landorustherian", "gen9ou")
        
        assert isinstance(moves, list)
        assert len(moves) > 0  # Should return defaults if API fails


class TestAgentSystem:
    """Test agent creation and selection"""
    
    def test_agent_registry_complete(self):
        """All agent types have implementations"""
        sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))
        from fp.agents import AgentType, AGENTS
        
        for agent_type in AgentType:
            assert agent_type in AGENTS, f"Missing agent: {agent_type}"
    
    def test_create_max_damage_agent(self):
        """Can create MaxDamageAgent"""
        sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))
        from fp.agents import create_agent, AgentType
        from config import FoulPlayConfig
        
        agent = create_agent(AgentType.MAX_DAMAGE, FoulPlayConfig)
        assert agent is not None
        assert agent.name == "MaxDamageAgent"


class TestErrorHandling:
    """Test error handling system"""
    
    def test_error_has_context(self):
        """Errors include context for debugging"""
        sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))
        from fp.error_handler import FoulPlayError, ErrorSeverity
        
        error = FoulPlayError(
            "Test error",
            ErrorSeverity.RECOVERABLE,
            {"test_key": "test_value"}
        )
        
        assert error.context["test_key"] == "test_value"
        assert error.severity == ErrorSeverity.RECOVERABLE
    
    def test_error_to_dict(self):
        """Errors can be serialized"""
        sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))
        from fp.error_handler import FoulPlayError, ErrorSeverity
        
        error = FoulPlayError("Test", ErrorSeverity.RECOVERABLE)
        data = error.to_dict()
        
        assert "error" in data
        assert "message" in data
        assert "severity" in data


# Run with: pytest tests/test_smoke.py -v
