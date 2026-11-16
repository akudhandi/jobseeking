"""Replay helpers: recovering search attribution from saved raw files."""

from __future__ import annotations

from jobseeking.pipeline import _raw_keyword


def test_raw_keyword_maps_slug_back_to_config_spelling():
    canonical = {"remote_developer": "remote developer"}
    assert (
        _raw_keyword("remote_developer__Jawa_Timur_Indonesia__0", canonical) == "remote developer"
    )


def test_raw_keyword_falls_back_to_spaces_for_unknown_keywords():
    # A keyword that was dropped from config.yaml still has raw pages on disk;
    # the best available recovery is undoing the underscore substitution.
    assert _raw_keyword("data_engineer__Indonesia__25", {}) == "data engineer"


def test_raw_keyword_ignores_files_without_the_search_separator():
    assert _raw_keyword("somethingelse", {}) == ""
