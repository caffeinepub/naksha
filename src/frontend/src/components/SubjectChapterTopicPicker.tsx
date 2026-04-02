import { ArrowLeft, BookOpen } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import type { Chapter, Subject, Topic } from "../types";
import { getChapters, getSubjects, getTopics } from "../utils/storage";

export interface TrioSelection {
  subject: Subject | null;
  chapter: Chapter | null;
  topic: Topic | null;
  label: string; // final label to use
}

interface Props {
  onSelect: (sel: TrioSelection) => void;
  onClose: () => void;
  initialLabel?: string;
}

const SubjectChapterTopicPicker: FC<Props> = ({
  onSelect,
  onClose,
  initialLabel = "",
}) => {
  const { palette } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [step, setStep] = useState<
    "subject" | "chapter" | "topic" | "freeform"
  >("subject");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [freeformText, setFreeformText] = useState(initialLabel);

  useEffect(() => {
    setSubjects(getSubjects());
    setChapters(getChapters());
    setTopics(getTopics());
  }, []);

  const filteredChapters = chapters.filter(
    (c) => c.subjectId === selectedSubject?.id,
  );
  const filteredTopics = topics.filter(
    (t) => t.chapterId === selectedChapter?.id,
  );

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    padding: 20,
    border: "none",
    margin: 0,
    width: "100%",
    maxWidth: "none",
    maxHeight: "none",
  };

  const glassPanel: React.CSSProperties = {
    background: "rgba(15,15,25,0.97)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${palette.accent}30`,
    borderRadius: 20,
    padding: "16px 14px",
    width: "100%",
    maxWidth: 320,
    boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px ${palette.accent}15`,
  };

  const itemStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: "11px 14px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: palette.text,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "background 0.15s",
    fontFamily: "inherit",
  };

  const getStepTitle = () => {
    if (step === "subject") return "Select Subject";
    if (step === "chapter") return `${selectedSubject?.name} › Chapter`;
    if (step === "topic") return `${selectedChapter?.name} › Topic`;
    return "Custom Label";
  };

  const handleBack = () => {
    if (step === "chapter") setStep("subject");
    else if (step === "topic") setStep("chapter");
    else if (step === "freeform") setStep("subject");
  };

  // Use dialog element as full-screen overlay — clicking backdrop (dialog itself) closes
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Close when clicking outside the panel
    if (e.target === e.currentTarget) onClose();
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <dialog
      open
      style={overlayStyle}
      onClick={handleDialogClick}
      onKeyDown={handleDialogKeyDown}
    >
      <div style={glassPanel}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {step !== "subject" && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: palette.accent,
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: palette.text,
              opacity: 0.85,
              flex: 1,
            }}
          >
            {getStepTitle()}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: palette.textMuted,
              fontSize: 20,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {step === "subject" && (
            <>
              <button
                type="button"
                onClick={() => setStep("freeform")}
                style={{
                  ...itemStyle,
                  color: palette.accent,
                  borderBottom: `1px solid ${palette.accent}20`,
                  marginBottom: 6,
                  paddingBottom: 14,
                }}
              >
                <BookOpen size={14} />
                Freeform text
              </button>
              {subjects.length === 0 && (
                <p
                  style={{
                    color: palette.textMuted,
                    fontSize: 13,
                    textAlign: "center",
                    padding: 12,
                    margin: 0,
                  }}
                >
                  No subjects yet. Add some in Topics tab.
                </p>
              )}
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(s);
                    const subChapters = chapters.filter(
                      (c) => c.subjectId === s.id,
                    );
                    if (subChapters.length > 0) {
                      setStep("chapter");
                    } else {
                      onSelect({
                        subject: s,
                        chapter: null,
                        topic: null,
                        label: s.name,
                      });
                    }
                  }}
                  style={itemStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      `${palette.accent}18`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: s.colorAccent,
                      flexShrink: 0,
                      boxShadow: `0 0 5px ${s.colorAccent}`,
                    }}
                  />
                  {s.name}
                </button>
              ))}
            </>
          )}

          {step === "chapter" &&
            (filteredChapters.length === 0 ? (
              <div
                style={{
                  color: palette.textMuted,
                  fontSize: 13,
                  textAlign: "center",
                  padding: 12,
                }}
              >
                No chapters.
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      subject: selectedSubject,
                      chapter: null,
                      topic: null,
                      label: selectedSubject?.name || "",
                    })
                  }
                  style={{
                    color: palette.accent,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "block",
                    margin: "8px auto 0",
                    fontFamily: "inherit",
                    fontSize: 13,
                  }}
                >
                  Use subject only
                </button>
              </div>
            ) : (
              filteredChapters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedChapter(c);
                    const chTopics = topics.filter((t) => t.chapterId === c.id);
                    if (chTopics.length > 0) {
                      setStep("topic");
                    } else {
                      onSelect({
                        subject: selectedSubject,
                        chapter: c,
                        topic: null,
                        label: c.name,
                      });
                    }
                  }}
                  style={itemStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      `${palette.accent}18`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  {c.name}
                </button>
              ))
            ))}

          {step === "topic" &&
            (filteredTopics.length === 0 ? (
              <div
                style={{
                  color: palette.textMuted,
                  fontSize: 13,
                  textAlign: "center",
                  padding: 12,
                }}
              >
                No topics.
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      subject: selectedSubject,
                      chapter: selectedChapter,
                      topic: null,
                      label:
                        selectedChapter?.name || selectedSubject?.name || "",
                    })
                  }
                  style={{
                    color: palette.accent,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "block",
                    margin: "8px auto 0",
                    fontFamily: "inherit",
                    fontSize: 13,
                  }}
                >
                  Use chapter only
                </button>
              </div>
            ) : (
              filteredTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    onSelect({
                      subject: selectedSubject,
                      chapter: selectedChapter,
                      topic: t,
                      label: t.name,
                    })
                  }
                  style={itemStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      `${palette.accent}18`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  {t.name}
                </button>
              ))
            ))}

          {step === "freeform" && (
            <div style={{ padding: "4px 0" }}>
              <input
                type="text"
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && freeformText.trim())
                    onSelect({
                      subject: null,
                      chapter: null,
                      topic: null,
                      label: freeformText.trim(),
                    });
                }}
                placeholder="Type a label..."
                // biome-ignore lint/a11y/noAutofocus: intentional UX
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${palette.accent}40`,
                  background: "rgba(255,255,255,0.07)",
                  color: palette.text,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 10,
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (freeformText.trim())
                    onSelect({
                      subject: null,
                      chapter: null,
                      topic: null,
                      label: freeformText.trim(),
                    });
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 10,
                  border: `1px solid ${palette.accent}50`,
                  background: `${palette.accent}20`,
                  color: palette.accent,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Use this label
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};

export default SubjectChapterTopicPicker;
