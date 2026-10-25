import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const backupRoot = path.join(root, "work", "github-pages-backup");

const removedPaths = [
  "src/middleware.ts",
  "src/app/(auth)",
  "src/app/api",
  "src/app/auth",
];

const replacementFiles = {
  "next-env.d.ts": `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file is temporarily generated without server route types for GitHub Pages.
`,
  "src/app/page.tsx": `import Link from "next/link";

export default function Home() {
  return <main className="page-grid flex min-h-dvh items-center justify-center bg-[#0c0c0c] p-6 text-white">
    <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl sm:p-12">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd600] text-2xl font-black text-black">F</span>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#ffd600]">Meu espaço</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Sua vida em um só lugar.</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/55">Explore a demonstração pública de hábitos, notas, metas, agenda, recompensas e finanças.</p>
      <Link href="/dashboard" className="mt-8 inline-flex rounded-xl bg-[#ffd600] px-6 py-3 text-sm font-black text-black">Abrir demonstração →</Link>
      <p className="mt-5 text-xs text-white/30">Os dados criados ficam somente neste navegador.</p>
    </section>
  </main>;
}
`,
  "src/app/(app)/layout.tsx": `import { AppShell } from "@/components/app/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell userName="Visitante">{children}</AppShell>;
}
`,
  "src/app/(app)/conta/page.tsx": `import { DemoAccountView } from "@/components/conta/demo-account-view";

export const metadata = { title: "Minha conta" };

export default function AccountPage() {
  return <DemoAccountView />;
}
`,
};

const originalFiles = new Map();

async function prepare() {
  await rm(backupRoot, { recursive: true, force: true });
  await mkdir(backupRoot, { recursive: true });

  for (const relativePath of removedPaths) {
    const source = path.join(root, relativePath);
    const destination = path.join(backupRoot, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(source, destination);
  }

  for (const [relativePath, replacement] of Object.entries(replacementFiles)) {
    const target = path.join(root, relativePath);
    originalFiles.set(target, await readFile(target, "utf8"));
    await writeFile(target, replacement);
  }
}

async function restore() {
  for (const [target, contents] of originalFiles) await writeFile(target, contents);

  for (const relativePath of [...removedPaths].reverse()) {
    const source = path.join(backupRoot, relativePath);
    const destination = path.join(root, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(source, destination);
  }

  await rm(backupRoot, { recursive: true, force: true });
}

try {
  await prepare();
  const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    cwd: root,
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
      NEXT_PUBLIC_GITHUB_PAGES: "true",
      NEXT_DIST_DIR: ".next-pages",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else {
    const docs = path.join(root, "docs");
    await rm(docs, { recursive: true, force: true });
    await cp(path.join(root, ".next-pages"), docs, { recursive: true });
    await writeFile(path.join(docs, ".nojekyll"), "");
    console.log("GitHub Pages gerado em docs/.");
  }
} finally {
  await restore();
}
