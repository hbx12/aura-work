import type { ReactNode } from "react";

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let i = 0;

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
        re: /^\*([^*\n]+)\*/,
        render: (m, k) => <em key={k}>{m[1]}</em>,
      },
      {
        re: /^_([^_\n]+)_/,
        render: (m, k) => <em key={k}>{m[1]}</em>,
      },
      {
        re: /^\[([^\]]+)\]\(([^)]+)\)/,
        render: (m, k) => (
          <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>
        ),
      },
    ];

    let matched = false;
    for (const { re, render } of patterns) {
      const m = rest.match(re);
      if (m) {
        nodes.push(render(m, `${keyPrefix}-${i++}`));
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const nextSpecial = rest.search(/[`*\[_]/);
    const chunk = nextSpecial === -1 ? rest : rest.slice(0, nextSpecial);
    if (chunk) {
      nodes.push(chunk);
      rest = rest.slice(chunk.length);
    } else {
      nodes.push(rest[0]);
      rest = rest.slice(1);
    }
  }

  return nodes;
}

function isBulletList(lines: string[]): boolean {
  return lines.length > 0 && lines.every((l) => /^[-*+]\s+/.test(l.trim()));
}

function isOrderedList(lines: string[]): boolean {
  return lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l.trim()));
}

function renderBlock(block: string, index: number): ReactNode {
  const trimmed = block.trim();
  if (!trimmed) return null;

  const codeMatch = trimmed.match(/^```(?:[\w-]*)?\n?([\s\S]*?)```$/);
  if (codeMatch) {
    return (
      <pre key={index} className="codeblock">
        <code>{codeMatch[1].replace(/\n$/, "")}</code>
      </pre>
    );
  }

  const lines = trimmed.split("\n");

  const headingMatch = lines[0].match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch && lines.length === 1) {
    const level = headingMatch[1].length;
    const Tag = (`h${level}` as "h1" | "h2" | "h3");
    return <Tag key={index}>{parseInline(headingMatch[2], `h-${index}`)}</Tag>;
  }

  if (isBulletList(lines)) {
    return (
      <ul key={index}>
        {lines.map((line, li) => (
          <li key={li}>{parseInline(line.replace(/^[-*+]\s+/, ""), `ul-${index}-${li}`)}</li>
        ))}
      </ul>
    );
  }

  if (isOrderedList(lines)) {
    return (
      <ol key={index}>
        {lines.map((line, li) => (
          <li key={li}>{parseInline(line.replace(/^\d+\.\s+/, ""), `ol-${index}-${li}`)}</li>
        ))}
      </ol>
    );
  }

  return (
    <p key={index}>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {parseInline(line, `p-${index}-${li}`)}
        </span>
      ))}
    </p>
  );
}

export function MarkdownText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return <>{blocks.map((block, i) => renderBlock(block, i))}</>;
}
