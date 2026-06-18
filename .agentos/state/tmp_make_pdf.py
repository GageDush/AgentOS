from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

md_path = Path(r"C:\Users\gaged\Documents\AgenOS\docs\AGENTOS_GAP_CLOSURE_MAD_REVIEW.md")
pdf_path = Path(r"C:\Users\gaged\Documents\AgenOS\docs\AGENTOS_GAP_CLOSURE_MAD_REVIEW.pdf")
text = md_path.read_text(encoding="utf-8").splitlines()

c = canvas.Canvas(str(pdf_path), pagesize=letter)
width, height = letter
x = 0.75 * inch
y = height - 0.75 * inch
line_height = 12

for raw in text:
    line = raw.replace("\t", "    ")
    while len(line) > 110:
        chunk = line[:110]
        line = line[110:]
        c.drawString(x, y, chunk)
        y -= line_height
        if y < 0.75 * inch:
            c.showPage()
            y = height - 0.75 * inch
    c.drawString(x, y, line)
    y -= line_height
    if y < 0.75 * inch:
        c.showPage()
        y = height - 0.75 * inch

c.save()
print(str(pdf_path))
