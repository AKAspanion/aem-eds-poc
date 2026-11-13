/*
 * Blog table: a data table inside article content.
 * Each authored row becomes a table row; the first row is the header row.
 * Rows whose cells are all empty are dropped.
 */
function cellContent(cell, target) {
  const paragraphs = [...cell.children].filter((el) => el.tagName === 'P');
  if (paragraphs.length === 1 && cell.children.length === 1) {
    target.append(...paragraphs[0].childNodes);
  } else {
    target.append(...cell.childNodes);
  }
}

export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.textContent.trim());
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const cols = Math.max(...rows.map((row) => row.children.length), 0);

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const cells = [...row.children];
    for (let c = 0; c < cols; c += 1) {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) td.scope = 'col';
      if (cells[c]) cellContent(cells[c], td);
      tr.append(td);
    }
    (i === 0 ? thead : tbody).append(tr);
  });

  if (thead.children.length) table.append(thead);
  table.append(tbody);
  const scroller = document.createElement('div');
  scroller.className = 'blog-table-scroll';
  scroller.tabIndex = 0;
  scroller.setAttribute('role', 'region');
  scroller.setAttribute('aria-label', 'Table');
  scroller.append(table);
  block.replaceChildren(scroller);
}
