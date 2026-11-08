"""Parsing helpers for turning raw job text into structured fields."""

from __future__ import annotations

from .location import LocationInfo, detect_work_type, parse_location
from .requirements import Requirements, parse_requirements
from .salary import SalaryRange, parse_salary
from .seniority import detect_seniority
from .skills import SKILL_BY_SLUG, SKILL_DEFS, SkillDef, extract_skills

__all__ = [
    "SKILL_BY_SLUG",
    "SKILL_DEFS",
    "LocationInfo",
    "Requirements",
    "SalaryRange",
    "SkillDef",
    "detect_seniority",
    "detect_work_type",
    "extract_skills",
    "parse_location",
    "parse_requirements",
    "parse_salary",
]
