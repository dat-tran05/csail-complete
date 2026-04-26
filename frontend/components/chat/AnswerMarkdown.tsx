"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AnswerMarkdown({ text, streaming }: { text: string; streaming?: boolean }) {
  if (!text) return null;
  return (
    <div
      className={[
        "font-body text-[14px] text-[var(--bone)] leading-[1.55] prose prose-invert max-w-none",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_li]:marker:text-[var(--graphite-2)]",
        "[&_h1]:font-display [&_h1]:text-[20px] [&_h1]:mt-3 [&_h1]:mb-1",
        "[&_h2]:font-display [&_h2]:text-[17px] [&_h2]:mt-3 [&_h2]:mb-1",
        "[&_h3]:font-display [&_h3]:text-[15px] [&_h3]:mt-2 [&_h3]:mb-0.5",
        "[&_a]:text-[var(--gold)] [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-[var(--bone)]",
        "[&_code]:font-mono [&_code]:text-[12px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-[rgba(0,0,0,0.35)]",
        "[&_strong]:text-[var(--bone)] [&_strong]:font-semibold",
        "[&_em]:italic [&_em]:text-[var(--bone-soft)]",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--gold)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--bone-soft)] [&_blockquote]:italic",
        streaming ? "after:content-['▌'] after:ml-0.5 after:text-[var(--gold)] after:animate-pulseSoft" : "",
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
