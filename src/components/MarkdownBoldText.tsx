import React from 'react';

/** Renders `**like this**` as <strong>; supports CJK and punctuation inside runs. Unclosed ** stays literal. */
function parseBoldSegments(text: string): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    let rest = text;
    let key = 0;
    while (rest.length > 0) {
        const open = rest.indexOf('**');
        if (open < 0) {
            out.push(rest);
            break;
        }
        if (open > 0) out.push(rest.slice(0, open));
        rest = rest.slice(open + 2);
        const close = rest.indexOf('**');
        if (close < 0) {
            out.push(`**${rest}`);
            break;
        }
        out.push(
            <strong key={`md-bold-${key++}`} className="markdown-inline-strong">
                {rest.slice(0, close)}
            </strong>
        );
        rest = rest.slice(close + 2);
    }
    return out;
}

type MarkdownBoldTextProps = {
    text: string;
    /** Block wrapper for summaries etc.; omit to render inline fragments (e.g. inside an existing &lt;p&gt;). */
    as?: 'p' | 'span' | 'div';
    className?: string;
    style?: React.CSSProperties;
};

export function MarkdownBoldText({ text, as, className, style }: MarkdownBoldTextProps) {
    const nodes = parseBoldSegments(text ?? '');
    const merged: React.CSSProperties = {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...style,
    };
    if (!as) {
        return <>{nodes}</>;
    }
    const Tag = as;
    return (
        <Tag className={className} style={merged}>
            {nodes}
        </Tag>
    );
}
