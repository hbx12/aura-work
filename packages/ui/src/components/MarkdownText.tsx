import type { ElementType, ReactNode } from "react";

type Block =
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; lang: string; content: string }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "hr" }
  | { type: "list"; ordered: boolean; items: { text: string; checked?: boolean }[] }
  | { type: "paragraph"; lines: string[] }
  | { type: "table"; rows: string[][] };

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let i = 0;

  const pushText = (value: string) => {
    if (value) nodes.push(value);
  };

  while (rest.length > 0) {
    const patterns: { re: RegExp; render: (m: RegExpMatchArray, k: string) => ReactNode }[] = [
      {
        re: /^`([^`\n]+)`/,
        render: (m, k) => (
          <code key={k} className="code-inline">
            {m[1]}
          </code>
        ),
      },
      {
        re: /^\*\*\*([^*\n]+)\*\*\*/,
        render: (m, k) => (
          <strong key={k}>
            <em>{m[1]}</em>
          </strong>
        ),
      },
      {
        re: /^\*\*([^*\n]+)\*\*/,
        render: (m, k) => <strong key={k}>{m[1]}</strong>,
      },
      {
        re: /^__([^_\n]+)__/,
        render: (m, k) => <strong key={k}>{m[1]}</strong>,
      },
      {
        re: /^\*([^*\n]+)\*/,
        render: (m, k) => <em key={k}>{m[1]}</em>,
      },
      {
        re: /^_([^_\n]+)_/,
        render: (m, k) => <em key={k}>{m[1]}</em>,
      },
      {
        re: /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/,
        render: (m, k) => (
          <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>
        ),
      },
    ];

    let matched = false;
    for (const { re, render } of patterns) {
      const match = rest.match(re);
      if (match) {
        nodes.push(render(match, `${keyPrefix}-${i++}`));
        rest = rest.slice(match[0].length);
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const nextSpecial = rest.search(/[`*_[\]]/);
    if (nextSpecial > 0) {
      pushText(rest.slice(0, nextSpecial));
      rest = rest.slice(nextSpecial);
    } else {
      pushText(rest[0]);
      rest = rest.slice(1);
    }
  }

  return nodes;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function flushParagraph(lines: string[], blocks: Block[]) {
  if (lines.length) {
    blocks.push({ type: "paragraph", lines: [...lines] });
    lines.length = 0;
  }
}

function flushList(
  items: { text: string; checked?: boolean }[],
  ordered: boolean,
  blocks: Block[],
) {
  if (items.length) {
    blocks.push({ type: "list", ordered, items: [...items] });
    items.length = 0;
  }
}

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const paragraph: string[] = [];
  const listItems: { text: string; checked?: boolean }[] = [];
  let listOrdered = false;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    const fence = line.match(/^```([A-Za-z0-9_+.-]*)\s*$/);
    if (fence) {
      flushParagraph(paragraph, blocks);
      flushList(listItems, listOrdered, blocks);
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trimEnd())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", lang: fence[1] ?? "", content: codeLines.join("\n") });
      continue;
    }

    if (!trimmed) {
      flushParagraph(paragraph, blocks);
      flushList(listItems, listOrdered, blocks);
      i += 1;
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      flushParagraph(paragraph, blocks);
      flushList(listItems, listOrdered, blocks);
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, blocks);
      flushList(listItems, listOrdered, blocks);
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph(paragraph, blocks);
      flushList(listItems, listOrdered, blocks);
      const rows = [splitTableRow(line)];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(paragraph, blocks);
      flushList(listItems, listOrdered, blocks);
      const quoteLines = [quote[1]];
      i += 1;
      while (i < lines.length) {
        const next = lines[i].match(/^>\s?(.*)$/);
        if (!next) break;
        quoteLines.push(next[1]);
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(\[[ xX]\]\s+)?(.+)$/);
    const number = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || number) {
      flushParagraph(paragraph, blocks);
      const nextOrdered = Boolean(number);
      if (listItems.length && listOrdered !== nextOrdered) flushList(listItems, listOrdered, blocks);
      listOrdered = nextOrdered;
      const checkbox = bullet?.[1];
      listItems.push({
        text: number?.[1] ?? bullet?.[2] ?? "",
        checked: checkbox ? /x/i.test(checkbox) : undefined,
      });
      i += 1;
      continue;
    }

    flushList(listItems, listOrdered, blocks);
    paragraph.push(line);
    i += 1;
  }

  flushParagraph(paragraph, blocks);
  flushList(listItems, listOrdered, blocks);
  return blocks;
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.type) {
    case "blockquote":
      return (
        <blockquote key={index} className="md-quote">
          {block.lines.map((line, lineIndex) => (
            <p key={lineIndex}>{parseInline(line, `quote-${index}-${lineIndex}`)}</p>
          ))}
        </blockquote>
      );
    case "code":
      return (
        <pre key={index} className="codeblock md-code-block">
          {block.lang && <span className="md-code-lang">{block.lang}</span>}
          <code>{block.content}</code>
        </pre>
      );
    case "heading": {
      const Tag = `h${block.level}` as ElementType;
      return <Tag key={index}>{parseInline(block.text, `h-${index}`)}</Tag>;
    }
    case "hr":
      return <hr key={index} className="md-hr" />;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List key={index} className={block.items.some((item) => item.checked !== undefined) ? "md-task-list" : undefined}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {item.checked !== undefined && (
                <input type="checkbox" checked={item.checked} readOnly aria-label="" />
              )}
              {parseInline(item.text, `li-${index}-${itemIndex}`)}
            </li>
          ))}
        </List>
      );
    }
    case "table": {
      const [head, ...body] = block.rows;
      return (
        <div key={index} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {head.map((cell, cellIndex) => (
                  <th key={cellIndex}>{parseInline(cell, `th-${index}-${cellIndex}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{parseInline(cell, `td-${index}-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "paragraph":
      return (
        <p key={index}>
          {block.lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {lineIndex > 0 && <br />}
              {parseInline(line, `p-${index}-${lineIndex}`)}
            </span>
          ))}
        </p>
      );
  }
}

export function MarkdownText({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;
  return <>{blocks.map((block, i) => renderBlock(block, i))}</>;
}
