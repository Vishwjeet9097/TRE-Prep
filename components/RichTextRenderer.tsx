import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, Terminal } from 'lucide-react';

interface RichTextRendererProps {
    content: string;
    className?: string;
}

// Helper to safely extract text from React children
const extractText = (children: any): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(extractText).join('');
    if (children?.props?.children) return extractText(children.props.children);
    return '';
};

// Helper to auto-detect and wrap code in markdown if missing
const preProcessContent = (text: string) => {
    if (!text) return '';

    // If text already has code blocks, assume it's fine
    if (text.includes('```')) return text;

    // Detect C++ / Java / generic code patterns
    const codePatterns = [
        /(#include\s*<[\w\.]+>)/,
        /(using\s+namespace\s+\w+;)/,
        /(\bclass\s+\w+)/,          // generic class
        /(\bstruct\s+\w+)/,         // struct
        /(\btemplate\s*<)/,         // templates
        /(\bvoid\s+\w+\s*\()/,      // void function
        /(\bint\s+\w+\s*\()/,       // int function (main or others)
        /(public\s+class\s+\w+)/,
        /(def\s+\w+\s*\(.*\):)/,
        /(function\s+\w+\s*\(.*\))/
    ];

    let processed = text;
    const hasCodeKeyword = codePatterns.some(p => p.test(text));
    const hasBraces = text.includes('{') && text.includes('}');

    // 1. Try to detect Code
    if (hasCodeKeyword && hasBraces) {
        processed = processed.replace(
            /((?:#include|import|\bclass|\bstruct|\btemplate|\bvoid|\bint|function)\s*[\s\S]*})/g,
            '\n```cpp\n$1\n```\n'
        );
    }

    // 2. Try to detect Math (if not code)
    if (!processed.includes('```')) {
        // Only process math if we aren't in a code block

        // A helper to convert plain math text to LaTeX
        const toLatex = (str: string) => {
            let tex = str;
            // Convert fractions: 1/2 -> \frac{1}{2}
            // We need to be careful with things like (1+1/2). 
            // Regex: (\d+)\/(\d+) -> \frac{$1}{$2}
            tex = tex.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');

            // Convert ellipses ... -> \dots
            tex = tex.replace(/\.\.\./g, '\\dots');

            // Convert * to \times
            tex = tex.replace(/\*/g, '\\times ');

            return tex;
        };

        // Detect chained parentheses with math ops inside: (1+1/2)(1+1/3)...
        // Also simple improper series like 1+2+...+n

        // Strategy: Look for specific sequences that denote the user's "bad" format
        // Case A: (1+1/2)(1+1/3)... 
        // Case B: 1/2 + 1/3 + ...

        // We'll use a more aggressive replacer for things that look like math series.
        // Regex for a math sequence involving numbers, fractions, parens, arithmetic ops
        // Must contain at least one fraction or operator to justify latexing.
        const mathSequenceRegex = /((?:\(\s*\d+\s*[+\-*/]\s*(?:\d+\/\d+|\d+)\s*\))+(?:\s*\.{3}\s*(?:\(\s*\d+\s*[+\-*/]\s*(?:\d+\/\d+|\d+)\s*\))?)?)/g;

        processed = processed.replace(mathSequenceRegex, (match) => {
            // Check if it's just plain text in parens? regex attempts to enforce ops.
            return ` $${toLatex(match)}$ `;
        });

        // Also catch simple separated fractions like "The value of 1/2 + 1/4 is..."
        // But be careful of dates (1/2/2024). 
        // Safer to just target the specific parenthesized product pattern requested by user first, 
        // plus explicit big equations if they have = sign and vars.

        // Let's also catch: 1/2 + 1/3 + ... + 1/120
        const seriesRegex = /(\d+\/\d+\s*[+\-]\s*)+\.{3}\s*[+\-]\s*\d+\/\d+/g;
        processed = processed.replace(seriesRegex, (match) => {
            return ` $${toLatex(match)}$ `;
        });
    }

    return processed;
};

// Basic code beautifier for C-like languages
const formatCode = (code: string, lang: string) => {
    // Only format if it looks "minified" (few lines but long text)
    if (code.split('\n').length > 5) return code;

    // Simple naive formatter for display purposes
    let formatted = code
        .replace(/;\s*/g, ';\n')       // Newline after semicolons
        .replace(/{\s*/g, '{\n')       // Newline after opening brace
        .replace(/}\s*/g, '\n}\n')     // Newline around closing brace
        .replace(/(#include.*?>)\s*/g, '$1\n') // Newline after imports
        .replace(/\)\s*{/g, ') {')     // Fix spacing
        .replace(/(\n)\s*/g, '$1');    // Remove double spaces after newline

    // Simple indentation (very naive)
    const lines = formatted.split('\n');
    let depth = 0;
    const indented = lines.map(line => {
        line = line.trim();
        if (line.includes('}')) depth = Math.max(0, depth - 1);
        const indent = '  '.repeat(depth);
        if (line.includes('{')) depth++;
        return indent + line;
    }).join('\n');

    return indented.trim();
};

const CodeBlock = ({ children, className, ...props }: any) => {
    const [copied, setCopied] = React.useState(false);

    // Extract text properly instead of naive String() conversion
    const rawCode = extractText(children);
    const codeContent = React.useMemo(() => rawCode.replace(/\n$/, ''), [rawCode]);

    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : 'text';

    // Auto-format for display if needed
    const formattedCode = React.useMemo(() => formatCode(codeContent, lang), [codeContent, lang]);

    const handleCopy = () => {
        navigator.clipboard.writeText(formattedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative my-6 rounded-xl overflow-hidden bg-[#1E1E1E] border border-slate-800 shadow-xl group font-sans text-left">
            {/* Window Chrome */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#2D2D2D] border-b border-slate-700 select-none">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                        <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                    </div>
                    <div className="ml-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <Terminal size={12} />
                        <span className="uppercase tracking-wider opacity-75">{lang}</span>
                    </div>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
                >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span className={copied ? "text-emerald-400" : ""}>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>
            {/* Code */}
            <div className="p-0 overflow-x-auto bg-[#1E1E1E]">
                {/*
                   CRITICAL FIX:
                   1. `display: block` ensures it takes width.
                   2. `whitespace-pre` preserves newlines and spacing (no wrap).
                   3. `p-4` padding included here.
                */}
                <code className={`${className} block p-4 text-sm font-mono text-slate-200 whitespace-pre leading-relaxed`} {...props}>
                    {formattedCode}
                </code>
            </div>
        </div>
    );
};

const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
    const processedContent = React.useMemo(() => preProcessContent(content), [content]);

    return (
        <div className={`rich-text-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={{
                    // Use custom CodeBlock component
                    code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !String(children).includes('\n');

                        if (isInline) {
                            return (
                                <code {...props} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded-md font-mono text-[0.9em] font-medium border border-slate-200/50">
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <CodeBlock className={className} {...props}>
                                {children}
                            </CodeBlock>
                        );
                    },
                    pre: ({ children }) => <>{children}</>, // Let code component handle the wrapper
                    p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0 leading-relaxed text-slate-800" />,
                    ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 mb-4 space-y-1 text-slate-800" />,
                    ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 mb-4 space-y-1 text-slate-800" />,
                    li: ({ node, ...props }) => <li {...props} className="pl-1" />,
                    blockquote: ({ node, ...props }) => (
                        <div className="border-l-4 border-indigo-200 pl-4 py-1 my-4 bg-indigo-50/30 rounded-r-lg italic text-slate-600">
                            {props.children}
                        </div>
                    ),
                    a: ({ node, ...props }) => <a {...props} className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium" target="_blank" rel="noopener noreferrer" />,
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default RichTextRenderer;
