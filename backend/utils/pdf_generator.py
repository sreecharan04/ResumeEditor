from weasyprint import HTML, CSS

# ─── CSS ──────────────────────────────────────────────────────────────────────
# Uses @page to enforce exactly 1 letter-size page.
# If content overflows, reduce font-size until it fits.
_BASE_CSS = """
@page {{
    size: letter;
    margin: {top}in {side}in {top}in {side}in;
}}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
    font-family: "Calibri", "Helvetica Neue", Arial, sans-serif;
    font-size: {fs}pt;
    color: #1a1a1a;
    line-height: 1.35;
}}

/* ── Name ──────────────────────────────────────── */
.name {{
    text-align: center;
    font-size: {name_fs}pt;
    font-weight: 700;
    margin-bottom: 3pt;
}}

/* ── Contact ───────────────────────────────────── */
.contact {{
    text-align: center;
    font-size: {contact_fs}pt;
    color: #444;
    margin-bottom: 8pt;
}}
.contact a {{ color: #444; text-decoration: none; }}

/* ── Sections ──────────────────────────────────── */
.section-header {{
    font-size: {header_fs}pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 0.75pt solid #333;
    padding-bottom: 1pt;
    margin-top: {section_gap}pt;
    margin-bottom: 4pt;
    color: #111;
}}

/* ── Experience / Projects ─────────────────────── */
.entry {{
    margin-bottom: {entry_gap}pt;
}}
.entry-header {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}}
.entry-title {{
    font-weight: 700;
    font-size: {fs}pt;
}}
.entry-sub {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}}
.entry-role {{
    color: #3730a3;
    font-size: {sub_fs}pt;
}}
.entry-date {{
    font-style: italic;
    color: #555;
    font-size: {sub_fs}pt;
    white-space: nowrap;
    margin-left: 8pt;
}}
.entry-loc {{
    color: #666;
    font-size: {sub_fs}pt;
    white-space: nowrap;
    margin-left: 8pt;
}}

/* ── Bullets ───────────────────────────────────── */
ul {{
    margin: 2pt 0 0 14pt;
    padding: 0;
}}
li {{
    margin-bottom: {li_gap}pt;
    padding-left: 2pt;
}}

/* ── Skills ────────────────────────────────────── */
.skill-row {{
    margin-bottom: {li_gap}pt;
    display: flex;
    gap: 4pt;
}}
.skill-cat {{
    font-weight: 700;
    white-space: nowrap;
    min-width: 110pt;
}}
.skill-items {{
    color: #222;
}}

/* ── Education ─────────────────────────────────── */
.edu-entry {{
    margin-bottom: {entry_gap}pt;
}}

/* ── Projects ──────────────────────────────────── */
.proj-tech {{
    font-style: italic;
    color: #555;
    font-size: {sub_fs}pt;
}}
.proj-desc {{
    margin-top: 1pt;
    color: #333;
}}
"""


def _esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
    )


