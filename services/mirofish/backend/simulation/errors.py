"""Simulation-specific error types."""
from __future__ import annotations


class SimulationError(Exception):
    """Base class for simulation errors."""


class SimulationCancelled(SimulationError):
    """Raised when a simulation is explicitly cancelled via the cancel endpoint."""


class SimulationTimeout(SimulationError):
    """Raised when a simulation exceeds the maximum allowed wall-clock time."""
