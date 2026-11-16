"""Tests for the structured-field parsers."""

from __future__ import annotations

from jobseeking.config import load_crawl_config
from jobseeking.detail import JobDetail
from jobseeking.parse import (
    detect_seniority,
    detect_work_type,
    extract_skills,
    parse_location,
    parse_requirements,
    parse_salary,
)
from jobseeking.search import JobCard


def test_salary_rupiah_range_per_month():
    s = parse_salary("Gaji Rp 10.000.000 - Rp 15.000.000 per bulan")
    assert s is not None
    assert s.min == 10_000_000
    assert s.max == 15_000_000
    assert s.period == "month"


def test_salary_juta_range_english():
    s = parse_salary("Salary: IDR 8 - 12 juta per month")
    assert s is not None
    assert s.min == 8_000_000
    assert s.max == 12_000_000


def test_salary_up_to():
    s = parse_salary("Up to Rp 20.000.000")
    assert s is not None
    assert s.min == s.max == 20_000_000


def test_salary_annual_converted_to_month():
    s = parse_salary("Rp 120.000.000 per tahun")
    assert s is not None
    assert s.min == 10_000_000
    assert s.period == "month"


def test_salary_none_when_absent():
    assert parse_salary("Gaji kompetitif, 3 tahun pengalaman") is None
    assert parse_salary("") is None
    assert parse_salary(None) is None


def test_extract_skills():
    text = "Butuh React.js, Node.js, PostgreSQL, Docker, dan developer Go berpengalaman"
    skills = set(extract_skills(text))
    assert {"react", "node-js", "postgresql", "docker", "go"} <= skills


def test_extract_skills_no_false_positive():
    # 'Java' inside 'JavaScript' must not double count, and 'go' verb must not match
    skills = extract_skills("We go fast and love JavaScript")
    assert "go" not in skills
    assert "javascript" in skills
    assert "java" not in skills


def test_detect_seniority():
    assert detect_seniority(level="Mid-Senior level") == "mid"
    assert detect_seniority(level="Internship") == "intern"
    assert detect_seniority(title="Senior Backend Engineer") == "senior"
    assert detect_seniority(title="Junior Web Developer") == "junior"
    assert detect_seniority(title="Backend Developer") == "unknown"


def test_detect_seniority_indonesian_levels():
    # locale id-ID makes LinkedIn answer with Indonesian level names.
    assert detect_seniority(level="Tingkat menengah sampai senior") == "mid"
    assert detect_seniority(level="Tingkat senior") == "senior"
    assert detect_seniority(level="Tingkat pemula") == "junior"
    assert detect_seniority(level="Magang") == "intern"
    assert detect_seniority(level="Direktur") == "lead"


def test_parse_location():
    loc = parse_location("Surabaya, East Java, Indonesia", ["Surabaya", "Malang"])
    assert loc.city == "Surabaya"
    assert loc.province == "Jawa Timur"
    assert loc.is_jatim is True

    loc2 = parse_location("Malang, Jawa Timur, Indonesia", ["Surabaya", "Malang"])
    assert loc2.is_jatim is True

    loc3 = parse_location("Jakarta, Indonesia", ["Surabaya"])
    assert loc3.province == "DKI Jakarta"
    assert loc3.is_jatim is False

    loc4 = parse_location("Remote", ["Surabaya"])
    assert loc4.city is None
    assert loc4.is_jatim is False


def test_parse_location_normalizes_city_names():
    cities = ["Malang", "Sidoarjo", "Surabaya"]
    assert parse_location("Kota Malang, Jawa Timur", cities).city == "Malang"
    assert parse_location("Malang, Jawa Timur", cities).city == "Malang"
    assert parse_location("Kab. Sidoarjo, Jawa Timur", cities).city == "Sidoarjo"
    assert parse_location("Surabaya dan Sekitarnya", cities).city == "Surabaya"
    assert parse_location("surabaya, east java", cities).city == "Surabaya"


