"""Actions Arc can take in the page, beyond answering. Each tool decides by rules and the model writes the reply."""

from .actions import Action, Decision, decide

__all__ = ["Action", "Decision", "decide"]
