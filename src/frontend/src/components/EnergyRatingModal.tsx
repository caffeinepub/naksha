import { Star } from "lucide-react";
import { type FC, useState } from "react";

interface Props {
  topic: string;
  actualMs: number;
  totalMs: number;
  onSave: (rating: number, note: string) => void;
  onSkip: () => void;
}

const EnergyRatingModal: FC<Props> = ({
  topic,
  actualMs,
  totalMs,
  onSave,
  onSkip,
}) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [note, setNote] = useState("");

  const mins = Math.round(actualMs / 60000);
  const pct = Math.round((actualMs / totalMs) * 100);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,10,18,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #F0F4F8, #F8FBFF)",
          borderRadius: 24,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 360,
          boxShadow:
            "8px 8px 24px rgba(185,201,218,0.7), -8px -8px 24px rgba(255,255,255,0.95)",
        }}
      >
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 20,
            fontWeight: 700,
            color: "#111317",
            textAlign: "center",
          }}
        >
          Session Complete! 🎉
        </h2>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            color: "#5E6B78",
            textAlign: "center",
          }}
        >
          {topic} — {mins} min ({pct}%)
        </p>

        <p
          style={{
            margin: "0 0 12px",
            fontSize: 15,
            fontWeight: 600,
            color: "#111317",
            textAlign: "center",
          }}
        >
          How was your energy?
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Star
                size={32}
                fill={(hovered || rating) >= star ? "#35BDF3" : "none"}
                stroke={(hovered || rating) >= star ? "#35BDF3" : "#B9C9DA"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a session note (optional)..."
          style={{
            width: "100%",
            minHeight: 80,
            borderRadius: 12,
            border: "none",
            padding: "10px 14px",
            fontSize: 14,
            color: "#111317",
            background: "#E8EEF4",
            boxShadow:
              "inset 3px 3px 8px rgba(185,201,218,0.5), inset -3px -3px 8px rgba(255,255,255,0.8)",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: "#E8EEF4",
              color: "#5E6B78",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                "3px 3px 8px rgba(185,201,218,0.6), -3px -3px 8px rgba(255,255,255,0.9)",
            }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onSave(rating || 3, note)}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #35BDF3, #1AABEF)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "3px 3px 12px rgba(53,189,243,0.45)",
            }}
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnergyRatingModal;