def _build_html(data: dict) -> str:
    parts = ["<html><body>"]

    # Name
    parts.append(f'<div class="name">{_esc(data.get("name", ""))}</div>')

    # Contact
    contact = data.get("contact", {})
    c_parts = [
        v for k in ("email", "phone", "location", "linkedin", "github", "website")
        if (v := contact.get(k))
    ]
    if c_parts:
        parts.append(f'<div class="contact">{" &nbsp;|&nbsp; ".join(_esc(p) for p in c_parts)}</div>')

    # Summary
    if data.get("summary"):
        parts.append('<div class="section-header">Summary</div>')
        parts.append(f'<p>{_esc(data["summary"])}</p>')

    # Experience
    if data.get("experience"):
        parts.append('<div class="section-header">Experience</div>')
        for exp in data["experience"]:
            parts.append('<div class="entry">')
            parts.append('<div class="entry-header">')
            parts.append(f'<span class="entry-title">{_esc(exp.get("company",""))}</span>')
            parts.append(f'<span class="entry-date">{_esc(exp.get("dates",""))}</span>')
            parts.append("</div>")
            parts.append('<div class="entry-sub">')
            parts.append(f'<span class="entry-role">{_esc(exp.get("title",""))}</span>')
            if exp.get("location"):
                parts.append(f'<span class="entry-loc">{_esc(exp["location"])}</span>')
            parts.append("</div>")
            if exp.get("bullets"):
                parts.append("<ul>")
                for b in exp["bullets"]:
                    parts.append(f"<li>{_esc(b)}</li>")
                parts.append("</ul>")
            parts.append("</div>")

    # Education
    if data.get("education"):
        parts.append('<div class="section-header">Education</div>')
        for edu in data["education"]:
            parts.append('<div class="edu-entry">')
            degree = edu.get("degree", "")
            if edu.get("field"):
                degree += f" in {edu['field']}"
            gpa = f" &nbsp;·&nbsp; GPA: {edu['gpa']}" if edu.get("gpa") else ""
            parts.append('<div class="entry-header">')
            parts.append(f'<span class="entry-title">{_esc(edu.get("institution",""))}</span>')
            parts.append(f'<span class="entry-date">{_esc(edu.get("dates",""))}</span>')
            parts.append("</div>")
            parts.append(f'<div class="entry-role">{_esc(degree)}{gpa}</div>')
            parts.append("</div>")

    # Skills
    if data.get("skills"):
        parts.append('<div class="section-header">Skills</div>')
        for s in data["skills"]:
            parts.append('<div class="skill-row">')
            parts.append(f'<span class="skill-cat">{_esc(s.get("category",""))}: </span>')
            parts.append(f'<span class="skill-items">{_esc(", ".join(s.get("items",[])))}</span>')
            parts.append("</div>")

    # Projects
    if data.get("projects"):
        parts.append('<div class="section-header">Projects</div>')
        for proj in data["projects"]:
            parts.append('<div class="entry">')
            parts.append('<div class="entry-header">')
            parts.append(f'<span class="entry-title">{_esc(proj.get("name",""))}</span>')
            if proj.get("technologies"):
                parts.append(f'<span class="proj-tech">{_esc(proj["technologies"])}</span>')
            parts.append("</div>")
            if proj.get("description"):
                parts.append(f'<p class="proj-desc">{_esc(proj["description"])}</p>')
            if proj.get("bullets"):
                parts.append("<ul>")
                for b in proj["bullets"]:
                    parts.append(f"<li>{_esc(b)}</li>")
                parts.append("</ul>")
            parts.append("</div>")

    parts.append("</body></html>")
    return "\n".join(parts)


def _make_css(**kwargs) -> CSS:
    return CSS(string=_BASE_CSS.format(**kwargs))


def generate_pdf(resume_data: dict) -> bytes:
    html_content = _build_html(resume_data)
    html = HTML(string=html_content)

    # Try progressively tighter settings until the PDF fits on 1 page
    configs = [
        # (font_size, name_fs, contact_fs, header_fs, sub_fs, section_gap, entry_gap, li_gap, top_margin, side_margin)
        (10.0, 17, 9.5, 10.5, 9.5, 8, 4, 1.5, 0.45, 0.45),
        (9.5, 16, 9.0, 10.0, 9.0, 7, 3, 1.0, 0.40, 0.40),
        (9.0, 15, 8.5,  9.5, 8.5, 6, 3, 0.8, 0.38, 0.38),
        (8.5, 14, 8.0,  9.0, 8.0, 5, 2, 0.5, 0.35, 0.35),
        (8.0, 13, 7.5,  8.5, 7.5, 4, 2, 0.5, 0.30, 0.30),
    ]

    for fs, name_fs, contact_fs, header_fs, sub_fs, section_gap, entry_gap, li_gap, top, side in configs:
        css = _make_css(
            fs=fs, name_fs=name_fs, contact_fs=contact_fs,
            header_fs=header_fs, sub_fs=sub_fs,
            section_gap=section_gap, entry_gap=entry_gap, li_gap=li_gap,
            top=top, side=side,
        )
        doc = html.render(stylesheets=[css])
        if len(doc.pages) == 1:
            return doc.write_pdf()

    # Last resort: return the tightest config even if slightly over
    return doc.write_pdf()
