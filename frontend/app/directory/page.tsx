import { TopBar } from "@/components/chrome/TopBar";
import { ThemeScope } from "@/components/chrome/ThemeScope";
import { DirectoryShell } from "@/components/directory/DirectoryShell";

export default function DirectoryPage() {
  return (
    <main
      className="absolute inset-0 w-full bg-[var(--bg)] text-[var(--fg)] overflow-y-auto overflow-x-hidden"
      style={{ minHeight: "100vh" }}
    >
      <ThemeScope theme="paper" />
      <TopBar />
      <DirectoryShell />
    </main>
  );
}
