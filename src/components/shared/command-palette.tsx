"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight, Download, Mail, ScanLine, FolderGit2,
} from "lucide-react";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { profile, projects, sections } from "@/lib/content";
import { GithubIcon, LinkedinIcon } from "./brand-icons";
import { scrollToId } from "@/components/providers/smooth-scroll";
import { toggleDetectMode } from "./easter-egg";

const OPEN_EVENT = "md:open-command";
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_EVENT, onOpen); };
  }, []);

  const run = (fn: () => void) => { setOpen(false); setTimeout(fn, 60); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Jump to a section, open a link or download the resume" className="sm:max-w-lg">
      {/* cmdk needs a <Command> root; this shadcn CommandDialog does not add one */}
      <Command>
      <CommandInput placeholder="Where to?" />
      <CommandList data-lenis-prevent>
        <CommandEmpty>No match. Try “projects” or “resume”.</CommandEmpty>
        <CommandGroup heading="Sections">
          {sections.map((s) => (
            <CommandItem key={s.id} value={`section ${s.label}`} onSelect={() => run(() => scrollToId(s.id))}>
              <ArrowRight /> {s.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Projects">
          {projects.map((p) => (
            <CommandItem key={p.id} value={`project ${p.title} ${p.kicker}`} onSelect={() => run(() => scrollToId(p.featured ? "featured" : "work"))}>
              <FolderGit2 /> {p.title}
              <CommandShortcut>{p.kicker}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Links">
          <CommandItem value="resume download cv" onSelect={() => run(() => {
            const a = document.createElement("a"); a.href = profile.resume; a.download = ""; a.click();
          })}>
            <Download /> Download resume
          </CommandItem>
          <CommandItem value="email copy contact" onSelect={() => {
            navigator.clipboard?.writeText(profile.email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, () => {});
          }}>
            <Mail /> {copied ? "Email copied" : "Copy email address"}
            <CommandShortcut>{profile.email}</CommandShortcut>
          </CommandItem>
          <CommandItem value="github code" onSelect={() => run(() => window.open(profile.github, "_blank", "noopener"))}>
            <GithubIcon /> GitHub
          </CommandItem>
          <CommandItem value="linkedin" onSelect={() => run(() => window.open(profile.linkedin, "_blank", "noopener"))}>
            <LinkedinIcon /> LinkedIn
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Lab">
          <CommandItem value="yolo detection mode easter egg" onSelect={() => run(toggleDetectMode)}>
            <ScanLine /> Toggle detection mode
            <CommandShortcut>type “yolo”</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
