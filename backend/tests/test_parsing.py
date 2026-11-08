"""Offline tests for the search/detail HTML parsers."""

from __future__ import annotations

from jobseeking.detail import parse_job_detail
from jobseeking.search import build_search_url, parse_job_cards

SEARCH_HTML = """
<ul>
  <li>
    <div class="base-card base-search-card" data-entity-urn="urn:li:jobPosting:4123456789">
      <a class="base-card__full-link"
         href="https://www.linkedin.com/jobs/view/backend-developer-at-pt-abc-4123456789?position=1">
        <span class="sr-only">Backend Developer</span>
      </a>
      <div class="base-search-card__info">
        <h3 class="base-search-card__title">Backend Developer</h3>
        <h4 class="base-search-card__subtitle">
          <a class="hidden-nested-link" href="/company/abc">PT ABC Teknologi</a>
        </h4>
        <div class="base-search-card__metadata">
          <span class="job-search-card__location">Surabaya, East Java, Indonesia</span>
          <time class="job-search-card__listdate" datetime="2026-11-01">3 days ago</time>
        </div>
      </div>
    </div>
  </li>
  <li>
    <div class="base-card base-search-card" data-entity-urn="urn:li:jobPosting:4999999999">
      <a class="base-card__full-link" href="https://id.linkedin.com/jobs/view/4999999999?refId=x">
        <span class="sr-only">Frontend Developer</span>
      </a>
      <h3 class="base-search-card__title">Frontend Developer</h3>
      <h4 class="base-search-card__subtitle">CV Maju Jaya</h4>
      <span class="job-search-card__location">Malang, East Java, Indonesia</span>
    </div>
  </li>
</ul>
"""

DETAIL_HTML = """
<section class="top-card-layout">
  <h2 class="top-card-layout__title">Backend Developer</h2>
  <a class="topcard__org-name-link" href="/company/abc">PT ABC Teknologi</a>
  <span class="topcard__flavor topcard__flavor--bullet">Surabaya, East Java, Indonesia</span>
  <span class="posted-time-ago__text">3 days ago</span>
  <time datetime="2026-11-01"></time>
</section>
<div class="description__text">
  <div class="show-more-less-html__markup">
    <p>Kami mencari Backend Developer berpengalaman dengan Node.js, PostgreSQL, dan Docker.</p>
    <ul><li>Minimal 3 tahun pengalaman</li><li>Gaji Rp 10.000.000 - Rp 15.000.000 per bulan</li></ul>
  </div>
</div>
<ul class="description__job-criteria-list">
  <li class="description__job-criteria-item">
    <h3 class="description__job-criteria-subheader">Seniority level</h3>
    <span class="description__job-criteria-text">Mid-Senior level</span>
  </li>
  <li class="description__job-criteria-item">
    <h3 class="description__job-criteria-subheader">Employment type</h3>
    <span class="description__job-criteria-text">Full-time</span>
  </li>
  <li class="description__job-criteria-item">
    <h3 class="description__job-criteria-subheader">Industries</h3>
    <span class="description__job-criteria-text">Software Development</span>
  </li>
</ul>
"""


def test_build_search_url_encodes_params():
    url = build_search_url("backend developer", "Surabaya, Jawa Timur", start=25, distance=25)
    assert "keywords=backend+developer" in url
    assert "start=25" in url
    assert "location=Surabaya%2C+Jawa+Timur" in url


def test_parse_job_cards():
    cards = parse_job_cards(SEARCH_HTML)
    assert len(cards) == 2

    first = cards[0]
    assert first.job_id == "4123456789"
    assert first.title == "Backend Developer"
    assert first.company == "PT ABC Teknologi"
    assert first.location == "Surabaya, East Java, Indonesia"
    assert first.url == "https://www.linkedin.com/jobs/view/backend-developer-at-pt-abc-4123456789"
    assert first.posted_at == "2026-11-01"

    second = cards[1]
    assert second.job_id == "4999999999"
    assert second.company == "CV Maju Jaya"
    assert second.location == "Malang, East Java, Indonesia"


def test_parse_job_detail():
    detail = parse_job_detail(DETAIL_HTML, "4123456789")
    assert detail.job_id == "4123456789"
    assert detail.title == "Backend Developer"
    assert detail.company == "PT ABC Teknologi"
    assert detail.location == "Surabaya, East Java, Indonesia"
    assert "Node.js" in detail.description_text
    assert detail.seniority_level == "Mid-Senior level"
    assert detail.employment_type == "Full-time"
    assert detail.industries == "Software Development"
    assert detail.posted_at == "2026-11-01"
