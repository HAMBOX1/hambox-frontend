function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(value: string): string {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  return html;
}

/**
 * Minimal markdown-to-HTML for assistant messages: headers, bold, inline code,
 * links, ordered/unordered lists, and pipe tables. Output is bound via Angular's
 * [innerHTML], which sanitizes it — never bypassSecurityTrustHtml this result.
 */
export function renderMarkdown(source: string): string {
  const lines = source.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      html += `<h4>${renderInline(line.replace(/^#{1,3}\s/, ''))}</h4>`;
      i++;
      continue;
    }

    if (/^\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      const cells = rows.map((row) =>
        row
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim()),
      );
      const body = cells.filter((row) => !row.every((cell) => /^-+$/.test(cell)));
      const head = body[0] ?? [];
      const rest = body.slice(1);
      html +=
        '<div class="table-scroll"><table><thead><tr>' +
        head.map((cell) => `<th>${renderInline(cell)}</th>`).join('') +
        '</tr></thead><tbody>' +
        rest
          .map(
            (row) =>
              '<tr>' + row.map((cell) => `<td>${renderInline(cell)}</td>`).join('') + '</tr>',
          )
          .join('') +
        '</tbody></table></div>';
      continue;
    }

    if (/^(\d+\.|-)\s/.test(line)) {
      const ordered = /^\d+\.\s/.test(line);
      const tag = ordered ? 'ol' : 'ul';
      let items = '';
      while (i < lines.length && /^(\d+\.|-)\s/.test(lines[i])) {
        items += `<li>${renderInline(lines[i].replace(/^(\d+\.|-)\s/, ''))}</li>`;
        i++;
      }
      html += `<${tag}>${items}</${tag}>`;
      continue;
    }

    html += `<p>${renderInline(line)}</p>`;
    i++;
  }

  return html;
}
