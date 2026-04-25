"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AnswerMarkdown({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="text-[11px] text-[#d0d8e4] font-mono leading-relaxed prose prose-invert prose-sm max-w-none
                    [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0
                    [&_a]:text-[#a8b8d0] [&_a]:underline
                    [&_code]:bg-[rgba(0,0,0,0.3)] [&_code]:px-1 [&_code]:rounded">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