def test_parse_location_maps_kecamatan_to_city():
    cities = ["Malang", "Sidoarjo", "Surabaya", "Gresik"]
    loc = parse_location("Kecamatan Blimbing, Jawa Timur, Indonesia", cities)
    assert loc.city == "Malang"
    assert loc.is_jatim is True

    assert parse_location("Kec. Waru, Jawa Timur", cities).city == "Sidoarjo"
    assert parse_location("Kelurahan Gubeng, Jawa Timur", cities).city == "Surabaya"

    # Unknown district: keep it verbatim instead of guessing a city.
    assert parse_location("Kecamatan Laren, Jawa Timur", cities).city == "Laren"


def test_parse_location_province_is_not_a_city():
    cities = ["Malang", "Surabaya"]
    loc = parse_location("Jawa Timur, Indonesia", cities)
    assert loc.city is None
    assert loc.province == "Jawa Timur"
    assert loc.is_jatim is True

    loc2 = parse_location("East Java", cities)
    assert loc2.city is None
    assert loc2.is_jatim is True


def test_language_slugs_do_not_collide():
    skills = set(extract_skills("Wajib menguasai C# dan C++"))
    assert {"csharp", "cpp"} <= skills
    assert "c" not in skills


def test_detect_work_type():
    assert detect_work_type("Backend Developer", "Remote, Indonesia") == "remote"
    assert detect_work_type("Frontend Developer (Hybrid)") == "hybrid"
    assert detect_work_type("Backend Developer", "onsite di Surabaya") == "onsite"
    assert detect_work_type("Backend Developer") == "unknown"


def test_parse_requirements():
    desc = (
        "Kualifikasi:\n- Minimal S1 Teknik Informatika\n- 3 tahun pengalaman\n- Menguasai Node.js\n"
    )
    req = parse_requirements(desc)
    assert any("Node.js" in item for item in req.items)
    assert req.min_years == 3


def test_build_parsed_job_prefers_specific_location():
    from jobseeking.build import build_parsed_job

    config = load_crawl_config()
    card = JobCard(
        job_id="2",
        title="Backend Developer",
        company="PT ABC",
        location="Surabaya, Jawa Timur, Indonesia",
        url="https://www.linkedin.com/jobs/view/2",
    )
    # Guest detail pages frequently report only the country.
    detail = JobDetail(job_id="2", title="Backend Developer", location="Indonesia")
    rec = build_parsed_job(card, detail, "backend developer", config)
    assert rec.location_raw == "Surabaya, Jawa Timur, Indonesia"
    assert rec.city == "Surabaya"
    assert rec.is_jatim is True


def test_build_parsed_job():
    from jobseeking.build import build_parsed_job

    config = load_crawl_config()
    card = JobCard(
        job_id="1",
        title="Backend Developer",
        company="PT ABC",
        location="Surabaya, East Java, Indonesia",
        url="https://www.linkedin.com/jobs/view/1",
        posted_at="2026-11-01",
    )
    detail = JobDetail(
        job_id="1",
        title="Backend Developer",
        company="PT ABC Teknologi",
        location="Surabaya, East Java, Indonesia",
        description_text="Kami mencari Backend Developer. Gaji Rp 10.000.000 - 15.000.000 per bulan. "
        "Tech: Node.js, PostgreSQL, Docker.",
        seniority_level="Mid-Senior level",
        employment_type="Full-time",
    )
    rec = build_parsed_job(card, detail, "backend developer", config)
    assert rec.title == "Backend Developer"
    assert rec.company_name == "PT ABC Teknologi"
    assert rec.city == "Surabaya"
    assert rec.is_jatim is True
    assert rec.salary_min == 10_000_000
    assert rec.seniority == "mid"
    assert rec.employment_type == "full_time"
    assert {"node-js", "postgresql", "docker"} <= set(rec.skills)
    assert rec.posted_at is not None
