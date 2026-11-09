"""Skill taxonomy and extraction from free-text job descriptions."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SkillDef:
    name: str
    slug: str
    category: str
    aliases: tuple[str, ...] = ()
    cs_aliases: tuple[str, ...] = ()
    ci_name: bool = True


def _s(
    name: str,
    category: str,
    aliases: tuple[str, ...] = (),
    cs: tuple[str, ...] = (),
    *,
    ci_name: bool = True,
    slug: str | None = None,
) -> SkillDef:
    return SkillDef(
        name=name,
        slug=slug or _slug(name),
        category=category,
        aliases=aliases,
        cs_aliases=cs,
        ci_name=ci_name,
    )


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


SKILL_DEFS: list[SkillDef] = [
    # --- languages ---
    _s("JavaScript", "language", ("js", "es6", "ecmascript")),
    _s("TypeScript", "language", ("ts",)),
    _s("Python", "language", ("py",)),
    _s("Java", "language"),
    _s("PHP", "language"),
    _s("Ruby", "language"),
    _s("Go", "language", ("golang",), ("Go",), ci_name=False),
    _s("Kotlin", "language"),
    _s("Swift", "language"),
    _s("Dart", "language"),
    _s("Rust", "language"),
    _s("Scala", "language"),
    _s("Elixir", "language"),
    _s("C#", "language", ("c#", "csharp", ".net c#"), slug="csharp"),
    _s("C++", "language", ("c++", "cpp"), slug="cpp"),
    _s("SQL", "language", ("sql",)),
    _s("Bash", "language", ("shell", "shell script", "bash script")),
    _s("VBA", "language"),
    # --- frontend ---
    _s("HTML", "frontend", ("html5",)),
    _s("CSS", "frontend", ("css3",)),
    _s("Sass", "frontend", ("scss", "sass/scss")),
    _s("Tailwind CSS", "frontend", ("tailwind", "tailwindcss")),
    _s("Bootstrap", "frontend"),
    _s("React", "frontend", ("react.js", "reactjs", "react js")),
    _s("Next.js", "frontend", ("next.js", "nextjs", "next js")),
    _s("Vue.js", "frontend", ("vue", "vuejs", "vue.js", "vue 3")),
    _s("Nuxt.js", "frontend", ("nuxt", "nuxtjs")),
    _s("Angular", "frontend", ("angularjs", "angular.js")),
    _s("Svelte", "frontend", ("sveltekit",)),
    _s("jQuery", "frontend", ("jquery",)),
    _s("Redux", "frontend"),
    _s("Alpine.js", "frontend", ("alpinejs",)),
    _s("Astro", "frontend"),
    _s("Vite", "frontend"),
    _s("Webpack", "frontend"),
    _s("Three.js", "frontend", ("threejs",)),
    _s("Material UI", "frontend", ("mui", "material-ui")),
    _s("Ant Design", "frontend", ("antd",)),
    _s("Responsive Design", "frontend", ("responsive web", "mobile responsive")),
    _s("PWA", "frontend", ("progressive web app",)),
    _s("Web Accessibility", "frontend", ("a11y", "wcag")),
    # --- backend ---
    _s("Node.js", "backend", ("node", "nodejs", "node.js", "node js")),
    _s("Express", "backend", ("express.js", "expressjs")),
    _s("NestJS", "backend", ("nest.js", "nest")),
    _s("Fastify", "backend"),
    _s("Koa", "backend"),
    _s("Django", "backend"),
    _s("Flask", "backend"),
    _s("FastAPI", "backend", ("fast api",)),
    _s("Laravel", "backend"),
    _s("CodeIgniter", "backend", ("codeigniter",)),
    _s("Symfony", "backend"),
    _s("Ruby on Rails", "backend", ("rails", "ror")),
    _s("Spring", "backend", ("spring boot", "springboot")),
    _s("ASP.NET", "backend", (".net", "dotnet", "asp.net core")),
    _s("Gin", "backend", ("gin gonic",)),
    _s("REST API", "backend", ("rest", "restful", "rest api", "restful api")),
    _s("GraphQL", "backend"),
    _s("gRPC", "backend"),
    _s("WebSocket", "backend", ("websocket", "socket.io", "socketio")),
    _s("Microservices", "backend", ("microservice", "micro services")),
    _s("RabbitMQ", "backend", ("rabbit mq",)),
    _s("Celery", "backend"),
    _s("Nginx", "backend"),
    _s("OAuth", "backend", ("oauth2", "jwt", "json web token")),
    # --- database ---
    _s("MySQL", "database"),
    _s("PostgreSQL", "database", ("postgres", "pgsql")),
    _s("MariaDB", "database"),
    _s("MongoDB", "database", ("mongo",)),
    _s("SQLite", "database"),
    _s("Oracle Database", "database", ("oracle db",)),
    _s("SQL Server", "database", ("mssql",)),
    _s("Redis", "database"),
    _s("Elasticsearch", "database", ("elastic search", "elastic")),
    _s("Cassandra", "database"),
    _s("DynamoDB", "database"),
    _s("Firebase", "database", ("firestore",)),
    _s("Supabase", "database"),
    _s("Prisma", "database"),
    _s("Sequelize", "database"),
    _s("TypeORM", "database"),
    _s("Hibernate", "database"),
    _s("Kafka", "database", ("apache kafka",)),
    # --- devops ---
    _s("Docker", "devops", ("containerization",)),
    _s("Kubernetes", "devops", ("k8s",)),
    _s("Jenkins", "devops"),
    _s("GitLab CI", "devops", ("gitlab ci/cd",)),
    _s("GitHub Actions", "devops", ("gh actions",)),
    _s("CI/CD", "devops", ("ci cd", "continuous integration", "continuous deployment")),
    _s("Terraform", "devops"),
    _s("Ansible", "devops"),
    _s("Helm", "devops"),
    _s("Prometheus", "devops"),
    _s("Grafana", "devops"),
    _s("Linux", "devops", ("ubuntu", "debian", "unix")),
    _s("Git", "devops", ("git", "github", "gitlab", "bitbucket", "version control")),
    # --- cloud ---
    _s("AWS", "cloud", ("amazon web services", "ec2", "s3", "lambda")),
    _s("Google Cloud", "cloud", ("gcp", "google cloud platform")),
    _s("Azure", "cloud", ("microsoft azure",)),
    _s("DigitalOcean", "cloud"),
    _s("Vercel", "cloud"),
    _s("Heroku", "cloud"),
    _s("Cloudflare", "cloud"),
    # --- mobile ---
    _s("React Native", "mobile", ("react-native",)),
    _s("Flutter", "mobile"),
    _s("Android", "mobile", ("android sdk",)),
    _s("iOS", "mobile", ("ios development",)),
    _s("Kotlin Multiplatform", "mobile", ("kmmp",)),
    # --- data ---
    _s("Pandas", "data"),
    _s("NumPy", "data", ("numpy",)),
    _s("TensorFlow", "data"),
    _s("PyTorch", "data"),
    _s("Scikit-learn", "data", ("sklearn", "scikit learn")),
    _s("Spark", "data", ("apache spark", "pyspark")),
    _s("Hadoop", "data"),
    _s("Airflow", "data", ("apache airflow",)),
    _s("ETL", "data", ("etl pipeline", "elt")),
    _s("Power BI", "data", ("powerbi",)),
    _s("Tableau", "data"),
    _s("Looker", "data", ("looker studio", "data studio")),
    _s("dbt", "data"),
    _s("Machine Learning", "data", ("ml", "deep learning")),
    _s("Data Analysis", "data", ("data analytics", "analisis data")),
    # --- testing ---
    _s("Jest", "testing"),
    _s("Vitest", "testing"),
    _s("Mocha", "testing"),
    _s("Cypress", "testing"),
    _s("Playwright", "testing"),
    _s("Selenium", "testing"),
    _s("Pytest", "testing", ("pytest",)),
    _s("JUnit", "testing"),
    _s("Postman", "testing"),
    _s("Unit Testing", "testing", ("unit test", "integration test", "tdd")),
    # --- design ---
    _s("Figma", "design"),
    _s("Adobe XD", "design", ("xd",)),
    _s("Sketch", "design"),
    _s("Adobe Photoshop", "design", ("photoshop",)),
    _s("Adobe Illustrator", "design", ("illustrator",)),
    _s("UI/UX", "design", ("ui ux", "ui/ux design", "user experience", "user interface")),
    _s("Wireframing", "design", ("wireframe", "prototyping")),
    # --- soft / process ---
    _s("Agile", "soft", ("agile methodology", "agile development")),
    _s("Scrum", "soft"),
    _s("Kanban", "soft"),
    _s("Jira", "soft"),
    _s("Trello", "soft"),
    _s("Communication", "soft", ("komunikasi", "communication skills")),
    _s("Teamwork", "soft", ("team player", "kerjasama tim", "team work")),
    _s("Problem Solving", "soft", ("pemecahan masalah", "problem-solving")),
    _s("Leadership", "soft", ("kepemimpinan", "lead a team")),
    _s("Analytical Thinking", "soft", ("analytical", "analitis")),
    _s("Time Management", "soft", ("manajemen waktu",)),
    _s("Attention to Detail", "soft", ("detail oriented", "detail-oriented")),
    _s("English", "soft", ("bahasa inggris", "english proficiency")),
]

SKILL_BY_SLUG: dict[str, SkillDef] = {d.slug: d for d in SKILL_DEFS}

_alias_map: dict[str, str] = {}
for _d in SKILL_DEFS:
    if _d.ci_name:
        _alias_map[_d.name.lower()] = _d.slug
    for _a in _d.aliases:
        _alias_map.setdefault(_a.lower(), _d.slug)

_sorted_aliases = sorted(_alias_map.keys(), key=len, reverse=True)
_ALIAS_RE = re.compile(
    r"(?<![A-Za-z0-9])(" + "|".join(re.escape(a) for a in _sorted_aliases) + r")(?![A-Za-z0-9])",
    re.IGNORECASE,
)

_cs_pairs = [(a, d.slug) for d in SKILL_DEFS for a in d.cs_aliases]
_cs_pairs.sort(key=lambda p: len(p[0]), reverse=True)
_CS_RE = (
    re.compile(r"(?<![A-Za-z0-9])(" + "|".join(re.escape(a) for a, _ in _cs_pairs) + r")(?![A-Za-z0-9])")
    if _cs_pairs
    else None
)
_cs_map = {a: slug for a, slug in _cs_pairs}


def extract_skills(text: str) -> list[str]:
    """Return canonical skill slugs mentioned in *text* (deduplicated, ordered)."""
    if not text:
        return []
    found: list[str] = []
    seen: set[str] = set()

    for match in _ALIAS_RE.finditer(text):
        slug = _alias_map.get(match.group(1).lower())
        if slug and slug not in seen:
            seen.add(slug)
            found.append(slug)

    if _CS_RE is not None:
        for match in _CS_RE.finditer(text):
            slug = _cs_map.get(match.group(1))
            if slug and slug not in seen:
                seen.add(slug)
                found.append(slug)

    return found
